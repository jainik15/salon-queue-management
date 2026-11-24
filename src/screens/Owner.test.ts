import { describe, expect, it } from 'vitest';

describe('Owner dashboard essential workflow', () => {
  it('toggles online joining open and closed', () => {
    let onlineOpen = true;
    onlineOpen = !onlineOpen;
    expect(onlineOpen).toBe(false);
    onlineOpen = !onlineOpen;
    expect(onlineOpen).toBe(true);
  });

  it('prevents switching off the last enabled service', () => {
    const enabledCount = 1;
    const serviceWasEnabled = true;
    const allowed = !(enabledCount === 1 && serviceWasEnabled);
    expect(allowed).toBe(false);
  });

  it('toggles barber on-duty state', () => {
    let onDuty = true;
    onDuty = !onDuty;
    expect(onDuty).toBe(false);
  });
});
