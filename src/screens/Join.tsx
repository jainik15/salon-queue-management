import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translate, type Language } from '../i18n';
import {
  RULE_CONSTANTS,
  normalizePhone,
  validateJoinName,
  validateJoinPhone,
  validateServiceSelection,
} from '../rules/queue';
import {
  DUMMY_SPOT_STORAGE_KEY,
  createDummySpot,
  getStatusUrl,
  saveDummySpot,
  type DummySpot,
} from '../dummySpot';
import { BrandLockup, EmptyChairIllustration } from '../components/DesignSystem';

type JoinScreenProps = {
  language: Language;
};

type Service = {
  id: string;
  nameKey: 'join.serviceHaircut' | 'join.serviceBeard' | 'join.serviceSpa' | 'join.serviceMassage' | 'join.serviceFacial';
  minutes: number;
  price: number;
  enabled: boolean;
};

const dummyServices: Service[] = [
  { id: 'haircut', nameKey: 'join.serviceHaircut', minutes: 30, price: 150, enabled: true },
  { id: 'beard', nameKey: 'join.serviceBeard', minutes: 15, price: 80, enabled: true },
  { id: 'spa', nameKey: 'join.serviceSpa', minutes: 45, price: 400, enabled: true },
  { id: 'massage', nameKey: 'join.serviceMassage', minutes: 15, price: 100, enabled: true },
  { id: 'facial', nameKey: 'join.serviceFacial', minutes: 30, price: 300, enabled: true },
];

const dummyBarbers = [
  { id: 'ravi', name: 'Ravi', state: 'busy' as const },
  { id: 'amit', name: 'Amit', state: 'free' as const },
  { id: 'imran', name: 'Imran', state: 'break' as const },
];

type ActiveSpot = DummySpot;

