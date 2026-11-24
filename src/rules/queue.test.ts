import { describe, expect, it } from 'vitest';
import {
  calculateWait,
  isAllowedMove,
  normalizePhone,
  roundWaitUp,
  validateJoinName,
  validateJoinPhone,
  validateServiceSelection,
  formatWaitEstimate,
  resolveDemoStatus,
} from './queue';

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

describe('join validation', () => {
  it('trims names and validates the documented length', () => {
    expect(validateJoinName('  Kunal  ')).toBe(true);
    expect(validateJoinName(' A ')).toBe(false);
    expect(validateJoinName('x'.repeat(41))).toBe(false);
  });

  it('normalizes phone spaces and dashes', () => {
    expect(normalizePhone('98765 43210')).toBe('9876543210');
    expect(normalizePhone('98765-43210')).toBe('9876543210');
    expect(validateJoinPhone('98765 43210')).toBe(true);
    expect(validateJoinPhone('987654321')).toBe(false);
    expect(validateJoinPhone('987654321a')).toBe(false);
  });

  it('allows one to three unique enabled services', () => {
    expect(validateServiceSelection(['haircut', 'beard'], ['haircut', 'beard', 'spa'])).toBe(true);
    expect(validateServiceSelection([], ['haircut'])).toBe(false);
    expect(validateServiceSelection(['haircut', 'haircut'], ['haircut'])).toBe(false);
    expect(validateServiceSelection(['haircut', 'beard', 'spa', 'massage'], ['haircut', 'beard', 'spa', 'massage'])).toBe(false);
    expect(validateServiceSelection(['haircut'], ['beard'])).toBe(false);
  });
});

describe('wait display format', () => {
  it('formats under an hour and hour-plus estimates', () => {
    expect(formatWaitEstimate(35)).toBe('35 min');
    expect(formatWaitEstimate(60)).toBe('1 h');
    expect(formatWaitEstimate(75)).toBe('1 h 15 min');
    expect(formatWaitEstimate(0)).toBe('No wait');
  });
});

describe('demo status controls', () => {
  it('applies only allowed moves and never changes a final status', () => {
    expect(resolveDemoStatus('Waiting', 'Called')).toBe('Called');
    expect(resolveDemoStatus('Called', 'In chair')).toBe('In chair');
    expect(resolveDemoStatus('In chair', 'Done')).toBe('Done');
    expect(resolveDemoStatus('Waiting', 'Done')).toBe('Waiting');
    expect(resolveDemoStatus('Called', 'Waiting')).toBe('Called');
    expect(resolveDemoStatus('Done', 'Called')).toBe('Done');
    expect(resolveDemoStatus('Cancelled', 'Waiting')).toBe('Cancelled');
  });
});
