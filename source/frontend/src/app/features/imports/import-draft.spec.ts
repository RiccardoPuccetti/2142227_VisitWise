import { ImportPreview } from '../../core/models/api.models';
import {
  ENTERPRISE_PALETTE,
  contrastOnWhite,
  defaultImportName,
  draftFromPreview,
  enterpriseCandidates,
  ImportDraft,
  isVisibleOnMap,
  toCreateRequest,
} from './import-draft';

const PREVIEW: ImportPreview = {
  fileName: 'Sales 2025.xlsx',
  sheetName: 'Sheet1',
  headers: ['Ragione Sociale', 'Punto Vendita', 'Indirizzo', 'Comune', 'Agente', 'Totale', 'ENTERPRISE A', 'ENTERPRISE B'],
  sampleRows: [],
  totalRows: 3,
  suggestedMapping: {
    customer: 'Ragione Sociale',
    deliveryPoint: 'Punto Vendita',
    address: 'Indirizzo',
    city: null,
    agent: 'Agente',
    latitude: null,
    longitude: null,
    enterprises: [
      { sourceColumn: 'ENTERPRISE A', name: 'ENTERPRISE A', color: '#0072B2' },
      { sourceColumn: 'ENTERPRISE B', name: 'ENTERPRISE B', color: '#D55E00' },
    ],
  },
};

describe('import draft', () => {
  describe('draftFromPreview', () => {
    it('starts from the suggested mapping, with "" for fields no header matched', () => {
      const draft = draftFromPreview(PREVIEW);

      expect(draft.name).toBe('Sales 2025');
      expect(draft.customer).toBe('Ragione Sociale');
      expect(draft.deliveryPoint).toBe('Punto Vendita');
      expect(draft.address).toBe('Indirizzo');
      expect(draft.city).toBe('');
      expect(draft.agent).toBe('Agente');
      expect(draft.latitude).toBe('');
      expect(draft.longitude).toBe('');
    });

    it('offers every column as an enterprise: suggested ones selected, the others not, each with its own color', () => {
      const draft = draftFromPreview(PREVIEW);

      expect(draft.enterprises.map((e) => e.sourceColumn)).toEqual(PREVIEW.headers);
      const byColumn = new Map(draft.enterprises.map((e) => [e.sourceColumn, e]));
      expect(byColumn.get('ENTERPRISE A')).toEqual({
        sourceColumn: 'ENTERPRISE A',
        selected: true,
        name: 'ENTERPRISE A',
        color: '#0072b2',
      });
      expect(byColumn.get('ENTERPRISE B')?.selected).toBe(true);
      expect(byColumn.get('Totale')).toMatchObject({ selected: false, name: 'Totale' });
      const colors = draft.enterprises.map((e) => e.color);
      expect(colors.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
      expect(new Set(colors.slice(0, ENTERPRISE_PALETTE.length)).size).toBe(ENTERPRISE_PALETTE.length);
    });

    it('keeps long headers within the 100 characters of an enterprise name', () => {
      const long = 'E'.repeat(120);
      const draft = draftFromPreview({ ...PREVIEW, headers: [...PREVIEW.headers, long] });

      expect(draft.enterprises.at(-1)?.name).toHaveLength(100);
    });
  });

  it('names the import after the file, without the extension, within 150 characters', () => {
    expect(defaultImportName('Sales 2025.xlsx')).toBe('Sales 2025');
    expect(defaultImportName('  report.XLSX ')).toBe('report');
    expect(defaultImportName(`${'N'.repeat(200)}.xlsx`)).toHaveLength(150);
  });

  it('only columns not used by a field can be enterprises', () => {
    const draft: ImportDraft = { ...draftFromPreview(PREVIEW), city: 'Comune' };

    expect(enterpriseCandidates(draft).map((e) => e.sourceColumn)).toEqual(['Totale', 'ENTERPRISE A', 'ENTERPRISE B']);
  });

  describe('toCreateRequest', () => {
    it('sends the fields, null for optional ones not mapped, and the selected enterprises in column order', () => {
      const draft = draftFromPreview(PREVIEW);
      draft.name = '  Sample 2025  ';
      draft.city = 'Comune';
      draft.agent = '';
      draft.enterprises = draft.enterprises.map((e) =>
        e.sourceColumn === 'ENTERPRISE B' ? { ...e, name: '  Beer ' } : e,
      );

      expect(toCreateRequest(draft)).toEqual({
        name: 'Sample 2025',
        mapping: {
          customer: 'Ragione Sociale',
          deliveryPoint: 'Punto Vendita',
          address: 'Indirizzo',
          city: 'Comune',
          agent: null,
          latitude: null,
          longitude: null,
          enterprises: [
            { sourceColumn: 'ENTERPRISE A', name: 'ENTERPRISE A', color: '#0072b2' },
            { sourceColumn: 'ENTERPRISE B', name: 'Beer', color: '#d55e00' },
          ],
        },
      });
    });

    it('drops a selected enterprise whose column became a field', () => {
      const draft = { ...draftFromPreview(PREVIEW), city: 'ENTERPRISE B' };

      expect(toCreateRequest(draft).mapping.enterprises.map((e) => e.sourceColumn)).toEqual(['ENTERPRISE A']);
    });
  });

  describe('colors on the map (US-05)', () => {
    it('measures the WCAG contrast against white', () => {
      expect(contrastOnWhite('#000000')).toBeCloseTo(21, 5);
      expect(contrastOnWhite('#ffffff')).toBeCloseTo(1, 5);
      expect(contrastOnWhite('#0072B2')).toBeCloseTo(5.19, 2);
    });

    it('needs at least 3:1, like the backend', () => {
      expect(isVisibleOnMap('#CC79A7')).toBe(true);
      expect(isVisibleOnMap('#E69F00')).toBe(false);
      expect(ENTERPRISE_PALETTE.every(isVisibleOnMap)).toBe(true);
    });
  });
});
