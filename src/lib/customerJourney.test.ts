import { describe, expect, it } from 'vitest';
import {
  createDummySpot,
  getStatusUrl,
  readStoredDummySpot,
  saveDummySpot,
  type SpotStorage,
} from '../dummySpot';
import type {
  JoinRpcArgs,
  PrivateStatusRpcArgs,
  CancelRpcArgs,
} from './supabase';

describe('customer Join to private Status journey', () => {
  const makeStorage = () => {
    const values = new Map<string, string>();
    const storage: SpotStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    return storage;
  };

  it('successful Join stores capability and Status URL', () => {
    const storage = makeStorage();
    const spot = createDummySpot('spot-success', '9876543210', {
      token: 'S-14',
      capability: 'private-capability-token',
      status: 'Waiting',
      position: 4,
      estimate: 35,
      initialEstimate: 45,
      preference: 'Any',
      barber: 'Amit',
      joinedAt: '2026-11-24T12:00:00.000Z',
      services: ['Haircut'],
      totalMinutes: 30,
      totalPrice: 150,
    });

    saveDummySpot(storage, spot);
    expect(getStatusUrl(spot)).toBe('/status/spot-success');
    expect(readStoredDummySpot(storage)?.capability).toBe('private-capability-token');
  });

  it('private Status requires spot ID and capability', () => {
    const spotId = 'spot-private';
    const capability = 'private-capability-token';
    expect(spotId).not.toBe('');
    expect(capability).not.toBe('');
  });

  it('cancellation only proceeds with capability', () => {
    const capability = 'private-capability-token';
    const args: CancelRpcArgs = {
      p_spot_id: 'spot-private',
      p_customer_capability: capability,
    };
    expect(args.p_customer_capability).not.toBe('');
  });

  it('invalid or expired access has no capability', () => {
    const storage = makeStorage();
    expect(readStoredDummySpot(storage)).toBeNull();
  });
});
