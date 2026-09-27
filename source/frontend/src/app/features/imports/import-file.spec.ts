import { MAX_UPLOAD_BYTES, uploadProblem } from './import-file';

function fileOf(name: string, size: number): File {
  const file = new File([''], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/** Checked before uploading (US-02): the backend checks again, this only saves a useless upload. */
describe('uploadProblem', () => {
  it('accepts an .xlsx file up to 20 MB, whatever the case of the extension', () => {
    expect(uploadProblem(fileOf('erp-2025.xlsx', 1000))).toBeNull();
    expect(uploadProblem(fileOf('ERP.XLSX', MAX_UPLOAD_BYTES))).toBeNull();
  });

  it('is 20 MB, like the backend and nginx limits', () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
  });

  it('rejects other file types, pointing old .xls files to Save As', () => {
    expect(uploadProblem(fileOf('erp.xls', 1000))).toBe(
      'Choose an Excel workbook (.xlsx). An old .xls file must first be saved as .xlsx from Excel.',
    );
    expect(uploadProblem(fileOf('erp.csv', 1000))).toBe(
      'Choose an Excel workbook (.xlsx). An old .xls file must first be saved as .xlsx from Excel.',
    );
  });

  it('rejects an empty file', () => {
    expect(uploadProblem(fileOf('erp.xlsx', 0))).toBe('The file is empty.');
  });

  it('rejects a file larger than 20 MB', () => {
    expect(uploadProblem(fileOf('erp.xlsx', MAX_UPLOAD_BYTES + 1))).toBe(
      'The file is larger than 20 MB.',
    );
  });
});
