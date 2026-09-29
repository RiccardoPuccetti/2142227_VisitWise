package it.teamlab.visitwise.planning.engine;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/** Seed-and-fill followed by at most 20 improving replacements per visitor. No shared mutable state. */
public final class GreedyVisitPlanner implements VisitPlanner {
    private static final Comparator<VisitTarget> BY_VALUE = Comparator.comparingDouble(VisitTarget::value)
            .reversed().thenComparingLong(VisitTarget::id);
    private static final int MAX_SWAPS = 20;

    @Override
    public PlannerResult plan(List<PlannerPoint> points, PlannerParameters p) {
        if (points == null || p == null || points.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Points and parameters are required");
        }
        var ids = new HashSet<Long>();
        for (var point : points) {
            if (!ids.add(point.id())) throw new IllegalArgumentException("Duplicate point id: " + point.id());
        }
        var ordered = points.stream().sorted(Comparator.comparingLong(PlannerPoint::id)).toList();
        Map<AddressKey, List<PlannerPoint>> addresses = new java.util.LinkedHashMap<>();
        int notGeocoded = 0;
        for (var point : ordered) {
            if (!p.agents().isEmpty() && !p.agents().contains(point.agent())) continue;
            if (point.location() == null) {
                notGeocoded++;
                continue;
            }
            var key = new AddressKey(normalize(point.address()), normalize(point.city()), point.agent());
            addresses.computeIfAbsent(key, ignored -> new ArrayList<>()).add(point);
        }
        var eligible = new ArrayList<VisitTarget>();
        int outOfRange = 0;
        var weights = new TreeMap<>(p.enterpriseWeights());
        for (var group : addresses.values()) {
            double value = 0;
            double revenue = 0;
            for (var point : group) {
                for (var weight : weights.entrySet()) {
                    if (weight.getValue() == 0) continue;
                    double amount = Math.max(0, point.revenues().getOrDefault(weight.getKey(), 0.0));
                    revenue += amount;
                    value += amount * weight.getValue();
                }
            }
            requireFinite(value);
            requireFinite(revenue);
            if (value <= p.minRevenue()) continue;
            var first = group.getFirst();
            if (!p.constraints().isWithinRange(p.base(), first.location(), p.roads())) {
                outOfRange++;
                continue;
            }
            eligible.add(new VisitTarget(first.id(), first.agent(), first.location(), group, value, revenue));
        }
        eligible.sort(BY_VALUE);
        var routing = new Routing(p, eligible);
        Map<String, List<VisitTarget>> visitors = new TreeMap<>();
        for (var target : eligible) {
            String visitor = p.planningMode() == PlanningMode.PER_AGENT ? target.agent() : "";
            visitors.computeIfAbsent(visitor, ignored -> new ArrayList<>()).add(target);
        }
        var dates = new WorkingCalendar().workingDates(p.startDate(), p.workingDays());
        var days = new ArrayList<PlannedDay>();
        var remaining = new ArrayList<VisitTarget>();
        double upperBound = 0;
        long slots = (long) p.workingDays() * (p.constraints().workdayMinutes() / p.constraints().visitDurationMinutes());
        for (var visitor : visitors.entrySet()) {
            upperBound += visitor.getValue().stream().mapToDouble(VisitTarget::revenue).boxed()
                    .sorted(Comparator.reverseOrder()).limit(slots).mapToDouble(Double::doubleValue).sum();
            var unassigned = new ArrayList<>(visitor.getValue());
            var routes = new ArrayList<Route>();
            for (int day = 0; day < p.workingDays(); day++) {
                Route route = null;
                for (var seed : unassigned) {
                    var candidate = routing.route(List.of(seed));
                    if (routing.fits(candidate)) { route = candidate; break; }
                }
                if (route == null) break;
                unassigned.remove(route.targets().getFirst());
                while ((long) (route.targets().size() + 1) * p.constraints().visitDurationMinutes()
                        <= p.constraints().workdayMinutes()) {
                    Route best = null;
                    VisitTarget added = null;
                    double bestGain = 0;
                    for (var target : unassigned) {
                        // Insertion cannot shorten a metric route (road figures are shortest paths, so nearly
                        // metric); remaining targets have no higher value.
                        if (target.value() < bestGain - 1e-9) break;
                        var candidate = routing.insert(route, target);
                        double gain = target.value() - p.travelCostPerKm() * (candidate.km() - route.km());
                        if (routing.fits(candidate) && (gain > bestGain
                                || (gain == bestGain && gain > 0 && target.id() < added.id()))) {
                            best = candidate;
                            added = target;
                            bestGain = gain;
                        }
                    }
                    if (best == null) break;
                    route = best;
                    unassigned.remove(added);
                }
                routes.add(route);
            }
            improve(routes, unassigned, routing, p.travelCostPerKm());
            routes.sort((a, b) -> {
                int valueOrder = Double.compare(b.value(), a.value());
                return valueOrder != 0 ? valueOrder : compareIds(a.targets(), b.targets());
            });
            for (int i = 0; i < routes.size(); i++) {
                var route = routes.get(i);
                days.add(new PlannedDay(dates.get(i), visitor.getKey(), route.targets(), route.km(),
                        route.minutes()));
            }
            remaining.addAll(unassigned);
        }
        days.sort(Comparator.comparing(PlannedDay::date).thenComparing(PlannedDay::agent));
        remaining.sort(BY_VALUE);
        var planned = days.stream().flatMap(day -> day.targets().stream()).toList();
        double covered = planned.stream().mapToDouble(VisitTarget::revenue).sum();
        double total = eligible.stream().mapToDouble(VisitTarget::revenue).sum();
        double km = days.stream().mapToDouble(PlannedDay::km).sum();
        double travelMinutes = days.stream().mapToDouble(PlannedDay::travelMinutes).sum();
        requireFinite(total);
        requireFinite(upperBound);
        requireFinite(km);
        int customers = (int) planned.stream().flatMap(target -> target.points().stream())
                .map(PlannerPoint::customerName).distinct().count();
        int late = days.stream().filter(day -> day.date().isAfter(p.deadline()))
                .mapToInt(day -> day.targets().size()).sum();
        var kpis = new PlannerResult.Kpis(planned.size(), customers, covered, total,
                total == 0 ? 0 : covered / total, upperBound, km, travelMinutes / 60,
                (int) days.stream().map(PlannedDay::date).distinct().count(),
                days.isEmpty() ? null : days.getLast().date(), late, outOfRange);
        return new PlannerResult(days, kpis, remaining.stream().limit(20).toList(), notGeocoded);
    }

