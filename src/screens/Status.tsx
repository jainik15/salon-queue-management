import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { translate, type Language } from '../i18n';
import { formatWaitEstimate, isAllowedMove, resolveDemoStatus, RULE_CONSTANTS, type SpotStatus } from '../rules/queue';

type StatusScreenProps = {
  language: Language;
};

type DummySpot = {
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

const statusSteps: SpotStatus[] = ['Waiting', 'Called', 'In chair', 'Done'];
const demoStatuses: SpotStatus[] = ['Waiting', 'Called', 'In chair', 'Done', 'Cancelled', 'No-show'];

export function StatusScreen({ language }: StatusScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [spot, setSpot] = useState<DummySpot | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);

      const params = new URLSearchParams(location.search);
      if (params.get('error') === 'true') {
        setLoadError(true);
        return;
      }

      const spotId = decodeURIComponent(location.pathname.split('/')[2] ?? '');
      const storedJson = window.localStorage.getItem('latecuts-active-spot');
      let storedSpot: DummySpot | null = null;

      if (storedJson) {
        try {
          const parsed = JSON.parse(storedJson) as Partial<DummySpot>;
          if (
            parsed.id &&
            parsed.token &&
            parsed.status &&
            parsed.position !== undefined &&
            parsed.estimate !== undefined &&
            parsed.initialEstimate !== undefined &&
            parsed.preference &&
            parsed.barber &&
            parsed.joinedAt &&
            parsed.services &&
            parsed.totalMinutes !== undefined &&
            parsed.totalPrice !== undefined
          ) {
            const validSpot: DummySpot = {
              id: parsed.id,
              token: parsed.token,
              phone: parsed.phone ?? '',
              status: parsed.status,
              position: parsed.position,
              estimate: parsed.estimate,
              initialEstimate: parsed.initialEstimate,
              preference: parsed.preference,
              barber: parsed.barber,
              joinedAt: parsed.joinedAt,
              services: parsed.services,
              totalMinutes: parsed.totalMinutes,
              totalPrice: parsed.totalPrice,
              barberOnBreak: parsed.barberOnBreak,
              noWorkingBarber: parsed.noWorkingBarber,
            };
            storedSpot = validSpot;
          }
        } catch {
          storedSpot = null;
        }
      }

      if (!storedSpot || storedSpot.id !== spotId) {
        setSpot(null);
        return;
      }

      const statusParam = params.get('status');
      const positionParam = Number(params.get('position'));
      const requestedStatus = statusParam && demoStatuses.includes(statusParam as SpotStatus)
        ? statusParam as SpotStatus
        : null;
      const status = resolveDemoStatus(storedSpot.status, requestedStatus);
      const position = Number.isInteger(positionParam) && positionParam >= 1
        ? positionParam
        : storedSpot.position;
      const barberOnBreak = params.get('barberBreak') === 'true';
      const noWorkingBarber = params.get('noWorking') === 'true';

      setSpot({
        ...storedSpot,
        status,
        position,
        barberOnBreak,
        noWorkingBarber,
      });
    }, 350);

    const updateConnection = () => setConnectionLost(!navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      document.title = 'LateCuts';
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (spot?.status === 'Called') {
      document.title = '🔔 It\'s your turn!';
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } else {
      document.title = 'LateCuts';
    }
  }, [spot?.status]);

  const retry = () => {
    setLoadError(false);
    setLoading(true);
    window.setTimeout(() => window.location.reload(), 350);
  };

  const confirmCancel = () => {
    if (!spot || spot.status !== 'Waiting' || !isAllowedMove('Waiting', 'Cancelled')) return;
    const cancelledSpot: DummySpot = { ...spot, status: 'Cancelled' };
    window.localStorage.setItem('latecuts-active-spot', JSON.stringify(cancelledSpot));
    setSpot(cancelledSpot);
    setCancelOpen(false);
  };

  const joinAgain = () => navigate('/join');


  if (loading) {
    return (
      <StatusPageShell language={language} connectionLost={connectionLost}>
        <section className="status-content status-loading" aria-label="Loading">
          <div className="status-skeleton status-skeleton-stepper" />
          <div className="status-skeleton status-skeleton-token" />
          <div className="status-skeleton status-skeleton-ring" />
          <div className="status-skeleton status-skeleton-details" />
        </section>
      </StatusPageShell>
    );
  }

  if (loadError) {
    return (
      <StatusPageShell language={language} connectionLost={connectionLost}>
        <section className="status-state">
          <h2>{translate(language, 'status.initialError')}</h2>
          <button type="button" className="primary-button" onClick={retry}>
            {translate(language, 'status.tryAgain')}
          </button>
        </section>
      </StatusPageShell>
    );
  }

  if (!spot) {
    return (
      <StatusPageShell language={language} connectionLost={connectionLost}>
        <section className="status-state">
          <h2>{translate(language, 'status.notFound')}</h2>
          <Link className="primary-button" to="/">
            {translate(language, 'status.goHome')}
          </Link>
        </section>
      </StatusPageShell>
    );
  }

  if (spot.status === 'Called') {
    const heldMinutes = RULE_CONSTANTS.NO_SHOW_AFTER_MINUTES;
    return (
      <main className="turn-takeover" role="alertdialog" aria-modal="true" aria-label={translate(language, 'status.yourTurn')}>
        <div className="turn-content">
          <div className="turn-token">{spot.token}</div>
          <h1>{translate(language, 'status.yourTurn')}</h1>
          <p className="turn-barber">{translate(language, 'status.goTo', { barber: spot.barber })}</p>
          <p className="turn-held">
            {translate(language, 'status.comeNow', { minutes: heldMinutes })}
          </p>
        </div>
      </main>
    );
  }

  if (spot.status === 'In chair') {
    return (
      <StatusPageShell language={language} connectionLost={connectionLost}>
        <section className="status-content final-status">
          <ProgressStepper currentStatus="In chair" language={language} />
          <div className="in-chair-state">
            <div className="status-token">{spot.token}</div>
            <h2>{translate(language, 'status.enjoy', { barber: spot.barber })}</h2>
          </div>
        </section>
      </StatusPageShell>
    );
  }

  if (spot.status === 'Done' || spot.status === 'Cancelled' || spot.status === 'No-show') {
    let messageKey: 'status.thanks' | 'status.cancelled' | 'status.noShow' = 'status.thanks';
    if (spot.status === 'Cancelled') messageKey = 'status.cancelled';
    if (spot.status === 'No-show') messageKey = 'status.noShow';

    return (
      <StatusPageShell language={language} connectionLost={connectionLost}>
        <section className="status-content final-status">
          <FinalStatusSymbol status={spot.status} />
          <h2>{translate(language, messageKey)}</h2>
          <button type="button" className="primary-button join-again-button" onClick={joinAgain}>
            {translate(language, 'status.joinAgain')}
          </button>
        </section>
      </StatusPageShell>
    );
  }

  const positionLabel = getPositionLabel(spot.position, language);
  const estimateText = spot.estimate <= 0
    ? translate(language, 'status.noWait')
    : translate(language, 'estimate.about', {
        time: formatWaitEstimate(spot.estimate),
      });
  const ringFill = spot.initialEstimate <= 0
    ? 100
    : Math.max(0, Math.min(100, (1 - spot.estimate / spot.initialEstimate) * 100));

  return (
    <StatusPageShell language={language} connectionLost={connectionLost}>
      <section className="status-content">
        <ProgressStepper currentStatus="Waiting" language={language} />

        {spot.position === 2 && (
          <div className="stage-banner" role="status">
            {translate(language, 'status.startComing')}
          </div>
        )}
        {spot.position === 1 && (
          <div className="stage-banner" role="status">
            {translate(language, 'status.next')}
          </div>
        )}

        <div className="status-token">{spot.token}</div>
        <h2 className="status-position">{positionLabel}</h2>

        {spot.barberOnBreak && spot.preference !== 'Any' && (
          <p className="barber-break-notice">
            {translate(language, 'status.onBreak', { barber: spot.preference })}
          </p>
        )}

        {spot.noWorkingBarber ? (
          <div className="no-working-barber">
            {translate(language, 'status.noWorkingBarber')}
          </div>
        ) : connectionLost ? (
          <div className="estimate-ring estimate-ring-fallback">
            <span>{estimateText}</span>
          </div>
        ) : (
          <div
            className="estimate-ring"
            style={{ '--ring-fill': `${ringFill}%` } as CSSProperties}
            aria-label={estimateText}
          >
            <div className="estimate-ring-inner">
              {spot.estimate > 0 && <span>{language === 'en' ? 'about' : 'અંદાજે'}</span>}
              <strong>{estimateText === 'No wait' ? translate(language, 'status.noWait') : formatWaitEstimate(spot.estimate)}</strong>
            </div>
          </div>
        )}

        <div className="status-details">
          <p>{translate(language, 'status.details', {
            services: spot.services.join(' + '),
            preference: spot.preference === 'Any'
              ? (language === 'en' ? 'Any' : 'કોઈપણ')
              : spot.preference,
          })}</p>
          <p>{translate(language, 'status.total', {
            minutes: spot.totalMinutes,
            price: spot.totalPrice,
          })}</p>
          <p>{translate(language, 'status.joined', {
            time: formatJoinedTime(spot.joinedAt),
          })}</p>
        </div>

        <div className="status-live">
          <span className="live-dot" aria-hidden="true" />
          <span>{connectionLost ? translate(language, 'home.reconnecting') : translate(language, 'home.live')}</span>
        </div>
        <p className="keep-open">{translate(language, 'status.keepOpen')}</p>

        <button
          type="button"
          className="cancel-spot-button"
          aria-label={translate(language, 'status.cancelAccessibility')}
          onClick={() => setCancelOpen(true)}
        >
          {translate(language, 'status.cancel')}
        </button>
      </section>

      {cancelOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCancelOpen(false);
        }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-title">
            <h2 id="cancel-title">{translate(language, 'status.cancelQuestion', { token: spot.token })}</h2>
            <p>{translate(language, 'status.cancelConsequences')}</p>
            <div className="dialog-actions">
              <button type="button" className="safe-action" onClick={() => setCancelOpen(false)}>
                {translate(language, 'status.keepSpot')}
              </button>
              <button type="button" className="danger-action" onClick={confirmCancel}>
                {translate(language, 'status.confirmCancel')}
              </button>
            </div>
          </section>
        </div>
      )}
    </StatusPageShell>
  );
}

