import { HttpErrorResponse } from '@angular/common/http';
import { problemDetail } from './problem-detail';

describe('problemDetail', () => {
  it('uses the detail of a problem+json answer', () => {
    const error = new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'Email already registered' } });

    expect(problemDetail(error)).toBe('Email already registered');
  });

  it('explains when the server cannot be reached', () => {
    expect(problemDetail(new HttpErrorResponse({ status: 0 }))).toBe(
      'Cannot reach the server. Check your connection and try again.',
    );
  });

  it('falls back to a generic message', () => {
    expect(problemDetail(new HttpErrorResponse({ status: 500, error: 'boom' }))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(problemDetail(new Error('unexpected'))).toBe('Something went wrong. Please try again.');
  });
});