export function JoinScreen({ language }: JoinScreenProps) {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [preference, setPreference] = useState('any');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);

    const savedName = window.localStorage.getItem('latecuts-last-name');
    const savedPhone = window.localStorage.getItem('latecuts-last-phone');
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);

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

  const enabledServices = dummyServices.filter((service) => service.enabled);
  const chosenServices = enabledServices.filter((service) => selectedServices.includes(service.id));
  const totalMinutes = chosenServices.reduce((sum, service) => sum + service.minutes, 0);
  const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
  const atServiceLimit = selectedServices.length >= RULE_CONSTANTS.MAX_SERVICES;

  const toggleService = (serviceId: string) => {
    setServiceError('');
    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }
      if (current.length >= RULE_CONSTANTS.MAX_SERVICES) {
        return current;
      }
      return [...current, serviceId];
    });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextNameError = validateJoinName(name) ? '' : translate(language, 'join.nameError');
    const nextPhoneError = validateJoinPhone(phone) ? '' : translate(language, 'join.phoneError');
    const validServices = validateServiceSelection(
      selectedServices,
      enabledServices.map((service) => service.id),
    );
    const nextServiceError = validServices ? '' : translate(language, 'join.pickOne');

    setNameError(nextNameError);
    setPhoneError(nextPhoneError);
    setServiceError(nextServiceError);
    setSubmitError('');

    if (nextNameError) {
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }
    if (nextPhoneError) {
      phoneRef.current?.focus();
      phoneRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }
    if (nextServiceError) return;

    setSubmitting(true);
    window.setTimeout(() => {
      const normalizedPhone = normalizePhone(phone);
      const existingSpotJson = window.localStorage.getItem(DUMMY_SPOT_STORAGE_KEY);
      let existingSpot: ActiveSpot | null = null;

      if (existingSpotJson) {
        try {
          existingSpot = JSON.parse(existingSpotJson) as ActiveSpot;
        } catch {
          existingSpot = null;
        }
      }

      if (
        existingSpot &&
        existingSpot.status !== 'Done' &&
        existingSpot.status !== 'Cancelled' &&
        existingSpot.status !== 'No-show' &&
        existingSpot.phone === normalizedPhone
      ) {
        navigate(getStatusUrl(existingSpot), {
          state: { spot: existingSpot, existingSpotToken: existingSpot.token },
        });
        return;
      }

      const activeSpot = createDummySpot(crypto.randomUUID(), normalizedPhone, {
        token: 'S-14',
        status: 'Waiting',
        position: 4,
        estimate: 35,
        initialEstimate: 45,
        preference: preference === 'any' ? 'Any' : (preference.charAt(0).toUpperCase() + preference.slice(1)) as 'Ravi' | 'Amit' | 'Imran',
        barber: 'Amit',
        joinedAt: new Date().toISOString(),
        services: chosenServices.map((service) => translate(language, service.nameKey)),
        totalMinutes,
        totalPrice,
      });

      window.localStorage.setItem('latecuts-last-name', name.trim());
      window.localStorage.setItem('latecuts-last-phone', normalizedPhone);
      saveDummySpot(window.localStorage, activeSpot);
      navigate(getStatusUrl(activeSpot), {
        state: { spot: activeSpot, newSpotToken: activeSpot.token },
      });
    }, 500);
  };

  const barberStateText = (state: 'busy' | 'free' | 'break') => {
    if (state === 'busy') return translate(language, 'barber.state.busy');
    if (state === 'free') return translate(language, 'barber.state.free');
    return translate(language, 'barber.onBreak');
  };

  if (enabledServices.length === 0) {
    return (
      <JoinPageShell language={language} connectionLost={connectionLost}>
        <section className="join-disabled-state">
          <h2>{translate(language, 'join.noServices')}</h2>
          <Link className="primary-button" to="/">
            {translate(language, 'join.backToHome')}
          </Link>
        </section>
      </JoinPageShell>
    );
  }

  if (loading) {
    return (
      <JoinPageShell language={language} connectionLost={connectionLost}>
        <section className="join-content" aria-label="Loading">
          <div className="join-skeleton join-skeleton-fields" />
          <div className="join-skeleton join-skeleton-services" />
          <div className="join-skeleton join-skeleton-barbers" />
        </section>
      </JoinPageShell>
    );
  }

  return (
    <JoinPageShell language={language} connectionLost={connectionLost}>
      <form className="join-form" onSubmit={handleSubmit} noValidate>
        <section className="join-content">
          <div className="join-masthead" aria-hidden="true">
            <span>JOIN TICKET</span>
            <span>LC / QUEUE</span>
          </div>
          <h2 className="join-section-title">
            <span className="join-section-number">01</span>
            {translate(language, 'join.details')}
          </h2>
          <label className="join-field">
            <span>{translate(language, 'join.name')}</span>
            <input
              ref={nameRef}
              value={name}
              maxLength={40}
              autoComplete="name"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError('');
              }}
              placeholder={translate(language, 'join.name')}
            />
            {nameError && <span className="field-error" id="name-error">{nameError}</span>}
          </label>

          <label className="join-field">
            <span>{translate(language, 'join.phonePlaceholder')}</span>
            <input
              ref={phoneRef}
              value={phone}
              inputMode="numeric"
              autoComplete="tel"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'phone-error' : undefined}
              onChange={(event) => handlePhoneChange(event.target.value)}
              placeholder={translate(language, 'join.phonePlaceholder')}
            />
            {phoneError && <span className="field-error" id="phone-error">{phoneError}</span>}
          </label>

          <h2 className="join-section-title">
            <span className="join-section-number">02</span>
            {translate(language, 'join.services')}
          </h2>
          {atServiceLimit && (
            <p className="service-limit-hint">{translate(language, 'join.maxServices')}</p>
          )}
          <div className="service-grid">
            {enabledServices.map((service) => {
              const selected = selectedServices.includes(service.id);
              const disabled = atServiceLimit && !selected;
              return (
                <button
                  type="button"
                  className={`service-card ${selected ? 'selected' : ''}`}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggleService(service.id)}
                  key={service.id}
                >
                  <span className="service-card-name">
                    {translate(language, service.nameKey)}
                  </span>
                  {selected && <span className="service-check" aria-label="Selected">✓</span>}
                  <span className="service-meta">
                    {translate(language, 'join.minutes', { minutes: service.minutes })} ·{' '}
                    {translate(language, 'join.price', { price: service.price })}
                  </span>
                </button>
              );
            })}
          </div>
          {serviceError && <p className="field-error">{serviceError}</p>}

          <h2 className="join-section-title">
            <span className="join-section-number">03</span>
            {translate(language, 'join.chooseBarber')}
          </h2>
          <div className="barber-options" role="radiogroup">
            <label className={`barber-option ${preference === 'any' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="barber"
                value="any"
                checked={preference === 'any'}
                onChange={() => setPreference('any')}
              />
              <span>{translate(language, 'join.anyBarber')}</span>
            </label>
            {dummyBarbers.map((barber) => (
              <label className={`barber-option ${preference === barber.id ? 'selected' : ''}`} key={barber.id}>
                <input
                  type="radio"
                  name="barber"
                  value={barber.id}
                  checked={preference === barber.id}
                  onChange={() => setPreference(barber.id)}
                />
                <span className="barber-option-avatar" aria-hidden="true">{barber.name.charAt(0)}</span>
                <span className="barber-option-main">
                  <strong>{barber.name}</strong>
                  <span className={`barber-state barber-state-${barber.state}`}>
                    <span className="barber-dot" aria-hidden="true" />
                    {barberStateText(barber.state)}
                  </span>
                  {barber.state === 'break' && (
                    <small>{translate(language, 'join.onBreakWarning')}</small>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="join-summary">
          <div className="summary-ticket">
            <div className="summary-ticket-main">
              <span className="summary-ticket-label">LateCuts / Total</span>
              {submitError && <p className="field-error submit-error">{submitError}</p>}
              {chosenServices.length === 0 ? (
                <p className="summary-line">{translate(language, 'join.pickOne')}</p>
              ) : (
                <>
                  <p className="summary-line">
                    {translate(language, 'join.total', { minutes: totalMinutes, price: totalPrice })}
                  </p>
                  <p className="summary-estimate">
                    {translate(language, 'join.expectedWait', {
                      time: translate(language, 'estimate.about', { time: '35 min' }),
                    })}
                  </p>
                </>
              )}
            </div>
            <div className="summary-ticket-stub" aria-hidden="true">
              <span>{chosenServices.length}/3</span>
              <i />
            </div>
          </div>
          <button
            className="primary-button confirm-button"
            type="submit"
            disabled={submitting || connectionLost}
          >
            {submitting ? translate(language, 'join.spinner') : translate(language, 'join.confirm')}
          </button>
        </div>
      </form>
    </JoinPageShell>
  );
}

function JoinPageShell({
  language,
  connectionLost,
  children,
}: JoinScreenProps & { connectionLost: boolean; children: ReactNode }) {
  return (
    <main className="app-shell join-screen">
      {connectionLost && (
        <div className="connection-banner" role="status">
          {translate(language, 'net.lost')}
        </div>
      )}
      <header className="top-bar join-top-bar">
        <Link className="join-back" to="/" aria-label={translate(language, 'join.back')}>
          <span aria-hidden="true">←</span>
          <span>{translate(language, 'join.back')}</span>
        </Link>
        <h1 className="screen-title">{translate(language, 'join.title')}</h1>
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
