import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { getSavedLanguage, saveLanguage, translate, type Language } from './i18n';
import { HomeScreen } from './screens/Home';
import { JoinScreen } from './screens/Join';

type AppPageProps = {
  language: Language;
  title: string;
};

function TopBar({ language, title }: AppPageProps) {
  return (
    <header className="top-bar">
      <Link className="brand" to="/" aria-label="LateCuts home">
        <span className="logo-mark" aria-hidden="true">◈</span>
        <span>LateCuts</span>
      </Link>
      <h1 className="screen-title">{title}</h1>
      <LanguageToggle language={language} />
    </header>
  );
}

function LanguageToggle({ language }: { language: Language }) {
  return (
    <button
      type="button"
      className="language-toggle"
      aria-label={language === 'en' ? 'Switch to Gujarati' : 'Switch to English'}
      onClick={() => window.dispatchEvent(new CustomEvent<Language>('language-change', { detail: language === 'en' ? 'gu' : 'en' }))}
    >
      {translate(language, 'app.langToggle')}
    </button>
  );
}

function EmptyPage({ language, title }: AppPageProps) {
  return (
    <main className="app-shell">
      <TopBar language={language} title={title} />
      <section className="empty-page">
        <div className="placeholder-icon" aria-hidden="true">◈</div>
      </section>
    </main>
  );
}

function NotFound({ language }: { language: Language }) {
  return (
    <main className="app-shell">
      <TopBar language={language} title={translate(language, 'common.emptyPage')} />
      <section className="empty-page">
        <h2>{translate(language, 'common.emptyPage')}</h2>
        <Link className="primary-button" to="/">
          {translate(language, 'common.home')}
        </Link>
      </section>
    </main>
  );
}

function BarberPage({ language }: { language: Language }) {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/')[2] ?? '');
  return <EmptyPage language={language} title={name || 'Barber'} />;
}

function StatusPage({ language }: { language: Language }) {
  const location = useLocation();
  const state = location.state as { existingSpotToken?: string; newSpotToken?: string } | null;
  const token = state?.existingSpotToken ?? state?.newSpotToken;
  const spotId = decodeURIComponent(location.pathname.split('/')[2] ?? '');
  const storedSpotJson = window.localStorage.getItem('latecuts-active-spot');
  let storedSpotId = '';

  if (storedSpotJson) {
    try {
      storedSpotId = (JSON.parse(storedSpotJson) as { id?: string }).id ?? '';
    } catch {
      storedSpotId = '';
    }
  }

  if ((!storedSpotId || spotId !== storedSpotId) && !state) {
    return (
      <main className="app-shell">
        <TopBar language={language} title={translate(language, 'status.title')} />
        <section className="empty-page">
          <h2>{translate(language, 'status.notFound')}</h2>
          <Link className="primary-button" to="/">
            {translate(language, 'common.home')}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <TopBar language={language} title={translate(language, 'status.title')} />
      <section className="empty-page">
        {token && state?.existingSpotToken ? (
          <h2>{translate(language, 'join.existing', { token })}</h2>
        ) : token ? (
          <h2>{token}</h2>
        ) : (
          <h2>{translate(language, 'status.waiting')}</h2>
        )}
        <Link className="primary-button" to="/">
          {translate(language, 'common.home')}
        </Link>
      </section>
    </main>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(getSavedLanguage);

  const changeLanguage = (nextLanguage: Language) => {
    saveLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  useEffect(() => {
    const languageChangeHandler = (event: Event) => {
      changeLanguage((event as CustomEvent<Language>).detail);
    };

    window.addEventListener('language-change', languageChangeHandler);
    return () => window.removeEventListener('language-change', languageChangeHandler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen language={language} />} />
        <Route path="/join" element={<JoinScreen language={language} />} />
        <Route path="/status/:id" element={<StatusPage language={language} />} />
        <Route path="/reception" element={<EmptyPage language={language} title="Reception" />} />
        <Route path="/barber/:name" element={<BarberPage language={language} />} />
        <Route path="/display" element={<EmptyPage language={language} title="LateCuts" />} />
        <Route path="/admin" element={<EmptyPage language={language} title="Owner Settings" />} />
        <Route path="*" element={<NotFound language={language} />} />
      </Routes>
    </BrowserRouter>
  );
}
