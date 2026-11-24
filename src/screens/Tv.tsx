import { useEffect, useState } from 'react';
import { translate, type Language } from '../i18n';
import { supabase, supabaseConfigured } from '../lib/supabase';

type TvProps = {
  language: Language;
};

type PublicQueueRow = {
  token_text: string;
  status: 'Waiting' | 'Called' | 'In chair';
  assigned_barber_id: string | null;
  assigned_barber_name: string | null;
  initial_estimate: number;
  joined_at: string;
};

const dummyRows: PublicQueueRow[] = [
  { token_text: 'S-14', status: 'Called', assigned_barber_id: 'amit', assigned_barber_name: 'Amit', initial_estimate: 0, joined_at: new Date().toISOString() },
  { token_text: 'S-15', status: 'Waiting', assigned_barber_id: null, assigned_barber_name: null, initial_estimate: 35, joined_at: new Date().toISOString() },
  { token_text: 'S-16', status: 'Waiting', assigned_barber_id: null, assigned_barber_name: 'Ravi', initial_estimate: 40, joined_at: new Date().toISOString() },
  { token_text: 'S-17', status: 'Waiting', assigned_barber_id: null, assigned_barber_name: null, initial_estimate: 45, joined_at: new Date().toISOString() },
  { token_text: 'S-18', status: 'Waiting', assigned_barber_id: null, assigned_barber_name: null, initial_estimate: 50, joined_at: new Date().toISOString() },
];

export function TvScreen({ language }: TvProps) {
  const [rows, setRows] = useState<PublicQueueRow[]>(dummyRows);
  const [connectionLost, setConnectionLost] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      const timer = window.setInterval(() => setRows((current) => [...current]), 5000);
      return () => window.clearInterval(timer);
    }

    const client = supabase;
    let active = true;

    const loadQueue = async () => {
      const { data, error } = await client
        .from('public_queue_state')
        .select('status,token_text,assigned_barber_id,assigned_barber_name,initial_estimate,joined_at')
        .order('joined_at', { ascending: true });

      if (!active) return;
      if (error) {
        setConnectionLost(true);
        return;
      }

      setRows((data ?? []) as PublicQueueRow[]);
      setConnectionLost(false);
    };

    void loadQueue();
    const poll = window.setInterval(() => void loadQueue(), 3000);

    const channel = client
      .channel('latecuts-public-tv')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'public_queue_state' },
        () => void loadQueue(),
      )
      .subscribe((status) => {
        setConnectionLost(status !== 'SUBSCRIBED');
      });

    const updateConnection = () => setConnectionLost(!navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      void client.removeChannel(channel);
    };
  }, []);

  const called = rows.filter((row) => row.status === 'Called');
  const waiting = rows.filter((row) => row.status === 'Waiting').slice(0, 5);

  const dateLabel = now.toLocaleDateString(language === 'gu' ? 'gu-IN' : 'en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(language === 'gu' ? 'gu-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <main className="tv-screen" lang={language}>
      <header className="tv-header">
        <div className="tv-brand">
          <img src="/brand/logo-mark.svg" alt="" />
          <span>LateCuts</span>
        </div>
        <div className="tv-header-status">
          {connectionLost && (
            <span className="tv-reconnecting">
              {translate(language, 'net.lost')}
            </span>
          )}
          <span>{dateLabel}</span>
          <strong>{timeLabel}</strong>
        </div>
      </header>

      <section className="tv-called" aria-live="polite">
        <div className="tv-section-label">
          <span>{translate(language, 'tv.nowServing')}</span>
          <span aria-hidden="true">NOW</span>
        </div>
        {called.length > 0 ? (
          <div className="tv-called-list">
            {called.slice(0, 3).map((row) => (
              <article className="tv-called-card" key={`${row.token_text}-${row.assigned_barber_id}`}>
                <span className="tv-barber-name">
                  {row.assigned_barber_name ?? 'Barber'}
                </span>
                <strong>{row.token_text}</strong>
                <span>PLEASE COME</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="tv-called-empty">
            <strong>—</strong>
            <span>{translate(language, 'tv.noneCalled')}</span>
          </div>
        )}
      </section>

      <section className="tv-next" aria-live="polite">
        <div className="tv-section-label">
          <span>{translate(language, 'tv.upNext')}</span>
          <span aria-hidden="true">NEXT</span>
        </div>
        {waiting.length > 0 ? (
          <div className="tv-next-list">
            {waiting.map((row, index) => (
              <article className="tv-next-row" key={`${row.token_text}-${index}`}>
                <strong>{row.token_text}</strong>
                <span>
                  {translate(language, 'estimate.about', {
                    time: row.initial_estimate > 0 ? `${row.initial_estimate} min` : translate(language, 'estimate.none'),
                  })}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="tv-next-empty">
            <strong>0</strong>
            <span>{translate(language, 'tv.emptyQueue')}</span>
          </div>
        )}
      </section>

      <footer className="tv-footer">
        <div className="tv-qr-placeholder" aria-label="QR join link">
          <span>QR</span>
        </div>
        <div>
          <strong>{translate(language, 'tv.scan')}</strong>
          <span>latecuts.app/join</span>
        </div>
      </footer>
    </main>
  );
}
