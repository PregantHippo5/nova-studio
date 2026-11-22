import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import NovaStar from '@/components/brand/NovaStar';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

const STAR = 'M50 0 C55 34, 66 45, 100 50 C66 55, 55 66, 50 100 C45 66, 34 55, 0 50 C34 45, 45 34, 50 0 Z';

/** Accueil : un titre, une phrase, deux actions, et la mascotte. Une seule séquence d'entrée, pas d'effet au défilement. */
export default function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="relative pb-20 pt-12 md:pb-28 md:pt-20">
      <Container className="grid items-center gap-14 md:grid-cols-[1.25fr_1fr]">
        <div>
          <h1 className="ns-rise text-[clamp(2.6rem,6.2vw,4.7rem)] font-extrabold leading-[1.03] tracking-[-0.025em] text-ink balance">
            {dict.hero.title}
          </h1>
          <p
            className="ns-rise mt-6 max-w-md text-[1.1rem] leading-relaxed text-muted"
            style={{ animationDelay: '0.1s' }}
          >
            {dict.hero.lead}
          </p>
          <div className="ns-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.2s' }}>
            <Button href={`/${locale}/projects`} arrow>
              {dict.hero.explore}
            </Button>
            <Button href={`/${locale}/novaia`} variant="secondary">
              {dict.hero.novaia}
            </Button>
          </div>
        </div>

        {/* La mascotte : elle flotte, ses yeux suivent le curseur, un point orbite autour d'elle. */}
        <div className="ns-rise flex justify-center md:justify-end" style={{ animationDelay: '0.3s' }}>
          <div className="relative h-[300px] w-[300px]" aria-hidden="true">
            <div className="absolute inset-0" style={{ transform: 'rotate(-12deg)' }}>
              <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0">
                <ellipse
                  cx="150"
                  cy="150"
                  rx="150"
                  ry="52"
                  fill="none"
                  stroke="rgb(var(--c-learn))"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="ns-orbit-dot" />
            </div>

            <div className="ns-float absolute inset-0 flex items-center justify-center">
              <NovaStar size={176} face track />
            </div>

            <svg
              width="26"
              height="26"
              viewBox="0 0 100 100"
              className="ns-twinkle absolute right-6 top-8"
              style={{ fill: 'rgb(var(--sun))' }}
            >
              <path d={STAR} />
            </svg>
            <span
              className="ns-float absolute bottom-10 left-5 h-5 w-5 rounded-md"
              style={{ background: 'rgb(var(--c-games))', transform: 'rotate(14deg)', animationDelay: '-2s' }}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
