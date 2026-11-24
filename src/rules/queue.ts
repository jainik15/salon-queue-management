export const RULE_CONSTANTS = {
  NO_SHOW_AFTER_MINUTES: 10,
  ONLINE_CLOSE_BEFORE_MINUTES: 30,
  MAX_SERVICES: 3,
  AMBER_AFTER_MINUTES: 60,
  WAIT_ROUND_TO_MINUTES: 5,
  START_COMING_POSITION: 2,
  UP_NEXT_COUNT: 5,
  SYNC_MAX_SECONDS: 5,
  CALL_FLASH_SECONDS: 10,
  PIN_MAX_TRIES: 5,
  PIN_LOCK_SECONDS: 30,
  SERVICE_MIN_MINUTES: 5,
  SERVICE_MAX_MINUTES: 180,
  SERVICE_STEP_MINUTES: 5,
  JOIN_ATTEMPTS_PER_MINUTE: 5,
} as const;

export type SpotStatus = 'Waiting' | 'Called' | 'In chair' | 'Done' | 'Cancelled' | 'No-show';

export type StatusMove = {
  from: SpotStatus | null;
  to: SpotStatus;
};

export const ALLOWED_MOVES: StatusMove[] = [
  { from: null, to: 'Waiting' },
  { from: 'Waiting', to: 'Called' },
  { from: 'Waiting', to: 'Cancelled' },
  { from: 'Called', to: 'In chair' },
  { from: 'Called', to: 'No-show' },
  { from: 'In chair', to: 'Done' },
];

export function isAllowedMove(from: SpotStatus | null, to: SpotStatus): boolean {
  return ALLOWED_MOVES.some((move) => move.from === from && move.to === to);
}

export function roundWaitUp(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.ceil(minutes / RULE_CONSTANTS.WAIT_ROUND_TO_MINUTES) * RULE_CONSTANTS.WAIT_ROUND_TO_MINUTES;
}

export function calculateWait(workAheadMinutes: number, workingBarbers: number): number | null {
  if (workingBarbers <= 0) return null;
  if (workAheadMinutes <= 0) return 0;
  return roundWaitUp(workAheadMinutes / workingBarbers);
}