    private static void improve(List<Route> routes, List<VisitTarget> unassigned, Routing routing, double penalty) {
        // First improvement in stable day / assigned-id / candidate-id order, bounded independently of input size.
        for (int iteration = 0; iteration < MAX_SWAPS; iteration++) {
            boolean improved = false;
            unassigned.sort(Comparator.comparingLong(VisitTarget::id));
            search:
            for (int day = 0; day < routes.size(); day++) {
                var route = routes.get(day);
                var assigned = route.targets().stream().sorted(Comparator.comparingLong(VisitTarget::id)).toList();
                for (var old : assigned) {
                    var rest = new ArrayList<>(route.targets());
                    rest.remove(old);
                    var remainder = routing.route(rest);
                    for (int j = 0; j < unassigned.size(); j++) {
                        var replacement = unassigned.get(j);
                        // Even a zero-distance route cannot improve this replacement.
                        if (replacement.value() - old.value() + penalty * route.km() <= 0) continue;
                        var candidate = routing.insert(remainder, replacement);
                        double gain = replacement.value() - old.value() - penalty * (candidate.km() - route.km());
                        if (gain > 0 && routing.fits(candidate)) {
                            routes.set(day, candidate);
                            unassigned.set(j, old);
                            improved = true;
                            break search;
                        }
                    }
                }
            }
            if (!improved) break;
        }
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKC).strip().replaceAll("\\s+", " ")
                .toUpperCase(Locale.ROOT);
    }

    private static void requireFinite(double value) {
        if (!Double.isFinite(value)) throw new IllegalArgumentException("Planner totals exceed the numeric range");
    }

    private static int compareIds(List<VisitTarget> a, List<VisitTarget> b) {
        for (int i = 0; i < Math.min(a.size(), b.size()); i++) {
            int compared = Long.compare(a.get(i).id(), b.get(i).id());
            if (compared != 0) return compared;
        }
        return Integer.compare(a.size(), b.size());
    }

    private record AddressKey(String address, String city, String agent) { }
    private record Route(List<VisitTarget> targets, double km, double minutes, double value) { }

    private static final class Routing {
        private final PlannerParameters p;
        private final Map<Long, Integer> indices = new HashMap<>();
        private final double[][] distances;
        private final double[][] minutes;

        Routing(PlannerParameters p, List<VisitTarget> targets) {
            this.p = p;
            // Limit memory for large imports; the usual 1,000-point case reuses exact distances and times.
            int size = targets.size() + 1;
            distances = targets.size() <= 2000 ? new double[size][size] : null;
            minutes = distances == null ? null : new double[size][size];
            if (distances == null) return;
            for (int i = 0; i < targets.size(); i++) indices.put(targets.get(i).id(), i + 1);
            // Road figures can differ by direction (one-way streets): fill both.
            for (int i = 0; i < size; i++) {
                var from = i == 0 ? p.base() : targets.get(i - 1).location();
                for (int j = 0; j < size; j++) {
                    if (i == j) continue;
                    var to = j == 0 ? p.base() : targets.get(j - 1).location();
                    distances[i][j] = p.roads().roadDistanceKm(from, to);
                    minutes[i][j] = p.roads().travelMinutes(from, to);
                }
            }
        }

        private double distance(VisitTarget a, VisitTarget b) {
            if (distances != null) return distances[index(a)][index(b)];
            return p.roads().roadDistanceKm(location(a), location(b));
        }

        private double minutes(VisitTarget a, VisitTarget b) {
            if (minutes != null) return minutes[index(a)][index(b)];
            return p.roads().travelMinutes(location(a), location(b));
        }

        private int index(VisitTarget target) {
            return target == null ? 0 : indices.get(target.id());
        }

        private GeoPoint location(VisitTarget target) {
            return target == null ? p.base() : target.location();
        }

        Route route(List<VisitTarget> targets) {
            double km = 0;
            double travelMinutes = 0;
            double value = 0;
            VisitTarget previous = null;
            for (var target : targets) {
                km += distance(previous, target);
                travelMinutes += minutes(previous, target);
                value += target.value();
                previous = target;
            }
            requireFinite(value);
            return new Route(List.copyOf(targets), km + distance(previous, null),
                    travelMinutes + minutes(previous, null), value);
        }

        boolean fits(Route route) {
            return p.constraints().fitsWorkday(route.minutes(), route.targets().size());
        }

        Route insert(Route route, VisitTarget target) {
            if (route.targets().size() < 3) {
                var all = new ArrayList<>(route.targets());
                all.add(target);
                return permutations(all, 0, null);
            }
            double bestExtra = Double.POSITIVE_INFINITY;
            int position = 0;
            // Equal-cost insertions prefer the lexicographically smaller sequence of target ids.
            for (int i = 0; i <= route.targets().size(); i++) {
                var before = i == 0 ? null : route.targets().get(i - 1);
                var after = i == route.targets().size() ? null : route.targets().get(i);
                double extra = distance(before, target) + distance(target, after) - distance(before, after);
                if (extra < bestExtra || (extra == bestExtra && route.targets().get(position).id() < target.id())) {
                    bestExtra = extra;
                    position = i;
                }
            }
            var inserted = new ArrayList<>(route.targets());
            inserted.add(position, target);
            return route(inserted);
        }

        private Route permutations(ArrayList<VisitTarget> targets, int index, Route best) {
            if (index == targets.size()) {
                var candidate = route(targets);
                if (best == null || candidate.km() < best.km()
                        || (candidate.km() == best.km() && compareIds(candidate.targets(), best.targets()) < 0)) {
                    return candidate;
                }
                return best;
            }
            for (int i = index; i < targets.size(); i++) {
                java.util.Collections.swap(targets, i, index);
                best = permutations(targets, index + 1, best);
                java.util.Collections.swap(targets, i, index);
            }
            return best;
        }
    }
}
