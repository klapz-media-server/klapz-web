import { describe, expect, it } from 'vitest';
import { takeTicket } from './ticket';

describe('takeTicket', () => {
  it('takes the ticket out and keeps the rest of the address', () => {
    expect(takeTicket('http://localhost:32500/web/library/x?ticket=abc&sort=title#top')).toEqual({
      ticket: 'abc',
      rest: '/web/library/x?sort=title#top',
    });
    expect(takeTicket('http://localhost:32500/web/?ticket=abc')).toEqual({ ticket: 'abc', rest: '/web/' });
  });

  it('leaves an address without a ticket alone', () => {
    expect(takeTicket('http://localhost:32500/web/?sort=title')).toEqual({ ticket: null, rest: null });
  });
});
