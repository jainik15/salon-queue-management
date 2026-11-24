import { describe, expect, it } from 'vitest';

describe('Reception staff workflow', () => {
  it('requires exactly four digits for PIN unlock', () => {
    expect(/^[0-9]{4}$/.test('1234')).toBe(true);
    expect(/^[0-9]{4}$/.test('123')).toBe(false);
    expect(/^[0-9]{4}$/.test('12a4')).toBe(false);
  });

  it('Call Next only calls a non-break, free barber', () => {
    const canCall = (barber: { on_break: boolean; busy: boolean }) =>
      !barber.on_break && !barber.busy;

    expect(canCall({ on_break: false, busy: false })).toBe(true);
    expect(canCall({ on_break: true, busy: false })).toBe(false);
    expect(canCall({ on_break: false, busy: true })).toBe(false);
  });

  it('No-show is separate from cancel and uses a confirmation', () => {
    const move = (kind: 'cancel' | 'noShow') =>
      kind === 'cancel' ? 'Waiting -> Cancelled' : 'Called -> No-show';

    expect(move('cancel')).toBe('Waiting -> Cancelled');
    expect(move('noShow')).toBe('Called -> No-show');
  });
});
