import type { ColumnMapping, GeocodingProgress } from '../../core/models/api.models';
import {
  geocodeStatusLabel,
  geocodingRunning,
  locatedPercent,
  mappingRows,
  missingAddresses,
  needsLocation,
  pageCount,
  pageOf,
  parseCoordinate,
} from './import-detail.model';

const PROGRESS: GeocodingProgress = {
  status: 'GEOCODING',
  total: 73,
  located: 40,
  pending: 31,
  notFound: 2,
  errorMessage: null,
};

describe('import detail model', () => {
  describe('parseCoordinate (US-09)', () => {
    it.each([
      ['41.9028', 41.9028],
      ['41,9028', 41.9028],
      [' -12.5 ', -12.5],
      ['90', 90],
      ['-90', -90],
    ])('reads %s as %s', (text, value) => {
      expect(parseCoordinate(text, 90)).toEqual({ value });
    });

    it('asks for a value when the field is empty', () => {
      expect(parseCoordinate('  ', 90)).toEqual({ error: 'Enter a number' });
    });

    it.each(['abc', '41.9.1', '1e3', '12,5,1'])('refuses %s', (text) => {
      expect(parseCoordinate(text, 90)).toEqual({ error: 'Enter a number, e.g. 41.9028' });
    });

    it('refuses values out of range', () => {
      expect(parseCoordinate('90.5', 90)).toEqual({ error: 'Enter a number between -90 and 90' });
      expect(parseCoordinate('-181', 180)).toEqual({ error: 'Enter a number between -180 and 180' });
      expect(parseCoordinate('180', 180)).toEqual({ value: 180 });
    });
  });

  describe('geocoding progress (US-08)', () => {
    it('runs only while the import is geocoding', () => {
      expect(geocodingRunning(PROGRESS)).toBe(true);
      // Stopped (geocoder unavailable) or imported before the background job: points left waiting, nothing runs.
      expect(geocodingRunning({ ...PROGRESS, status: 'READY', pending: 3 })).toBe(false);
      expect(geocodingRunning({ ...PROGRESS, status: 'READY', pending: 0 })).toBe(false);
      expect(geocodingRunning(null)).toBe(false);
    });

    it('counts the addresses still without coordinates', () => {
      expect(missingAddresses({ ...PROGRESS, status: 'READY', pending: 3, notFound: 2 })).toBe(5);
      expect(missingAddresses({ ...PROGRESS, status: 'READY', pending: 0, notFound: 0 })).toBe(0);
    });

    it('gives the located share as a whole percent', () => {
      expect(locatedPercent(PROGRESS)).toBe(55);
      expect(locatedPercent({ ...PROGRESS, total: 0, located: 0 })).toBe(100);
    });
  });

  it('names every geocode status for people', () => {
    expect(geocodeStatusLabel('OK')).toBe('Found');
    expect(geocodeStatusLabel('FROM_FILE')).toBe('From the file');
    expect(geocodeStatusLabel('MANUAL')).toBe('Set by hand');
    expect(geocodeStatusLabel('NOT_FOUND')).toBe('Not found');
    expect(geocodeStatusLabel('PENDING')).toBe('Waiting');
  });

  it('lets the analyst place points that are not located', () => {
    expect(needsLocation('NOT_FOUND')).toBe(true);
    expect(needsLocation('PENDING')).toBe(true);
    expect(needsLocation('OK')).toBe(false);
    expect(needsLocation('MANUAL')).toBe(false);
    expect(needsLocation('FROM_FILE')).toBe(false);
  });

  it('pages a long list of points', () => {
    const items = Array.from({ length: 120 }, (_, index) => index);

    expect(pageCount(items.length, 50)).toBe(3);
    expect(pageCount(0, 50)).toBe(1);
    expect(pageOf(items, 1, 50)).toEqual(items.slice(0, 50));
    expect(pageOf(items, 3, 50)).toEqual(items.slice(100));
  });

  it('lists the mapped columns, skipping the unmapped optional ones', () => {
    const mapping: ColumnMapping = {
      customer: 'Ragione Sociale',
      deliveryPoint: 'Punto Vendita',
      address: 'Indirizzo',
      city: 'Comune',
      agent: null,
      latitude: null,
      longitude: null,
      enterprises: [{ sourceColumn: 'ENTERPRISE A', name: 'Wine', color: '#0072B2' }],
    };

    expect(mappingRows(mapping)).toEqual([
      { field: 'Customer', column: 'Ragione Sociale' },
      { field: 'Delivery point', column: 'Punto Vendita' },
      { field: 'Address', column: 'Indirizzo' },
      { field: 'City', column: 'Comune' },
      { field: 'Wine', column: 'ENTERPRISE A' },
    ]);
    expect(mappingRows({ ...mapping, agent: 'Agente', latitude: 'Lat', longitude: 'Lon' })).toContainEqual({
      field: 'Latitude',
      column: 'Lat',
    });
  });
});
