import Container from '@/components/ui/Container';
import ScrollWords from '@/components/motion/ScrollWords';
import { Dictionary } from '@/lib/i18n/dictionaries';

export default function Manifesto({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-t border-line py-32 md:py-48">
      <Container className="max-w-4xl">
        <p className="mb-6 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">
          {dict.manifesto.eyebrow}
        </p>
        <ScrollWords
          text={dict.manifesto.text}
          className="text-display-3 font-semibold text-ink md:text-display-2"
        />
      </Container>
    </section>
  );
}
