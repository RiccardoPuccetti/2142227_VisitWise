import type { PlanDay, PlannedVisit } from '../../core/models/api.models';
import {
  agentLabel,
  calendarWeeks,
  directionsUrl,
  exportUrl,
  planAgents,
  readableName,
  visitStops,
} from './plan.model';

const BASE = { latitude: 41.896, longitude: 12.4823 };

function visit(slot: number, latitude: number, longitude: number): PlannedVisit {
  return {
    deliveryPointId: 1000 + slot,
    customerName: `CUSTOMER ${slot}`,
    pointName: `POINT ${slot}`,
    address: `VIA DEL CORSO ${slot}`,
    city: 'ROMA',
    agent: 'AGENT NORTH',
    latitude,
    longitude,
    date: '2026-11-02',
    dayIndex: 0,
    slot,
    expectedRevenue: 1000,
    travelKm: 2,
  };
}

function day(date: string, agent: string | null, visits: PlannedVisit[] = []): PlanDay {
  return { date, agent, visits, km: 10 };
}

describe('plan model', () => {
  describe('agentLabel', () => {
    it('shows the agent name, or what a missing agent means in the plan mode', () => {
      expect(agentLabel('AGENT NORTH', 'PER_AGENT')).toBe('AGENT NORTH');
      expect(agentLabel(null, 'PER_AGENT')).toBe('No agent');
      expect(agentLabel(null, 'SINGLE_VISITOR')).toBe('Single visitor');
    });
  });

  describe('planAgents', () => {
    it('lists the agents of the plan once, sorted by name, without the missing agent', () => {
      const days = [
        day('2026-11-02', 'AGENT SOUTH'),
        day('2026-11-02', 'AGENT NORTH'),
        day('2026-11-03', 'AGENT SOUTH'),
        day('2026-11-03', null),
      ];

      expect(planAgents(days)).toEqual(['AGENT NORTH', 'AGENT SOUTH']);
    });
  });

  describe('calendarWeeks', () => {
    it('groups the days in weeks from Monday to Friday, with empty days where nothing is planned', () => {
      const weeks = calendarWeeks(
        [day('2026-11-03', 'AGENT NORTH'), day('2026-11-10', 'AGENT NORTH')],
        null,
      );

      expect(weeks.map((week) => week.monday)).toEqual(['2026-11-02', '2026-11-09']);
      expect(weeks[0].days.map((d) => d.date)).toEqual([
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
      ]);
      expect(weeks[0].days.map((d) => d.entries.length)).toEqual([0, 1, 0, 0, 0]);
    });

    it('skips the weeks without planned days between two planned weeks', () => {
      const weeks = calendarWeeks(
        [day('2026-11-02', 'AGENT NORTH'), day('2026-11-23', 'AGENT NORTH')],
        null,
      );

      expect(weeks.map((week) => week.monday)).toEqual(['2026-11-02', '2026-11-23']);
    });

    it('keeps only the days of the chosen agent', () => {
      const weeks = calendarWeeks(
        [
          day('2026-11-02', 'AGENT NORTH'),
          day('2026-11-02', 'AGENT SOUTH'),
          day('2026-11-16', 'AGENT SOUTH'),
        ],
        'AGENT NORTH',
      );

      expect(weeks).toHaveLength(1);
      expect(weeks[0].days[0].entries.map((entry) => entry.agent)).toEqual(['AGENT NORTH']);
    });

    it('does not shift the dates across a daylight saving change', () => {
      // Italy leaves summer time on Sunday 25 October 2026.
      const weeks = calendarWeeks([day('2026-10-26', 'AGENT NORTH')], null);

      expect(weeks[0].monday).toBe('2026-10-26');
      expect(weeks[0].days[4].date).toBe('2026-10-30');
    });
  });

  describe('directionsUrl', () => {
    it('opens OpenStreetMap directions by car between two points', () => {
      expect(directionsUrl(BASE, { latitude: 41.9031, longitude: 12.4794 })).toBe(
        'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=41.896%2C12.4823%3B41.9031%2C12.4794',
      );
    });
  });

  describe('visitStops', () => {
    it('starts the first visit of the day from the base and the next ones from the previous visit', () => {
      const first = visit(1, 41.9031, 12.4794);
      const second = visit(2, 41.902, 12.49);

      const stops = visitStops(day('2026-11-02', 'AGENT NORTH', [first, second]), BASE);

      expect(stops.map((stop) => stop.visit)).toEqual([first, second]);
      expect(stops[0].directions).toBe(directionsUrl(BASE, first));
      expect(stops[1].directions).toBe(directionsUrl(first, second));
    });
  });

  describe('exportUrl', () => {
    it('downloads the whole plan, or one agent', () => {
      expect(exportUrl(3, null)).toBe('/api/plans/3/export');
      expect(exportUrl(3, 'AGENT NORTH')).toBe('/api/plans/3/export?agent=AGENT%20NORTH');
    });
  });
});

describe('readableName', () => {
  it('turns the capitals of the ERP export into ordinary words', () => {
    expect(readableName('RISTORANTE LUNA ROSSA')).toBe('Ristorante Luna Rossa');
    expect(readableName('VIA TUSCOLANA 14, ROMA')).toBe('Via Tuscolana 14, Roma');
  });

  it('keeps Italian particles lower case after the first word', () => {
    expect(readableName('VIA DI PORTA MAGGIORE 30')).toBe('Via di Porta Maggiore 30');
    expect(readableName('DEL CORSO')).toBe('Del Corso');
  });

  it('keeps company forms and codes as they are', () => {
    expect(readableName('IL FARO SNC (82587)')).toBe('Il Faro SNC (82587)');
    expect(readableName('LE TERRAZZE SAS')).toBe('Le Terrazze SAS');
    expect(readableName('BELVEDERE S.R.L.')).toBe('Belvedere S.R.L.');
    expect(readableName("BAR DELL'ANGOLO")).toBe("Bar dell'Angolo");
  });
});
