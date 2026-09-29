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


/** Badge look of an import status: a failure stands out, a ready import stays quiet, a running one is grey. */
export function importStatusVariant(status: ImportStatus): 'destructive' | 'outline' | 'secondary' {
  return status === 'FAILED' ? 'destructive' : status === 'READY' ? 'outline' : 'secondary';
}
