import type { ColumnMapping, DeliveryPoint, Enterprise, GeocodingProgress } from '../../core/models/api.models';
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
  territoryMarkers,
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

    it('needs only the two counts, so the import list can use it with the summary figures', () => {
      expect(locatedPercent({ total: 73, located: 40 })).toBe(55);
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
  describe('territoryMarkers (US-11, US-38)', () => {
    const ENTERPRISES: Enterprise[] = [
      { id: 21, name: 'Wine', color: '#0072B2', sourceColumn: 'ENTERPRISE A' },
      { id: 22, name: 'Beer', color: '#009E73', sourceColumn: 'ENTERPRISE B' },
    ];
    const point = (id: number, located: boolean, revenues: DeliveryPoint['revenues']): DeliveryPoint => ({
      id,
      sourceRow: id,
      customerName: 'ACME SRL',
      pointName: `POINT ${id}`,
      address: 'VIA DEL CORSO 1',
      city: 'ROMA',
      agent: null,
      latitude: located ? 41.9 : null,
      longitude: located ? 12.5 : null,
      geocodeStatus: located ? 'OK' : 'NOT_FOUND',
      totalRevenue: revenues.reduce((sum, line) => sum + line.amount, 0),
      revenues,
    });

    it('places the located points, colored by the enterprise that sells most there', () => {
      const markers = territoryMarkers(
        [
          point(1, true, [
            { enterpriseId: 21, amount: 100 },
            { enterpriseId: 22, amount: 300 },
          ]),
          point(2, false, [{ enterpriseId: 21, amount: 50 }]),
          point(3, true, [{ enterpriseId: 21, amount: 80 }]),
        ],
        ENTERPRISES,
      );

      expect(markers).toEqual([
        { id: 1, latitude: 41.9, longitude: 12.5, color: '#009E73', radius: 5, title: 'POINT 1' },
        { id: 3, latitude: 41.9, longitude: 12.5, color: '#0072B2', radius: 5, title: 'POINT 3' },
      ]);
    });

    it('draws points without positive revenue in grey', () => {
      const [marker] = territoryMarkers([point(4, true, [{ enterpriseId: 21, amount: -20 }])], ENTERPRISES);

      expect(marker.color).toBe('#8a9099');
    });
  });
});
