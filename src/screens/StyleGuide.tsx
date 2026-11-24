import { useState } from 'react';
import type { Language } from '../i18n';
import {
  BrandLockup,
  Ticket,
  SplitFlap,
  EstimateRing,
  EmptyChairIllustration,
  BarberPole,
} from '../components/DesignSystem';

export default function StyleGuide({ language }: { language: Language }) {
  const [gujarati, setGujarati] = useState(language === 'gu');

  return (
    <main className="styleguide" lang={gujarati ? 'gu' : 'en'}>
      <header className="styleguide-header">
        <BrandLockup />
        <button
          type="button"
          className="language-toggle"
          onClick={() => setGujarati((current) => !current)}
        >
          {gujarati ? 'EN | GU' : 'EN | GU'}
        </button>
      </header>

      <section className="styleguide-section">
        <p className="styleguide-eyebrow">Visual foundation</p>
        <h1>{gujarati ? 'લેટકટ્સ ડિઝાઇન સિસ્ટમ' : 'LateCuts design system'}</h1>
        <BarberPole />
      </section>

      <section className="styleguide-grid">
        <article className="styleguide-card">
          <h2>{gujarati ? 'ટિકિટ' : 'Ticket'}</h2>
          <Ticket token="S-14" position={gujarati ? '4થો' : '4th'} />
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'વિભાજિત ફ્લેપ' : 'Split flap'}</h2>
          <SplitFlap value="S-14" />
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'અંદાજ રિંગ' : 'Estimate ring'}</h2>
          <EstimateRing
            estimate={<><small>{gujarati ? 'અંદાજે' : 'about'}</small><strong>35 min</strong></>}
            fill={22}
            label={gujarati ? '35 મિનિટ અંદાજે' : 'about 35 minutes'}
          />
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'ખાલી સ્થિતિ' : 'Empty state'}</h2>
          <EmptyChairIllustration />
        </article>
      </section>

      <section className="styleguide-controls">
        <button type="button" className="primary-button">Join Queue</button>
        <button type="button" className="secondary-button">Keep my spot</button>
        <button type="button" className="danger-button">Cancel</button>
      </section>
    </main>
  );
}
