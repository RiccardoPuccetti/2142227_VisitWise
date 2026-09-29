import type { RevenueLine } from '../core/models/api.models';

/** Color of a point that has no positive revenue: none of the enterprises can claim it. */
export const NO_REVENUE_COLOR = '#8a9099';

/**
 * Marker color of a delivery point (US-13, US-11): the color of the enterprise with the largest positive revenue there,
 * among the selected ones (all when `selection` is empty).
 */
export function mainEnterpriseColor(
  revenues: readonly RevenueLine[],
  colors: ReadonlyMap<number, string>,
  selection: readonly number[] = [],
): string {
  let best: RevenueLine | null = null;
  for (const line of revenues) {
    const selected = selection.length === 0 || selection.includes(line.enterpriseId);
    if (selected && line.amount > 0 && (best === null || line.amount > best.amount)) {
      best = line;
    }
  }
  return (best && colors.get(best.enterpriseId)) || NO_REVENUE_COLOR;
}
