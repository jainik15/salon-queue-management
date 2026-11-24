import type { CSSProperties, ReactNode } from 'react';
import type { Language } from '../i18n';

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

export function BrandTopBar({
  language,
  title,
  onLanguageChange,
  lock,
}: {
  language: Language;
  title: string;
  onLanguageChange: () => void;
  lock?: ReactNode;
}) {
  return (
    <header className="top-bar design-top-bar">
      <a className="brand" href="/" aria-label="LateCuts home">
        <img className="brand-mark" src="/brand/logo-mark.svg" alt="" />
        <span className="brand-name"><span>Late</span><strong>Cuts</strong></span>
      </a>
      <h1 className="screen-title">{title}</h1>
      <div className="top-bar-actions">
        {lock}
        <button
          type="button"
          className="language-toggle"
          aria-label={language === 'en' ? 'Switch to Gujarati' : 'Switch to English'}
          onClick={onLanguageChange}
        >
          EN | GU
        </button>
      </div>
    </header>
  );
}

export type BarberState = 'free' | 'busy' | 'break';

export function BarberCard({
  name,
  state,
  detail,
  progress,
  children,
}: {
  name: string;
  state: BarberState;
  detail: string;
  progress?: number;
  children?: ReactNode;
}) {
  const stateLabel =
    state === 'free' ? 'Free' :
    state === 'busy' ? 'Busy' :
    'On break';

  return (
    <article className={`barber-card barber-card-${state}`}>
      <div className="barber-card-heading">
        <span className="barber-avatar" aria-hidden="true">{name.charAt(0)}</span>
        <div>
          <h3>{name}</h3>
          <span className={`barber-state-chip barber-state-${state}`}>
            <span className="barber-state-dot" aria-hidden="true" />
            {stateLabel}
          </span>
        </div>
      </div>
      <p className="barber-card-detail">{detail}</p>
      {progress !== undefined && (
        <div className="barber-progress" aria-label={`${Math.round(progress)}%`}>
          <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {children && <div className="barber-card-actions">{children}</div>}
    </article>
  );
}

export function LiveDot({
  reconnecting = false,
  label,
}: {
  reconnecting?: boolean;
  label: string;
}) {
  return (
    <span className={`live-indicator ${reconnecting ? 'reconnecting' : ''}`}>
      <span className="live-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Toast({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: 'success' | 'danger';
}) {
  return (
    <div className={`design-toast design-toast-${tone}`} role="status">
      {children}
    </div>
  );
}

export function ConfirmDialog({
  title,
  consequence,
  safeLabel,
  riskyLabel,
  onSafe,
  onRisky,
}: {
  title: string;
  consequence: string;
  safeLabel: string;
  riskyLabel: string;
  onSafe: () => void;
  onRisky: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="foundation-dialog-title"
      >
        <h2 id="foundation-dialog-title">{title}</h2>
        <p>{consequence}</p>
        <div className="dialog-actions">
          <button type="button" className="safe-action" onClick={onSafe}>
            {safeLabel}
          </button>
          <button type="button" className="danger-action" onClick={onRisky}>
            {riskyLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Skeleton({
  variant = 'card',
}: {
  variant?: 'card' | 'ticket' | 'row';
}) {
  return <div className={`design-skeleton design-skeleton-${variant}`} aria-label="Loading" />;
}
