import { FormEvent, useEffect, useState } from 'react';
import { BrandTopBar, Skeleton, Toast } from '../components/DesignSystem';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { translate, type Language } from '../i18n';

type OwnerProps = {
  language: Language;
};

type Service = {
  id: string;
  name_en: string;
  name_gu: string;
  duration_minutes: number;
  price_rupees: number;
  enabled: boolean;
};

type Barber = {
  id: string;
  name: string;
  on_duty_today: boolean;
  on_break: boolean;
};

export function OwnerScreen({ language }: OwnerProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [closingTime, setClosingTime] = useState('21:00');
  const [services, setServices] = useState<Service[]>([
    { id: 'haircut', name_en: 'Haircut', name_gu: 'વાળ કાપવા', duration_minutes: 30, price_rupees: 150, enabled: true },
    { id: 'beard', name_en: 'Beard trim', name_gu: 'દાઢી ટ્રિમ', duration_minutes: 15, price_rupees: 80, enabled: true },
    { id: 'spa', name_en: 'Hair spa', name_gu: 'હેર સ્પા', duration_minutes: 45, price_rupees: 400, enabled: true },
  ]);
  const [barbers, setBarbers] = useState<Barber[]>([
    { id: 'ravi', name: 'Ravi', on_duty_today: true, on_break: false },
    { id: 'amit', name: 'Amit', on_duty_today: true, on_break: false },
    { id: 'imran', name: 'Imran', on_duty_today: true, on_break: true },
  ]);
  const [summary, setSummary] = useState({
    waiting: 6,
    called: 2,
    in_chair: 2,
    done: 14,
    no_shows: 1,
  });

  useEffect(() => {
    if (sessionStorage.getItem('latecuts-owner-session')) setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadOwner();
  }, [unlocked]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadOwner = async () => {
    setLoading(true);
    setError('');
    if (supabaseConfigured && supabase) {
      const { data, error: rpcError } = await supabase.rpc('owner_dashboard');
      if (rpcError) {
        setError(rpcError.message);
        setConnectionLost(true);
      } else if (data) {
        const ownerData = data as {
          settings: { online_joining_open: boolean; closing_time: string };
          services: Service[];
          barbers: Barber[];
          summary: typeof summary;
        };
        setOnlineOpen(ownerData.settings.online_joining_open);
        setClosingTime(String(ownerData.settings.closing_time).slice(0, 5));
        setServices(ownerData.services);
        setBarbers(ownerData.barbers);
        setSummary(ownerData.summary);
        setConnectionLost(false);
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    setLoading(false);
  };

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) {
      setPinError(translate(language, 'staff.wrongPin'));
      setPin('');
      return;
    }

    if (supabaseConfigured && supabase) {
      const { data, error: rpcError } = await supabase.rpc('staff_login', {
        p_pin: pin,
        p_attempt_key: 'owner',
      });
      if (rpcError) {
        setPinError(translate(language, 'staff.wrongPin'));
        setPin('');
        return;
      }
      sessionStorage.setItem('latecuts-owner-session', JSON.stringify(data));
    } else {
      sessionStorage.setItem('latecuts-owner-session', JSON.stringify({
        session_id: 'dummy-owner',
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      }));
    }
    setUnlocked(true);
    setPin('');
  };

  const lock = () => {
    sessionStorage.removeItem('latecuts-owner-session');
    setUnlocked(false);
  };

  const saveOpenClose = async () => {
    setError('');
    if (supabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('update_owner_settings', {
        p_online_joining_open: onlineOpen,
        p_closing_time: closingTime,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
    }
    setToast('Saved');
  };

  const toggleService = async (service: Service) => {
    const nextEnabled = !service.enabled;
    if (services.filter((item) => item.enabled).length === 1 && service.enabled) {
      setError('At least one service must stay on.');
      return;
    }
    setError('');
    setServices((current) => current.map((item) => item.id === service.id
      ? { ...item, enabled: nextEnabled }
      : item));
    if (supabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('update_owner_service', {
        p_service_id: service.id,
        p_enabled: nextEnabled,
        p_duration_minutes: null,
      });
      if (rpcError) {
        setError(rpcError.message);
        setServices((current) => current.map((item) => item.id === service.id
          ? { ...item, enabled: service.enabled }
          : item));
        return;
      }
    }
    setToast('Saved');
  };

  const toggleBarber = async (barber: Barber) => {
    const nextDuty = !barber.on_duty_today;
    setError('');
    setBarbers((current) => current.map((item) => item.id === barber.id
      ? { ...item, on_duty_today: nextDuty }
      : item));
    if (supabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('update_owner_barber', {
        p_barber_id: barber.id,
        p_on_duty_today: nextDuty,
        p_on_break: barber.on_break,
      });
      if (rpcError) {
        setError(rpcError.message);
        setBarbers((current) => current.map((item) => item.id === barber.id
          ? { ...item, on_duty_today: barber.on_duty_today }
          : item));
        return;
      }
    }
    setToast('Saved');
  };

  if (!unlocked) {
    return (
      <main className="app-shell staff-screen owner-screen">
        <BrandTopBar
          language={language}
          title="Owner"
          onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
            detail: language === 'en' ? 'gu' : 'en',
          }))}
        />
        <section className="staff-pin-state">
          <span className="staff-pin-kicker">LateCuts</span>
          <h1>{translate(language, 'staff.access')}</h1>
          <form onSubmit={unlock} className="staff-pin-form">
            <label htmlFor="owner-pin">{translate(language, 'staff.pin')}</label>
            <input
              id="owner-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              inputMode="numeric"
              type="password"
              maxLength={4}
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
    <main className="app-shell staff-screen owner-screen">
      <BrandTopBar
        language={language}
        title="Owner"
        onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
          detail: language === 'en' ? 'gu' : 'en',
        }))}
        lock={(
          <button type="button" className="lock-button" onClick={lock}>
            {translate(language, 'staff.lock')}
          </button>
        )}
      />

      <div className="owner-toolbar">
        <div>
          <span className="owner-kicker">LateCuts</span>
          <h1>Owner dashboard</h1>
        </div>
      </div>

      {loading ? (
        <section className="owner-grid" aria-label="Loading">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </section>
      ) : (
        <section className="owner-grid">
          {error && <p className="field-error owner-error">{error}</p>}

          <article className="owner-card owner-summary">
            <h2>Today</h2>
            <div className="owner-summary-grid">
              <div><strong>{summary.waiting}</strong><span>Waiting</span></div>
              <div><strong>{summary.called}</strong><span>Called</span></div>
              <div><strong>{summary.done}</strong><span>Done</span></div>
              <div><strong>{summary.no_shows}</strong><span>No-shows</span></div>
            </div>
          </article>

          <article className="owner-card">
            <h2>Queue control</h2>
            <button
              type="button"
              className={`owner-open-toggle ${onlineOpen ? 'on' : ''}`}
              onClick={() => setOnlineOpen((value) => !value)}
              aria-pressed={onlineOpen}
            >
              <span>{onlineOpen ? 'Online joining: Open' : 'Online joining: Closed'}</span>
              <span className="toggle-track" aria-hidden="true"><span /></span>
            </button>
            <label className="owner-time">
              Closing time
              <input
                type="time"
                value={closingTime}
                onChange={(event) => setClosingTime(event.target.value)}
              />
            </label>
            <button type="button" className="primary-button" onClick={() => void saveOpenClose()}>
              Save
            </button>
          </article>

          <article className="owner-card">
            <h2>Services</h2>
            <div className="owner-services">
              {services.map((service) => (
                <div className="owner-service-row" key={service.id}>
                  <div>
                    <strong>{language === 'en' ? service.name_en : service.name_gu}</strong>
                    <span>{service.duration_minutes} min · ₹{service.price_rupees}</span>
                  </div>
                  <button
                    type="button"
                    className={`owner-toggle ${service.enabled ? 'on' : ''}`}
                    aria-pressed={service.enabled}
                    onClick={() => void toggleService(service)}
                  >
                    {service.enabled ? 'On' : 'Off'}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="owner-card">
            <h2>Barbers</h2>
            <div className="owner-barbers">
              {barbers.map((barber) => (
                <div className="owner-barber-row" key={barber.id}>
                  <div>
                    <strong>{barber.name}</strong>
                    <span>{barber.on_break ? 'On break' : 'Available'}</span>
                  </div>
                  <button
                    type="button"
                    className={`owner-toggle ${barber.on_duty_today ? 'on' : ''}`}
                    aria-pressed={barber.on_duty_today}
                    onClick={() => void toggleBarber(barber)}
                  >
                    {barber.on_duty_today ? 'On duty' : 'Off duty'}
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {toast && <Toast>{toast}</Toast>}
    </main>
  );
}
