import { CreateImportRequest, ImportPreview } from '../../core/models/api.models';

/**
 * Same palette as the backend suggestion (MappingSuggester): colorblind-safe, at least 3:1 contrast on white.
 * Lower case, like the value of an `<input type="color">`.
 */
export const ENTERPRISE_PALETTE: readonly string[] = [
  '#0072b2',
  '#d55e00',
  '#009e73',
  '#cc79a7',
  '#997700',
  '#332288',
  '#882255',
  '#4d4d4d',
];

/** Limits of the backend (import_batch.name, enterprise.name). */
export const IMPORT_NAME_MAX = 150;
export const ENTERPRISE_NAME_MAX = 100;

/** One column of the file offered as an enterprise in step 3 (S4). */
export interface EnterpriseDraft {
  sourceColumn: string;
  selected: boolean;
  name: string;
  color: string;
}

/** The wizard form: a field holds the header of its column, '' when not mapped. */
export interface ImportDraft {
  name: string;
  customer: string;
  deliveryPoint: string;
  address: string;
  city: string;
  agent: string;
  latitude: string;
  longitude: string;
  /** One entry per header, in column order. */
  enterprises: EnterpriseDraft[];
}

/** The suggested mapping made editable; every column can become an enterprise, the suggested ones are selected. */
export function draftFromPreview(preview: ImportPreview): ImportDraft {
  const mapping = preview.suggestedMapping;
  const suggested = new Map(mapping.enterprises.map((e) => [e.sourceColumn, e]));
  let nextColor = suggested.size;
  return {
    name: defaultImportName(preview.fileName),
    customer: mapping.customer ?? '',
    deliveryPoint: mapping.deliveryPoint ?? '',
    address: mapping.address ?? '',
    city: mapping.city ?? '',
    agent: mapping.agent ?? '',
    latitude: mapping.latitude ?? '',
    longitude: mapping.longitude ?? '',
    enterprises: preview.headers.map((header) => {
      const enterprise = suggested.get(header);
      return enterprise
        ? { sourceColumn: header, selected: true, name: enterprise.name, color: enterprise.color.toLowerCase() }
        : {
            sourceColumn: header,
            selected: false,
            name: header.slice(0, ENTERPRISE_NAME_MAX),
            color: ENTERPRISE_PALETTE[nextColor++ % ENTERPRISE_PALETTE.length],
          };
    }),
  };
}

export function defaultImportName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\.xlsx$/i, '')
    .trim()
    .slice(0, IMPORT_NAME_MAX);
}

/** Columns already used by a field (customer, city, ...) cannot hold an enterprise's revenue. */
export function enterpriseCandidates(draft: ImportDraft): EnterpriseDraft[] {
  const used = new Set(
    [draft.customer, draft.deliveryPoint, draft.address, draft.city, draft.agent, draft.latitude, draft.longitude].filter(
      (column) => column !== '',
    ),
  );
  return draft.enterprises.filter((e) => !used.has(e.sourceColumn));
}

export function toCreateRequest(draft: ImportDraft): CreateImportRequest {
  const optional = (column: string) => (column === '' ? null : column);
  return {
    name: draft.name.trim(),
    mapping: {
      customer: draft.customer,
      deliveryPoint: draft.deliveryPoint,
      address: draft.address,
      city: draft.city,
      agent: optional(draft.agent),
      latitude: optional(draft.latitude),
      longitude: optional(draft.longitude),
      enterprises: enterpriseCandidates(draft)
        .filter((e) => e.selected)
        .map((e) => ({ sourceColumn: e.sourceColumn, name: e.name.trim(), color: e.color })),
    },
  };
}

/** WCAG contrast ratio of a `#rrggbb` color against white, from 1 (white) to 21 (black). */
export function contrastOnWhite(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/** US-05: markers must stay visible on the mostly white map (WCAG 1.4.11 asks 3:1 for graphics). */
export function isVisibleOnMap(hex: string): boolean {
  return contrastOnWhite(hex) >= 3;
}
