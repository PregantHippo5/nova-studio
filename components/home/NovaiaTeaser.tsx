import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import NovaiaPeek from '@/components/home/NovaiaPeek';
import { Locale } from '@/lib/i18n/config';
import { Dictionary } from '@/lib/i18n/dictionaries';

export default function NovaiaTeaser({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.novaiaTeaser;
  const href = `/${locale}/novaia`;

  return (
    <section className="py-16 md:py-20">
      <Container className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="text-display-3 font-extrabold tracking-tight text-ink balance">{t.title}</h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">{t.text}</p>
          <div className="mt-8">
            <Button href={href} arrow>
              {t.button}
            </Button>
          </div>
        </div>

        <NovaiaPeek
          href={href}
          greeting={t.greeting}
          question={t.question}
          answerLead={t.answerLead}
          answerResult={t.answerResult}
          placeholder={t.placeholder}
        />
      </Container>
    </section>
  );
}
