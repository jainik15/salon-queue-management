import { FormEvent, useEffect, useState } from 'react';
import { BrandTopBar, ConfirmDialog, Skeleton, Toast } from '../components/DesignSystem';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { translate, type Language } from '../i18n';

type BarberProps = {
  language: Language;
  barberName: string;
};

type CurrentCustomer = {
  id: string;
  token: string;
  name: string;
  status: 'Called' | 'In chair';
  called_at?: string;
  started_at?: string;
  total_minutes: number;
  services: Array<{ name_en: string; name_gu: string }>;
};

type NextCustomer = {
  id: string;
  token: string;
  name: string;
  total_minutes: number;
  services: Array<{ name_en: string; name_gu: string }>;
};

export function BarberScreen({ language, barberName }: BarberProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [current, setCurrent] = useState<CurrentCustomer | null>(null);
  const [next, setNext] = useState<NextCustomer | null>(null);
  const [servedToday, setServedToday] = useState(7);

  useEffect(() => {
    if (sessionStorage.getItem('latecuts-barber-session')) setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadQueue();

    const updateConnection = () => setConnectionLost(!navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [unlocked, barberName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadQueue = async () => {
    setLoading(true);
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('barber_queue', {
        p_barber_id: barberName.toLowerCase(),
      });
      if (!error && data) {
        const result = data as {
          barber: { on_break: boolean };
          current: CurrentCustomer | null;
          next: NextCustomer | null;
        };
        setOnBreak(result.barber.on_break);
        setCurrent(result.current);
        setNext(result.next);
      } else {
        setConnectionLost(true);
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setOnBreak(barberName.toLowerCase() === 'imran');
      setCurrent(barberName.toLowerCase() === 'ravi'
        ? {
            id: 'dummy-current',
            token: 'S-10',
            name: 'Dev',
            status: 'In chair',
            started_at: new Date().toISOString(),
            total_minutes: 45,
            services: [{ name_en: 'Haircut', name_gu: 'વાળ કાપવા' }],
          }
        : null);
      setNext({
        id: 'dummy-next',
        token: 'S-15',
        name: 'Kunal',
        total_minutes: 30,
        services: [{ name_en: 'Haircut', name_gu: 'વાળ કાપવા' }],
      });
    }
    setLoading(false);
  };

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) {
      setPinError(translate(language, 'staff.wrongPin'));
      setPin('');
      return;
    }
    sessionStorage.setItem('latecuts-barber-session', JSON.stringify({
      barber: barberName,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    }));
    setUnlocked(true);
    setPinError('');
  };

  const lock = () => {
    sessionStorage.removeItem('latecuts-barber-session');
    setUnlocked(false);
  };

  const startService = async () => {
    if (!current || connectionLost) return;
    if (supabaseConfigured && supabase) {
      const { error } = await supabase.rpc('start_service', { p_spot_id: current.id });
      if (error) {
        setToast(error.message || 'That can’t be done right now.');
        return;
      }
    }
    setCurrent((value) => value ? {
      ...value,
      status: 'In chair',
      started_at: new Date().toISOString(),
    } : value);
    setToast(`Started ${current.token}`);
  };

  const doneService = async () => {
    if (!current) return;
    if (supabaseConfigured && supabase) {
      const { error } = await supabase.rpc('done_service', { p_spot_id: current.id });
      if (error) {
        setToast(error.message || 'That can’t be done right now.');
        setConfirmDone(false);
        return;
      }
    }
    setCurrent(null);
    setServedToday((value) => value + 1);
    setConfirmDone(false);
    setToast('Service done');
    await loadQueue();
  };

  const toggleBreak = async () => {
    if (current) {
      setToast(translate(language, 'barber.finishFirst'));
      return;
    }
    if (supabaseConfigured && supabase) {
      const { error } = await supabase.rpc('set_break', {
        p_barber_id: barberName.toLowerCase(),
        p_on_break: !onBreak,
      });
      if (error) {
        setToast(error.message || 'That can’t be done right now.');
        return;
      }
    }
    setOnBreak((value) => !value);
  };

  if (!unlocked) {
    return (
      <main className="app-shell staff-screen barber-screen">
        <BrandTopBar
          language={language}
          title={barberName}
          onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
            detail: language === 'en' ? 'gu' : 'en',
          }))}
        />
        <section className="staff-pin-state">
          <span className="staff-pin-kicker">LateCuts</span>
          <h1>{translate(language, 'staff.access')}</h1>
          <form onSubmit={unlock} className="staff-pin-form">
            <label htmlFor="barber-pin">{translate(language, 'staff.pin')}</label>
            <input
              id="barber-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              aria-invalid={Boolean(pinError)}
            />
            {pinError && <p className="field-error">{pinError}</p>}
            <button type="submit" className="primary-button">
              {translate(language, 'staff.unlock')}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell staff-screen barber-screen">
      {connectionLost && (
        <div className="connection-banner" role="status">
          {translate(language, 'net.lost')}
        </div>
      )}
      <BrandTopBar
        language={language}
        title={barberName}
        onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
          detail: language === 'en' ? 'gu' : 'en',
        }))}
        lock={(
          <button type="button" className="lock-button" onClick={lock}>
            {translate(language, 'staff.lock')}
          </button>
        )}
      />

      {loading ? (
        <section className="barber-layout" aria-label="Loading">
          <Skeleton variant="ticket" />
          <Skeleton variant="card" />
        </section>
      ) : (
        <section className="barber-layout">
          <div className="barber-main">
            <div className={`barber-state-heading barber-state-${onBreak ? 'break' : current ? 'busy' : 'free'}`}>
              <span className="barber-state-dot" aria-hidden="true" />
              <strong>{onBreak ? translate(language, 'barber.onBreak') : current ? translate(language, 'barber.state.busy') : translate(language, 'barber.state.free')}</strong>
            </div>

            {current ? (
              <article className="barber-current-card">
                <span className="barber-current-label">{current.status}</span>
                <strong className="barber-current-token">{current.token}</strong>
                <h2>{current.name}</h2>
                <p>
                  {current.services.map((service) => language === 'en'
                    ? service.name_en
                    : service.name_gu).join(' + ')}
                </p>
              </article>
            ) : (
              <article className="barber-current-card barber-current-empty">
                <p>No customer right now.</p>
              </article>
            )}

            {current?.status === 'Called' ? (
              <button
                type="button"
                className="primary-button barber-action-button"
                disabled={connectionLost}
                onClick={() => void startService()}
              >
                {translate(language, 'barber.start')}
              </button>
            ) : current?.status === 'In chair' ? (
              <button
                type="button"
                className="primary-button barber-action-button"
                disabled={connectionLost}
                onClick={() => setConfirmDone(true)}
              >
                {translate(language, 'barber.done')}
              </button>
            ) : (
              <button type="button" className="primary-button barber-action-button" disabled>
                {translate(language, 'barber.start')}
              </button>
            )}
          </div>

          <aside className="barber-side">
            <h2>Next for you</h2>
            {next ? (
              <article className="barber-next-card">
                <strong>{next.token}</strong>
                <span>{next.name}</span>
                <p>
                  {next.services.map((service) => language === 'en'
                    ? service.name_en
                    : service.name_gu).join(' + ')}
                </p>
              </article>
            ) : (
              <p>No customers waiting for you.</p>
            )}

            <button
              type="button"
              className="barber-break-toggle"
              onClick={() => void toggleBreak()}
              disabled={Boolean(current)}
              aria-pressed={onBreak}
            >
              <span>{translate(language, 'barber.onBreak')}</span>
              <span className={`toggle-track ${onBreak ? 'on' : ''}`} aria-hidden="true">
                <span />
              </span>
            </button>
            {current && <p className="disabled-reason">{translate(language, 'barber.finishFirst')}</p>}
            <p className="served-counter">You've served {servedToday} today</p>
          </aside>
        </section>
      )}

      {toast && <Toast tone="success">{toast}</Toast>}

      {confirmDone && current && (
        <ConfirmDialog
          title={`Mark ${current.token} as done?`}
          consequence="A wrong Done cannot be undone."
          safeLabel="No"
          riskyLabel="Yes, done"
          onSafe={() => setConfirmDone(false)}
          onRisky={() => void doneService()}
        />
      )}
    </main>
  );
}
