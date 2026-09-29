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

