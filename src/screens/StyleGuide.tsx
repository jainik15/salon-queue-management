import { useState } from 'react';
import type { Language } from '../i18n';
import {
  BrandLockup,
  Ticket,
  SplitFlap,
  EstimateRing,
  EmptyChairIllustration,
  BarberPole,
  BrandTopBar,
  BarberCard,
  LiveDot,
  Toast,
  ConfirmDialog,
  Skeleton,
} from '../components/DesignSystem';

export default function StyleGuide({ language }: { language: Language }) {
  const [gujarati, setGujarati] = useState(language === 'gu');

  return (
    <main className="styleguide" lang={gujarati ? 'gu' : 'en'}>
      <BrandTopBar
        language={gujarati ? 'gu' : 'en'}
        title={gujarati ? 'ડિઝાઇન ગાઇડ' : 'Design guide'}
        onLanguageChange={() => setGujarati((current) => !current)}
      />

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

      <section className="styleguide-grid">
        <article className="styleguide-card">
          <h2>{gujarati ? 'બાર્બર કાર્ડ' : 'Barber card'}</h2>
          <BarberCard name="Ravi" state="busy" detail="S-10 · Haircut" progress={72}>
            <button type="button" className="primary-button">Done</button>
          </BarberCard>
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'લાઇવ અને ટોસ્ટ' : 'Live and toast'}</h2>
          <LiveDot label={gujarati ? 'લાઇવ' : 'Live'} />
          <Toast>{gujarati ? 'સાચવ્યું' : 'Saved'}</Toast>
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'કંકાલ' : 'Skeletons'}</h2>
          <Skeleton variant="ticket" />
          <Skeleton variant="row" />
        </article>

        <article className="styleguide-card">
          <h2>{gujarati ? 'પુષ્ટિ ડાયલોગ' : 'Confirm dialog'}</h2>
          <ConfirmDialog
            title={gujarati ? 'જગ્યા રદ કરીએ?' : 'Cancel your spot?'}
            consequence={gujarati ? 'તમે કતારનો ક્રમ ગુમાવશો.' : 'You will lose your place in line.'}
            safeLabel={gujarati ? 'જગ્યા રાખો' : 'Keep my spot'}
            riskyLabel={gujarati ? 'હા, રદ કરો' : 'Yes, cancel'}
            onSafe={() => undefined}
            onRisky={() => undefined}
          />
        </article>
      </section>
    </main>
  );
}
