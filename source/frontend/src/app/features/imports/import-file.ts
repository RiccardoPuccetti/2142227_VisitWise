/** Same limit as the backend (spring.servlet.multipart) and nginx (client_max_body_size): 20 MB. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Why a chosen file cannot be uploaded, or null. Only saves a useless upload: the backend checks the content again
 * and answers 422 for anything that is not a real .xlsx workbook.
 */
export function uploadProblem(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return 'Choose an Excel workbook (.xlsx). An old .xls file must first be saved as .xlsx from Excel.';
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'The file is larger than 20 MB.';
  }
  return null;
}
