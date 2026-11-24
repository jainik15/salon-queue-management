import type { SpotStatus } from './rules/queue';

export const DUMMY_SPOT_STORAGE_KEY = 'latecuts-active-spot';

export type DummySpot = {
  id: string;
  token: string;
  phone: string;
  status: SpotStatus;
  position: number;
  estimate: number;
  initialEstimate: number;
  preference: 'Any' | 'Ravi' | 'Amit' | 'Imran';
  barber: 'Ravi' | 'Amit' | 'Imran';
  joinedAt: string;
  services: string[];
  totalMinutes: number;
  totalPrice: number;
  barberOnBreak?: boolean;
  noWorkingBarber?: boolean;
};

export type SpotStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function createDummySpot(
  id: string,
  phone: string,
  details: Omit<DummySpot, 'id' | 'phone'>,
): DummySpot {
  return { id, phone, ...details };
}

export function saveDummySpot(storage: SpotStorage, spot: DummySpot): void {
  storage.setItem(DUMMY_SPOT_STORAGE_KEY, JSON.stringify(spot));
}

export function readDummySpot(
  storage: SpotStorage,
  spotId: string,
): DummySpot | null {
  const raw = storage.getItem(DUMMY_SPOT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DummySpot>;
    if (
      parsed.id !== spotId ||
      !parsed.token ||
      !parsed.status ||
      parsed.position === undefined ||
      parsed.estimate === undefined ||
      parsed.initialEstimate === undefined ||
      !parsed.preference ||
      !parsed.barber ||
      !parsed.joinedAt ||
      !Array.isArray(parsed.services) ||
      parsed.totalMinutes === undefined ||
      parsed.totalPrice === undefined
    ) {
      return null;
    }
    return parsed as DummySpot;
  } catch {
    return null;
  }
}

export function getStatusUrl(spot: DummySpot): string {
  return `/status/${encodeURIComponent(spot.id)}`;
}

export function resolveDummySpot(
  spotId: string,
  navigationSpot: Partial<DummySpot> | null,
  storedSpot: DummySpot | null,
): DummySpot | null {
  if (
    navigationSpot &&
    navigationSpot.id === spotId &&
    navigationSpot.token &&
    navigationSpot.status &&
    navigationSpot.position !== undefined &&
    navigationSpot.estimate !== undefined &&
    navigationSpot.initialEstimate !== undefined &&
    navigationSpot.preference &&
    navigationSpot.barber &&
    navigationSpot.joinedAt &&
    Array.isArray(navigationSpot.services) &&
    navigationSpot.totalMinutes !== undefined &&
    navigationSpot.totalPrice !== undefined
  ) {
    return navigationSpot as DummySpot;
  }

  if (storedSpot && storedSpot.id === spotId) return storedSpot;
  return null;
}

export function getStaleStatusFallback(
  requestedSpotId: string,
  storedSpot: DummySpot | null,
): string | null {
  if (!storedSpot || storedSpot.id === requestedSpotId) return null;
  return getStatusUrl(storedSpot);
}
