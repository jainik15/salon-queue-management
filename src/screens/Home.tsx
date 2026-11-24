import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { translate, type Language } from '../i18n';
import { BrandLockup, EmptyChairIllustration } from '../components/DesignSystem';

type HomeScreenProps = {
  language: Language;
};

type ActiveSpot = {
  id: string;
  token: string;
  status?: 'Waiting' | 'Called' | 'In chair' | 'Done' | 'Cancelled' | 'No-show';
};

const dummyBarbers = [
  { name: 'Ravi', state: 'busy' as const },
  { name: 'Amit', state: 'free' as const },
  { name: 'Imran', state: 'break' as const },
];

export function HomeScreen({ language }: HomeScreenProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [activeSpot, setActiveSpot] = useState<ActiveSpot | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    const updateConnection = () => setConnectionLost(!navigator.onLine);
    updateConnection();

    const storedSpot = window.localStorage.getItem('latecuts-active-spot');
    if (storedSpot) {
      try {
        const parsed = JSON.parse(storedSpot) as ActiveSpot;
        if (parsed.status && ['Done', 'Cancelled', 'No-show'].includes(parsed.status)) {
          setActiveSpot(null);
        } else {
          setActiveSpot(parsed);
        }
      } catch {
        window.localStorage.removeItem('latecuts-active-spot');
        setActiveSpot(null);
      }
    }
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const retry = () => {
    setLoadError(false);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 350);
  };

  const barberStateText = (state: 'busy' | 'free' | 'break') => {
    if (state === 'busy') return translate(language, 'barber.state.busy');
    if (state === 'free') return translate(language, 'barber.state.free');
    return translate(language, 'barber.onBreak');
  };

  return (
    <main className="app-shell home-screen">
      {connectionLost && (
        <div className="connection-banner" role="status">
          {translate(language, 'net.lost')}
        </div>
      )}
      <header className="top-bar">
        <Link className="brand" to="/" aria-label="LateCuts home">
          <img className="brand-mark" src="/brand/logo-mark.svg" alt="" />
          <span className="brand-name"><span>Late</span><strong>Cuts</strong></span>
        </Link>
        <h1 className="screen-title" aria-hidden="true" />
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

      {loading ? (
        <section className="home-content" aria-label="Loading">
          <div className="home-skeleton skeleton-open" />
          <div className="home-skeleton skeleton-live" />
          <div className="home-skeleton skeleton-chips" />
          <div className="home-skeleton skeleton-button" />
        </section>
      ) : loadError ? (
        <section className="home-content home-error">
          <h2>{translate(language, 'home.loadingError')}</h2>
          <button type="button" className="primary-button" onClick={retry}>
            {translate(language, 'home.tryAgain')}
          </button>
        </section>
      ) : (
        <section className="home-content">
          <div className="home-main-board">
            <div className="open-status">
              <span className="status-dot success-dot" aria-hidden="true" />
              {translate(language, 'home.open', { time: '9 PM' })}
            </div>

            <article className="live-card">
              <div className="live-ticket-label">
                <span>LateCuts</span>
                <span>QUEUE BOARD</span>
              </div>
              <h2>
                <strong>{6}</strong>
                <span>{translate(language, 'home.waiting', { count: '' }).replace(' ', '')}</span>
              </h2>
              <p>{translate(language, 'estimate.about', { time: '50 min' })}</p>
              <div className={`live-indicator ${connectionLost ? 'reconnecting' : ''}`}>
                <span className="live-dot" aria-hidden="true" />
                {translate(language, connectionLost ? 'home.reconnecting' : 'home.live')}
              </div>
            </article>

            <div className="barber-chips" aria-label="Barbers">
              {dummyBarbers.map((barber) => (
                <span className={`barber-chip barber-${barber.state}`} key={barber.name}>
                  <span className="barber-name">{barber.name}</span>
                  <span className={`barber-dot barber-dot-${barber.state}`} aria-hidden="true" />
                  <span>{barberStateText(barber.state)}</span>
                </span>
              ))}
            </div>
          </div>

          <aside className="home-action-panel">
            {activeSpot ? (
              <article className="active-spot-card">
                <span className="active-spot-label">Your ticket</span>
                <strong className="active-spot-token">{activeSpot.token}</strong>
                <p>
                  {translate(language, 'home.activeSpot', {
                    token: activeSpot.token,
                    position: translate(language, 'home.positionFourth'),
                  })}
                </p>
                <Link className="primary-button text-button" to={`/status/${activeSpot.id}`}>
                  {translate(language, 'home.viewStatus')}
                </Link>
              </article>
            ) : (
              <article className="home-empty-ticket">
                <EmptyChairIllustration />
              </article>
            )}
            <Link className="primary-button join-button" to="/join">
              {translate(language, 'home.join')}
            </Link>
          </aside>
        </section>
      )}
    </main>
  );
}
