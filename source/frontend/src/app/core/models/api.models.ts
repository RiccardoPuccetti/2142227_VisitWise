/**
 * TypeScript mirror of booklets/architecture/API_CONTRACT.md.
 * The contract is the source of truth: change it there first (agreed by the team), then here.
 * Dates are ISO strings: `LocalDate` -> 'YYYY-MM-DD', timestamps -> ISO-8601 with offset.
 */

// ---------- Imports (owner: Puccetti; DeliveryPoint list endpoint: Rivera) ----------

export type ImportStatus = 'PROCESSING' | 'GEOCODING' | 'READY' | 'FAILED';
export type GeocodeStatus = 'PENDING' | 'OK' | 'NOT_FOUND' | 'FROM_FILE' | 'MANUAL';

export interface EnterpriseMapping {
  /** Header of the Excel column holding this enterprise's revenue. */
  sourceColumn: string;
  /** Display name, e.g. 'Enterprise A'. */
  name: string;
  /** Hex color, e.g. '#2563eb'. */
  color: string;
}

/** Each field holds the Excel header name of the column that contains it. */
export interface ColumnMapping {
  customer: string;
  deliveryPoint: string;
  address: string;
  city: string;
  agent: string | null;
  latitude: string | null;
  longitude: string | null;
  enterprises: EnterpriseMapping[];
}

export interface ImportPreview {
  fileName: string;
  sheetName: string;
  headers: string[];
  /** First rows of the sheet, cells rendered as strings. */
  sampleRows: string[][];
  totalRows: number;
  suggestedMapping: ColumnMapping;
}

export interface CreateImportRequest {
  name: string;
  mapping: ColumnMapping;
}

export interface Enterprise {
  id: number;
  name: string;
  color: string;
  sourceColumn: string;
}

export interface ImportSummary {
  id: number;
  name: string;
  sourceFileName: string;
  createdAt: string;
  status: ImportStatus;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  geocodedRows: number;
  enterprises: Enterprise[];
}

export interface ImportDetail extends ImportSummary {
  mapping: ColumnMapping;
  agents: string[];
  cities: string[];
  notFoundCount: number;
  errorMessage: string | null;
}

export interface RevenueLine {
  enterpriseId: number;
  amount: number;
}

export interface DeliveryPoint {
  id: number;
  sourceRow: number;
  customerName: string;
  pointName: string;
  address: string;
  city: string;
  agent: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeStatus: GeocodeStatus;
  totalRevenue: number;
  revenues: RevenueLine[];
}

// ---------- Analytics (owner: Rivera) ----------

export interface NamedAmount {
  key: string;
  revenue: number;
  pointCount: number;
}

export interface EnterpriseAmount {
  enterpriseId: number;
  name: string;
  color: string;
  revenue: number;
  pointCount: number;
}

export interface ParetoPoint {
  /** Number of top delivery points considered. */
  points: number;
  /** Cumulative share of revenue, 0..1. */
  revenueShare: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  pointCount: number;
  customerCount: number;
  byEnterprise: EnterpriseAmount[];
  byAgent: NamedAmount[];
  byCity: NamedAmount[];
  topPoints: DeliveryPoint[];
  pareto: ParetoPoint[];
}

// ---------- Planning (owner: Marzella) ----------

export type CampaignCode = 'CHRISTMAS' | 'EASTER' | 'END_OF_SUMMER' | 'CUSTOM';
export type PlanningMode = 'PER_AGENT' | 'SINGLE_VISITOR';

export interface CampaignPreset {
  code: CampaignCode;
  label: string;
  startDate: string;
  endDate: string;
  /** Mon-Fri days in [startDate, endDate], public holidays excluded. */
  workingDays: number;
}

export interface EnterpriseWeight {
  enterpriseId: number;
  /** 0 excludes the enterprise, 1 = neutral, >1 = priority. */
  weight: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PlanParameters {
  campaign: CampaignCode;
  startDate: string;
  /** Optional campaign deadline: visits after it are flagged. */
  deadline: string | null;
  /** Maximum number of working days (Mon-Fri, holidays excluded) to complete the visits. */
  workingDays: number;
  enterpriseWeights: EnterpriseWeight[];
  /** Empty = all agents. */
  agents: string[];
  planningMode: PlanningMode;
  visitDurationMinutes: number;
  workdayMinutes: number;
  averageSpeedKmh: number;
  roadFactor: number;
  maxDistanceKm: number;
  /** Filled by the planner form from the tenant starting base (US-35); config default until one is saved. */
  base: GeoPoint;
  /** Opportunity cost of travel (EUR per km) used to trade revenue against distance. */
  travelCostPerKm: number;
  minRevenue: number;
}

export interface PlanKpis {
  plannedVisits: number;
  uniqueCustomers: number;
  coveredRevenue: number;
  eligibleRevenue: number;
  /** coveredRevenue / eligibleRevenue, 0..1. */
  coverage: number;
  /** Best possible covered revenue ignoring travel (sum of the top days x slots values). */
  upperBoundRevenue: number;
  totalKm: number;
  travelHours: number;
  workingDaysUsed: number;
  lastVisitDate: string | null;
  visitsAfterDeadline: number;
  excludedOutOfRange: number;
}

export interface PlannedVisit {
  deliveryPointId: number;
  customerName: string;
  pointName: string;
  address: string;
  city: string;
  agent: string | null;
  latitude: number;
  longitude: number;
  date: string;
  dayIndex: number;
  slot: number;
  expectedRevenue: number;
  travelKm: number;
}

export interface PlanDay {
  date: string;
  agent: string | null;
  visits: PlannedVisit[];
  km: number;
}

export interface PlanResult {
  /** null for a simulation that was not saved. */
  id: number | null;
  name: string | null;
  parameters: PlanParameters;
  kpis: PlanKpis;
  days: PlanDay[];
  /** Most valuable eligible points that did not fit in the horizon. */
  notPlanned: DeliveryPoint[];
  warnings: string[];
}

export interface PlanSummary {
  id: number;
  name: string;
  createdAt: string;
  parameters: PlanParameters;
  kpis: PlanKpis;
}

export interface WhatIfRequest {
  base: PlanParameters;
  /** Working-day horizons to compare, e.g. [10, 20, 30, 40]. */
  horizons: number[];
}

export interface WhatIfRow {
  workingDays: number;
  kpis: PlanKpis;
  /** Extra covered revenue compared with the previous (smaller) horizon. */
  marginalRevenue: number;
}

export interface WhatIfResult {
  rows: WhatIfRow[];
}

export interface CreatePlanRequest {
  name: string;
  parameters: PlanParameters;
}

// ---------- Authentication and profile (owner: Puccetti) ----------

export interface RegisterRequest {
  tenantName: string;
  email: string;
  password: string;
}

/** The logged-in account: one per tenant. */
export interface CurrentTenant {
  id: number;
  name: string;
  email: string;
}

export interface UpdateProfileRequest {
  name: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SaveStartingBaseRequest {
  address: string;
  city: string;
}

/** The tenant's starting base: every planned working day starts and ends here (US-35). */
export interface StartingBase extends GeoPoint {
  address: string;
  city: string;
}
