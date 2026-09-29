import type { ImportStatus } from '../../core/models/api.models';

const LABELS: Record<ImportStatus, string> = {
  PROCESSING: 'Processing',
  GEOCODING: 'Locating addresses',
  READY: 'Ready',
  FAILED: 'Failed',
};

/** Words shown for the status of an import in the list and in the detail. */
export function importStatusLabel(status: ImportStatus): string {
  return LABELS[status];
}

const CREATED = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Creation time of an import in the browser's time zone, e.g. "28 Sept 2026, 10:15". */
export function formatCreatedAt(createdAt: string): string {
  return CREATED.format(new Date(createdAt));
}
