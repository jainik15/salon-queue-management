import type { CSSProperties, ReactNode } from 'react';

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="LateCuts">
      {compact ? (
        <img className="brand-mark" src="/brand/logo-mark.svg" alt="" />
      ) : (
        <img className="brand-logo" src="/brand/logo.svg" alt="" />
      )}
    </span>
  );
}

export function Ticket({
  token,
  position,
  compact = false,
  className = '',
}: {
  token: string;
  position?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`token-ticket ${compact ? 'token-ticket-compact' : ''} ${className}`}>
      <div className="ticket-main">
        <span className="ticket-token">{token}</span>
      </div>
      {position && (
        <div className="ticket-stub" aria-label={position}>
          <span className="ticket-position">{position}</span>
          <span className="ticket-barcode" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function SplitFlap({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <div className="split-flap" aria-label={label ?? value}>
      {[...value].map((character, index) => (
        <span
          className="split-flap-character"
          style={{ '--flap-index': index } as CSSProperties}
          key={`${character}-${index}`}
        >
          {character}
        </span>
      ))}
    </div>
  );
}

export function EstimateRing({
  estimate,
  fill,
  label,
}: {
  estimate: ReactNode;
  fill: number;
  label: string;
}) {
  const ticks = Array.from({ length: 12 }, (_, index) => index);
  return (
    <div
      className="clock-estimate-ring"
      style={{ '--ring-fill': `${Math.max(0, Math.min(100, fill))}%` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      <div className="clock-ticks" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick}
            style={{ '--tick': tick } as CSSProperties}
          />
        ))}
      </div>
      <div className="clock-face">{estimate}</div>
    </div>
  );
}

export function EmptyChairIllustration() {
  return (
    <svg
      className="empty-chair"
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden="true"
    >
      <path d="M48 46h64v36H48z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M42 82h76v18H42z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M52 100v24M108 100v24M34 124h92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 46V30h48v16M66 30v-8h28v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BarberPole({ className = '' }: { className?: string }) {
  return <div className={`barber-pole ${className}`} aria-hidden="true" />;
}
