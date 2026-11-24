import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { translate, type Language } from '../i18n';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { normalizePhone, validateJoinName, validateJoinPhone } from '../rules/queue';
import { BarberCard, BrandTopBar, ConfirmDialog, Skeleton, Toast } from '../components/DesignSystem';

type ReceptionProps = {
  language: Language;
};

type Barber = {
  id: string;
  name: string;
  on_duty_today: boolean;
  on_break: boolean;
};

type QueueSpot = {
  id: string;
  token: string;
  name: string;
  phone: string;
  status: 'Waiting' | 'Called';
  preference?: string;
  assigned_barber_id?: string;
  called_at?: string;
  total_minutes: number;
  joined_at?: string;
};

type QueueData = {
  barbers: Barber[];
  waiting: QueueSpot[];
  called: QueueSpot[];
};

const dummyQueue: QueueData = {
  barbers: [
    { id: 'ravi', name: 'Ravi', on_duty_today: true, on_break: false },
    { id: 'amit', name: 'Amit', on_duty_today: true, on_break: false },
    { id: 'imran', name: 'Imran', on_duty_today: true, on_break: true },
  ],
  waiting: [
    { id: 's1', token: 'S-12', name: 'Meera', phone: '9876543210', status: 'Waiting', preference: 'Any', total_minutes: 30, joined_at: new Date().toISOString() },
    { id: 's2', token: 'S-13', name: 'Dev', phone: '9876543211', status: 'Waiting', preference: 'Ravi', total_minutes: 45, joined_at: new Date().toISOString() },
  ],
  called: [
    { id: 's3', token: 'S-11', name: 'Priya', phone: '9876543212', status: 'Called', assigned_barber_id: 'amit', called_at: new Date().toISOString(), total_minutes: 30 },
  ],
};

