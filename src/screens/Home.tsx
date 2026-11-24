import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { translate, type Language } from '../i18n';

type HomeScreenProps = {
  language: Language;
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

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    const updateConnection = () => setConnectionLost(!navigator.onLine);

    updateConnection();
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
          <span className="logo-mark" aria-hidden="true">◈</span>
          <span>LateCuts</span>
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
          <div className="open-status">
            <span className="status-dot success-dot" aria-hidden="true" />
            {translate(language, 'home.open', { time: '9 PM' })}
          </div>

          <article className="active-spot-card">
            <p>
              {translate(language, 'home.activeSpot', {
                token: 'S-14',
                position: translate(language, 'home.positionFourth'),
              })}
            </p>
            <Link className="text-button" to="/status/demo">
              {translate(language, 'home.viewStatus')}
            </Link>
          </article>

          <article className="live-card">
            <h2>{translate(language, 'home.waiting', { count: 6 })}</h2>
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

          <Link className="primary-button join-button" to="/join">
            {translate(language, 'home.join')}
          </Link>
        </section>
      )}
    </main>
  );
}
