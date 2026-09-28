package it.teamlab.visitwise.imports;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Suggests the column mapping of an uploaded sheet (API_CONTRACT.md, parsing rules; US-04, US-05). Headers are compared
 * with IT/EN synonyms ignoring case, accents and punctuation; the analyst confirms or changes the result in the wizard.
 * Numeric columns left over, except totals, are suggested as enterprises.
 */
@Component
class MappingSuggester {

    /**
     * Enterprise colors, in order, repeated after the last one. Okabe-Ito (colorblind-safe) first, then Paul Tol's
     * high-contrast tones; every color has at least 3:1 contrast on white, so markers stay visible on the map (US-05).
     */
    static final List<String> PALETTE = List.of("#0072B2", "#D55E00", "#009E73", "#CC79A7", "#997700", "#332288",
            "#882255", "#4D4D4D");

    /** Same limit as {@code enterprise.name}. */
    static final int MAX_ENTERPRISE_NAME = 100;

    private enum Field { CUSTOMER, DELIVERY_POINT, ADDRESS, CITY, AGENT, LATITUDE, LONGITUDE }

    /** Normalized synonyms (lower case, no accents, punctuation as spaces). */
    private static final Map<Field, List<String>> SYNONYMS = Map.of(
            Field.CUSTOMER, List.of("cliente", "rag soc", "ragione sociale", "customer", "customer name"),
            Field.DELIVERY_POINT, List.of("cliente di consegna", "punto", "punto vendita", "punto di consegna",
                    "delivery point", "point of sale"),
            Field.ADDRESS, List.of("indirizzo", "address"),
            Field.CITY, List.of("citta", "comune", "city"),
            Field.AGENT, List.of("agente", "agent"),
            Field.LATITUDE, List.of("latitudine", "latitude", "lat"),
            Field.LONGITUDE, List.of("longitudine", "longitude", "lon", "lng"));

    private static final Set<String> TOTAL_WORDS = Set.of("total", "totale", "totali");

    ColumnMapping suggest(ParsedSheet sheet) {
        Map<Field, String> fields = matchFields(sheet.headers());
        Set<String> used = new HashSet<>(fields.values());

        List<EnterpriseMapping> enterprises = new ArrayList<>();
        for (int column = 0; column < sheet.headers().size(); column++) {
            String header = sheet.headers().get(column);
            if (!used.contains(header) && !isTotal(header) && isAmountColumn(sheet.rows(), column)) {
                String name = header.length() > MAX_ENTERPRISE_NAME ? header.substring(0, MAX_ENTERPRISE_NAME) : header;
                enterprises.add(new EnterpriseMapping(header, name, PALETTE.get(enterprises.size() % PALETTE.size())));
            }
        }
        return new ColumnMapping(fields.get(Field.CUSTOMER), fields.get(Field.DELIVERY_POINT), fields.get(Field.ADDRESS),
                fields.get(Field.CITY), fields.get(Field.AGENT), fields.get(Field.LATITUDE), fields.get(Field.LONGITUDE),
                List.copyOf(enterprises));
    }

    private record Candidate(Field field, String header, int column, boolean exact, int synonymLength) {
    }

    /**
     * Every (field, header) pair whose header equals or contains a synonym as whole words; the best pairs are taken
     * first: exact matches, then longer (more specific) synonyms, then the leftmost column. Each header and each field
     * is used once, so "Cliente di consegna" goes to the delivery point even if a "Cliente" column exists.
     */
    private static Map<Field, String> matchFields(List<String> headers) {
        List<Candidate> candidates = new ArrayList<>();
        for (int column = 0; column < headers.size(); column++) {
            String normalized = normalize(headers.get(column));
            for (Map.Entry<Field, List<String>> entry : SYNONYMS.entrySet()) {
                for (String synonym : entry.getValue()) {
                    boolean exact = normalized.equals(synonym);
                    if (exact || (" " + normalized + " ").contains(" " + synonym + " ")) {
                        candidates.add(new Candidate(entry.getKey(), headers.get(column), column, exact, synonym.length()));
                    }
                }
            }
        }
        candidates.sort(Comparator.comparing(Candidate::exact).reversed()
                .thenComparing(Comparator.comparingInt(Candidate::synonymLength).reversed())
                .thenComparingInt(Candidate::column));

        Map<Field, String> fields = new HashMap<>();
        Set<String> used = new HashSet<>();
        for (Candidate candidate : candidates) {
            if (!fields.containsKey(candidate.field()) && !used.contains(candidate.header())) {
                fields.put(candidate.field(), candidate.header());
                used.add(candidate.header());
            }
        }
        return fields;
    }

    private static boolean isTotal(String header) {
        for (String word : normalize(header).split(" ")) {
            if (TOTAL_WORDS.contains(word)) {
                return true;
            }
        }
        return false;
    }

    /** Every non-empty cell is an amount ('-' counts as 0) and at least one is a real number. */
    private static boolean isAmountColumn(List<SheetRow> rows, int column) {
        boolean anyNumber = false;
        for (SheetRow row : rows) {
            String cell = row.cells().get(column).strip();
            if (cell.isEmpty() || cell.equals("-")) {
                continue;
            }
            if (AmountParser.parse(cell).isEmpty()) {
                return false;
            }
            anyNumber = true;
        }
        return anyNumber;
    }

    /** "RAG. SOC." -> "rag soc", "CITTÀ" -> "citta". */
    static String normalize(String header) {
        String withoutAccents = Normalizer.normalize(header, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").strip();
    }
}
