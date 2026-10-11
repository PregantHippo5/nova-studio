import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import Reveal from '@/components/motion/Reveal';
import Parallax from '@/components/motion/Parallax';
import { SOCIALS } from '@/lib/site';
import { Dictionary } from '@/lib/i18n/dictionaries';

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'youtube') {
    return (
      <svg {...common}>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5Z" />
      </svg>
    );
  }
  if (name === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
    </svg>
  );
}

export default function FollowStrip({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden border-t border-line py-24">
      <Parallax distance={90} className="pointer-events-none absolute -right-20 top-10">
        <div className="h-72 w-72 rounded-full bg-accent-soft blur-2xl" />
      </Parallax>

      <Container className="relative">
        <Reveal>
          <SectionHeading
            eyebrow={dict.follow.eyebrow}
            title={dict.follow.title}
            description={dict.follow.text}
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {SOCIALS.map((social, i) => (
            <Reveal key={social.key} delay={i * 0.08}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col gap-10 rounded-2xl border border-line bg-paper/70 p-6 backdrop-blur transition-all duration-300 ease-smooth hover:-translate-y-1 hover:border-ink/25"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name={social.key} />
                </span>
                <span>
                  <span className="block text-lg font-semibold text-ink">{social.name}</span>
                  <span className="mt-1 block font-mono text-[0.75rem] text-muted transition-colors group-hover:text-accent">
                    {social.handle}
                  </span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