function StatusPageShell({
  language,
  connectionLost,
  children,
}: StatusScreenProps & { connectionLost: boolean; children: ReactNode }) {
  return (
    <main className="app-shell status-screen">
      {connectionLost && (
        <div className="connection-banner" role="status">
          {translate(language, 'net.lost')}
        </div>
      )}
      <header className="top-bar">
        <Link className="brand" to="/" aria-label="LateCuts home">
          <span className="logo-mark" aria-hidden="true">◈</span>
          <span>LateCuts</span>
        </Link>
        <h1 className="screen-title">{translate(language, 'status.title')}</h1>
        <button
          type="button"
          className="language-toggle"
          aria-label={language === 'en' ? 'Switch to Gujarati' : 'Switch to English'}
          onClick={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
            detail: language === 'en' ? 'gu' : 'en',
          }))}
        >
          {translate(language, 'app.langToggle')}
        </button>
      </header>
      {children}
    </main>
  );
}

function ProgressStepper({ currentStatus, language }: { currentStatus: 'Waiting' | 'Called' | 'In chair' | 'Done'; language: Language }) {
  const currentIndex = statusSteps.indexOf(currentStatus);
  return (
    <div className="status-stepper" aria-label="Status progress">
      {statusSteps.map((status, index) => (
        <div className={`status-step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'complete' : ''}`} key={status}>
          <span className="status-step-marker" aria-hidden="true" />
          <span>
            {status === 'Waiting' && translate(language, 'status.progressWaiting')}
            {status === 'Called' && translate(language, 'status.progressCalled')}
            {status === 'In chair' && translate(language, 'status.progressInChair')}
            {status === 'Done' && translate(language, 'status.progressDone')}
          </span>
        </div>
      ))}
    </div>
  );
}

function FinalStatusSymbol({ status }: { status: SpotStatus }) {
  return (
    <div className={`final-status-symbol final-status-${status.toLowerCase().replace(' ', '-')}`} aria-hidden="true">
      {status === 'Done' ? '✓' : status === 'Cancelled' ? '×' : '!'}
    </div>
  );
}

function getPositionLabel(position: number, language: Language): string {
  if (position === 1) return translate(language, 'status.position1');
  if (position === 2) return translate(language, 'status.position2');
  if (position === 3) return translate(language, 'status.position3');
  if (position === 4) return translate(language, 'status.position4');
  return translate(language, 'status.positionN', { n: position });
}

function formatJoinedTime(joinedAt: string): string {
  if (!joinedAt) return '';
  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
