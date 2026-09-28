import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { DeliveryPoint } from '../../core/models/api.models';
import { field, settle, submit, text, type } from '../auth/form-test-utils';
import { PointLocationForm } from './point-location-form';

const POINT: DeliveryPoint = {
  id: 1002,
  sourceRow: 3,
  customerName: 'ACME SRL',
  pointName: 'BAR ACME 2',
  address: 'VIA NOWHERE 1',
  city: 'ROMA',
  agent: 'AGENT NORTH',
  latitude: null,
  longitude: null,
  geocodeStatus: 'NOT_FOUND',
  totalRevenue: 120,
  revenues: [],
};

describe('PointLocationForm (US-09)', () => {
  let http: HttpTestingController;

  const render = async () => {
    const fixture = TestBed.createComponent(PointLocationForm);
    fixture.componentRef.setInput('importId', 7);
    fixture.componentRef.setInput('point', POINT);
    const saved = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    await fixture.whenStable();
    return { fixture, saved, cancelled };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PointLocationForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('names the point and has labelled coordinate fields', async () => {
    const { fixture } = await render();
    const root = fixture.nativeElement as HTMLElement;

    expect(text(root.querySelector('h2'))).toBe('Set the location of BAR ACME 2');
    expect(text(root)).toContain('VIA NOWHERE 1, ROMA');
    expect(root.querySelector('label[for="location-latitude"]')).not.toBeNull();
    expect(root.querySelector('label[for="location-longitude"]')).not.toBeNull();
    expect(field(fixture, 'location-latitude').getAttribute('inputmode')).toBe('decimal');
  });

  it('refuses coordinates out of range without calling the backend', async () => {
    const { fixture, saved } = await render();

    type(field(fixture, 'location-latitude'), '95');
    type(field(fixture, 'location-longitude'), 'east');
    await submit(fixture);

    const errors = text(fixture.nativeElement);
    expect(errors).toContain('Enter a number between -90 and 90');
    expect(errors).toContain('Enter a number, e.g. 41.9028');
    http.expectNone('/api/imports/7/points/1002/location');
    expect(saved).not.toHaveBeenCalled();
  });

  it('saves the coordinates, also with a decimal comma', async () => {
    const { fixture, saved } = await render();

    type(field(fixture, 'location-latitude'), '41,9028');
    type(field(fixture, 'location-longitude'), '12.4964');
    await submit(fixture);

    const call = http.expectOne({ method: 'PATCH', url: '/api/imports/7/points/1002/location' });
    expect(call.request.body).toEqual({ latitude: 41.9028, longitude: 12.4964 });
    const located = { ...POINT, latitude: 41.9028, longitude: 12.4964, geocodeStatus: 'MANUAL' as const };
    call.flush(located);
    await settle(fixture);

    expect(saved).toHaveBeenCalledWith(located);
  });

  it('shows the server message when the location is refused', async () => {
    const { fixture, saved } = await render();

    type(field(fixture, 'location-latitude'), '41.9');
    type(field(fixture, 'location-longitude'), '12.5');
    await submit(fixture);
    http
      .expectOne('/api/imports/7/points/1002/location')
      .flush({ detail: 'latitude: must be between -90 and 90' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(text(alert)).toContain('latitude: must be between -90 and 90');
    expect(saved).not.toHaveBeenCalled();
  });

  it('can be cancelled', async () => {
    const { fixture, cancelled } = await render();

    const cancel = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => text(button) === 'Cancel',
    );
    cancel?.click();

    expect(cancelled).toHaveBeenCalled();
  });
});
