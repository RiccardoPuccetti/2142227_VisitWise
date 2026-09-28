import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { problemDetail } from '../../core/auth/problem-detail';
import { EurPipe, formatEur, KpiCard } from '../../shared';
import { agentLabel, calendarWeeks, exportUrl, planAgents, visitStops } from './plan.model';
import { PlansService } from './plans.service';

// Dates of the API are YYYY-MM-DD: formatted in UTC so the day never moves with the time zone.
const DAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const FULL_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const KM = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const PERCENT = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });

function formatDate(date: string, format: Intl.DateTimeFormat): string {
  return format.format(new Date(`${date}T00:00:00Z`));
}

/**
 * Agent plan (US-28..US-30): the visits of a saved plan day by day, one week per row from Monday to Friday, with
 * OpenStreetMap directions from the previous stop and the Excel export of the whole plan or of one agent.
 */
@Component({
  selector: 'app-plan-detail-page',
  imports: [
    HlmAlertImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmLabelImports,
    HlmNativeSelectImports,
    KpiCard,
    EurPipe,
  ],
  templateUrl: './plan-detail-page.html',
})
export class PlanDetailPage {
  /** Route parameters (withComponentInputBinding). */
  readonly importId = input.required<string>();
  readonly planId = input.required<string>();

  private readonly api = inject(PlansService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = computed(() => Number(this.planId()));

  /** Agent whose visits are shown; null = every agent. Kept in the URL (`?agent=`). */
  protected readonly agent = signal<string | null>(
    this.route.snapshot.queryParamMap.get('agent') || null,
  );

  private readonly planResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.plan(params),
  });

  protected readonly plan = computed(() =>
    this.planResource.hasValue() ? this.planResource.value() : undefined,
  );
  protected readonly error = computed(() => {
    const error = this.planResource.error();
    return error ? problemDetail(error) : null;
  });

  protected readonly agents = computed(() => planAgents(this.plan()?.days ?? []));
  protected readonly exportHref = computed(() => exportUrl(this.id(), this.agent()));

  protected readonly subtitle = computed(() => {
    const parameters = this.plan()?.parameters;
    if (!parameters) {
      return '';
    }
    const parts = [
      `From ${formatDate(parameters.startDate, FULL_DATE)}`,
      `${parameters.workingDays} working days`,
    ];
    if (parameters.deadline) {
      parts.push(`deadline ${formatDate(parameters.deadline, FULL_DATE)}`);
    }
    return parts.join(' · ');
  });

  protected readonly indicators = computed(() => {
    const kpis = this.plan()?.kpis;
    if (!kpis) {
      return null;
    }
    return {
      visits: `${kpis.plannedVisits}`,
      customers: `${kpis.uniqueCustomers} customers`,
      revenue: formatEur(kpis.coveredRevenue),
      coverage: `${PERCENT.format(kpis.coverage)} of the eligible revenue`,
      days: `${kpis.workingDaysUsed}`,
      km: `${KM.format(kpis.totalKm)} km`,
      travel: `${KM.format(kpis.travelHours)} hours of travel`,
    };
  });

  /** The calendar with everything the template shows already computed. */
  protected readonly weeks = computed(() => {
    const plan = this.plan();
    if (!plan) {
      return [];
    }
    const { base, deadline, planningMode } = plan.parameters;
    return calendarWeeks(plan.days, this.agent()).map((week) => ({
      monday: week.monday,
      title: `Week of ${formatDate(week.monday, FULL_DATE)}`,
      days: week.days.map((day) => ({
        date: day.date,
        title: formatDate(day.date, DAY),
        afterDeadline: !!deadline && day.date > deadline,
        entries: day.entries.map((entry) => ({
          agent: agentLabel(entry.agent, planningMode),
          km: `${KM.format(entry.km)} km`,
          stops: visitStops(entry, base),
        })),
      })),
    }));
  });

  /** Several agents can share a day only when the calendar shows every agent. */
  protected readonly showAgentNames = computed(() => this.agent() === null);

  protected setAgent(value: string | null | undefined): void {
    const agent = value || null;
    this.agent.set(agent);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { agent },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
