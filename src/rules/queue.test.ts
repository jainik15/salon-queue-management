import { describe, expect, it } from 'vitest';
import { calculateWait, isAllowedMove, roundWaitUp } from './queue';

describe('wait estimates', () => {
  it('passes examples E1-E9', () => {
    expect(calculateWait(155, 3)).toBe(55);
    expect(calculateWait(145, 2)).toBe(75);
    expect(calculateWait(45, 3)).toBe(15);
    expect(calculateWait(15, 3)).toBe(5);
    expect(calculateWait(0, 3)).toBe(0);
    expect(calculateWait(60, 3)).toBe(20);
    expect(calculateWait(0, 0)).toBeNull();
    expect(calculateWait(130, 3)).toBe(45);
    expect(roundWaitUp(43.3)).toBe(45);
  });
});

describe('status move table', () => {
  it('allows only documented moves', () => {
    expect(isAllowedMove(null, 'Waiting')).toBe(true);
    expect(isAllowedMove('Waiting', 'Called')).toBe(true);
    expect(isAllowedMove('Waiting', 'Cancelled')).toBe(true);
    expect(isAllowedMove('Called', 'In chair')).toBe(true);
    expect(isAllowedMove('Called', 'No-show')).toBe(true);
    expect(isAllowedMove('In chair', 'Done')).toBe(true);

    expect(isAllowedMove('Called', 'Waiting')).toBe(false);
    expect(isAllowedMove('Called', 'Cancelled')).toBe(false);
    expect(isAllowedMove('In chair', 'Cancelled')).toBe(false);
    expect(isAllowedMove('Waiting', 'No-show')).toBe(false);
    expect(isAllowedMove('Done', 'Waiting')).toBe(false);
  });
});