export function ReceptionScreen({ language }: ReceptionProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmSpot, setConfirmSpot] = useState<QueueSpot | null>(null);
  const [confirmType, setConfirmType] = useState<'cancel' | 'noShow' | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  useEffect(() => {
    const existing = sessionStorage.getItem('latecuts-staff-session');
    if (existing) setUnlocked(true);
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
  }, [unlocked]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= lockedUntil) setLockedUntil(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const loadQueue = async () => {
    setLoading(true);
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('reception_queue');
      if (!error && data) {
        setQueue(data as QueueData);
      } else {
        setConnectionLost(true);
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setQueue(dummyQueue);
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
      const { data, error } = await supabase.rpc('staff_login', {
        p_pin: pin,
        p_attempt_key: 'reception',
      });
      if (error) {
        setPinError(translate(language, 'staff.wrongPin'));
        setPin('');
        return;
      }
      const session = data as { session_id: string; session_token: string; expires_at: string };
      sessionStorage.setItem('latecuts-staff-session', JSON.stringify(session));
      setUnlocked(true);
      setPin('');
      setPinError('');
      return;
    }

    sessionStorage.setItem('latecuts-staff-session', JSON.stringify({
      session_id: 'dummy',
      session_token: 'dummy',
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    }));
    setUnlocked(true);
  };

  const lock = () => {
    sessionStorage.removeItem('latecuts-staff-session');
    setUnlocked(false);
  };

  const callNext = async (barber: Barber) => {
    if (connectionLost) return;
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('call_next', { p_barber_id: barber.id });
      if (error) {
        setToast(error.message || 'That can’t be done right now.');
        await loadQueue();
        return;
      }
      const result = data as { token: string };
      setToast(`Called ${result.token}`);
      await loadQueue();
      return;
    }

    const candidate = queue?.waiting[0];
    if (!candidate) return;
    setQueue((current) => current ? {
      ...current,
      waiting: current.waiting.filter((spot) => spot.id !== candidate.id),
      called: [...current.called, { ...candidate, status: 'Called', assigned_barber_id: barber.id, called_at: new Date().toISOString() }],
    } : current);
    setToast(`Called ${candidate.token}`);
  };

  const confirmMove = async () => {
    if (!confirmSpot || !confirmType) return;
    if (supabaseConfigured && supabase) {
      const rpcName = confirmType === 'cancel' ? 'cancel_waiting' : 'mark_no_show';
      const args = confirmType === 'cancel'
        ? { p_spot_id: confirmSpot.id, p_customer_capability: null }
        : { p_spot_id: confirmSpot.id };
      const { error } = await supabase.rpc(rpcName, args);
      if (error) {
        setToast(error.message || 'That can’t be done right now.');
      } else {
        setToast(confirmType === 'cancel' ? `Cancelled ${confirmSpot.token}` : `Marked ${confirmSpot.token} as no-show`);
        await loadQueue();
      }
    } else {
      setQueue((current) => current ? {
        ...current,
        waiting: confirmType === 'cancel'
          ? current.waiting.filter((spot) => spot.id !== confirmSpot.id)
          : current.waiting,
        called: confirmType === 'noShow'
          ? current.called.filter((spot) => spot.id !== confirmSpot.id)
          : current.called,
      } : current);
      setToast(confirmType === 'cancel'
        ? `Cancelled ${confirmSpot.token}`
        : `Marked ${confirmSpot.token} as no-show`);
    }
    setConfirmSpot(null);
    setConfirmType(null);
  };

  if (!unlocked) {
    return (
      <main className="app-shell staff-screen reception-screen">
        <BrandTopBar
          language={language}
          title={translate(language, 'reception.title')}
          onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
            detail: language === 'en' ? 'gu' : 'en',
          }))}
        />
        <section className="staff-pin-state">
          <span className="staff-pin-kicker">LateCuts</span>
          <h1>{translate(language, 'staff.access')}</h1>
          <form onSubmit={unlock} className="staff-pin-form">
            <label htmlFor="staff-pin">{translate(language, 'staff.pin')}</label>
            <input
              id="staff-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              inputMode="numeric"
              type="password"
              maxLength={4}
              aria-invalid={Boolean(pinError)}
            />
            {pinError && <p className="field-error">{pinError}</p>}
            {lockedUntil && <p className="field-error">Locked for 30 seconds</p>}
            <button type="submit" className="primary-button">
              {translate(language, 'staff.unlock')}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell staff-screen reception-screen">
      {connectionLost && (
        <div className="connection-banner" role="status">
          {translate(language, 'net.lost')}
        </div>
      )}
      <BrandTopBar
        language={language}
        title={translate(language, 'reception.title')}
        onLanguageChange={() => window.dispatchEvent(new CustomEvent<Language>('language-change', {
          detail: language === 'en' ? 'gu' : 'en',
        }))}
        lock={(
          <button type="button" className="lock-button" onClick={lock}>
            {translate(language, 'staff.lock')}
          </button>
        )}
      />

      <div className="reception-toolbar">
        <div>
          <span className="reception-kicker">Reception</span>
          <h1>{translate(language, 'reception.queueTitle')}</h1>
        </div>
        <button type="button" className="primary-button" onClick={() => setWalkInOpen(true)}>
          + {translate(language, 'reception.addWalkIn')}
        </button>
      </div>

      {loading || !queue ? (
        <section className="reception-layout" aria-label="Loading">
          <div className="reception-barbers"><Skeleton variant="card" /><Skeleton variant="card" /></div>
          <div className="reception-queue"><Skeleton variant="row" /><Skeleton variant="row" /><Skeleton variant="row" /></div>
        </section>
      ) : (
        <section className="reception-layout">
          <div className="reception-barbers">
            {queue.barbers.map((barber) => {
              const busySpot = queue.called.find((spot) => spot.assigned_barber_id === barber.id);
              const state = barber.on_break
                ? 'break'
                : busySpot
                  ? 'busy'
                  : 'free';
              return (
                <BarberCard
                  key={barber.id}
                  name={barber.name}
                  state={state}
                  detail={busySpot ? `${busySpot.token} · ${busySpot.status}` : 'No customer'}
                  progress={busySpot ? 45 : undefined}
                >
                  <button
                    type="button"
                    className="primary-button call-next-button"
                    disabled={connectionLost || barber.on_break || Boolean(busySpot)}
                    onClick={() => void callNext(barber)}
                  >
                    {translate(language, 'reception.callNext')}
                  </button>
                  {(barber.on_break || busySpot) && (
                    <p className="disabled-reason">
                      {barber.on_break ? 'On break' : 'Busy'}
                    </p>
                  )}
                </BarberCard>
              );
            })}
          </div>

          <div className="reception-queue">
            <div className="queue-heading">
              <h2>{translate(language, 'reception.waiting')}</h2>
              <span>{queue.waiting.length}</span>
            </div>
            {queue.called.length > 0 && (
              <>
                <h3>Called</h3>
                {queue.called.map((spot) => (
                  <article className="queue-row queue-row-called" key={spot.id}>
                    <div>
                      <strong className="queue-token">{spot.token}</strong>
                      <span>{spot.name}</span>
                    </div>
                    <span>{spot.status}</span>
                    <button
                      type="button"
                      className="danger-button no-show-button"
                      onClick={() => {
                        setConfirmSpot(spot);
                        setConfirmType('noShow');
                      }}
                    >
                      {translate(language, 'reception.noShow')}
                    </button>
                  </article>
                ))}
              </>
            )}
            {queue.waiting.length === 0 ? (
              <div className="queue-empty">No one waiting — walk right in!</div>
            ) : (
              queue.waiting.map((spot) => (
                <article className="queue-row" key={spot.id}>
                  <div>
                    <strong className="queue-token">{spot.token}</strong>
                    <span>{spot.name}</span>
                  </div>
                  <div className="queue-row-meta">
                    <span>{spot.preference ?? 'Any'}</span>
                    <span>{spot.total_minutes} min</span>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setConfirmSpot(spot);
                      setConfirmType('cancel');
                    }}
                  >
                    {translate(language, 'reception.cancel')}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {toast && <Toast tone="success">{toast}</Toast>}

      {confirmSpot && confirmType && (
        <ConfirmDialog
          title={confirmType === 'cancel'
            ? `Cancel ${confirmSpot.token}?`
            : `Mark ${confirmSpot.token} as no-show?`}
          consequence={confirmType === 'cancel'
            ? 'They will leave the queue.'
            : 'Their spot will close.'}
          safeLabel="No"
          riskyLabel={confirmType === 'cancel' ? 'Yes, cancel' : 'Yes'}
          onSafe={() => {
            setConfirmSpot(null);
            setConfirmType(null);
          }}
          onRisky={() => void confirmMove()}
        />
      )}

      {walkInOpen && (
        <WalkInDialog
          language={language}
          onClose={() => setWalkInOpen(false)}
          onSuccess={(token) => {
            setWalkInOpen(false);
            setToast(`Added as ${token}`);
            void loadQueue();
          }}
        />
      )}
    </main>
  );
}

function WalkInDialog({
  language,
  onClose,
  onSuccess,
}: {
  language: Language;
  onClose: () => void;
  onSuccess: (token: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedService, setSelectedService] = useState('haircut');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateJoinName(name)) {
      setError(translate(language, 'join.nameError'));
      return;
    }
    if (!validateJoinPhone(phone)) {
      setError(translate(language, 'join.phoneError'));
      return;
    }

    if (supabaseConfigured && supabase) {
      const { data, error: rpcError } = await supabase.rpc('add_walk_in', {
        p_name: name.trim(),
        p_phone: normalizePhone(phone),
        p_service_ids: [selectedService],
        p_preference_barber_id: null,
        p_join_request_id: crypto.randomUUID(),
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      onSuccess((data as { token: string }).token);
      return;
    }

    onSuccess('S-14');
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog reception-walkin" role="dialog" aria-modal="true">
        <h2>{translate(language, 'reception.addWalkIn')}</h2>
        <form onSubmit={submit}>
          <label>
            {translate(language, 'join.name')}
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </label>
          <label>
            {translate(language, 'join.phonePlaceholder')}
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>
          <label>
            Service
            <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
              <option value="haircut">Haircut</option>
              <option value="beard">Beard trim</option>
              <option value="spa">Hair spa</option>
            </select>
          </label>
          {error && <p className="field-error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="safe-action" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Add to queue</button>
          </div>
        </form>
      </section>
    </div>
  );
}
