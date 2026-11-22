import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import NovaStar from '@/components/brand/NovaStar';
import { defaultLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

// Note: Next.js renders this without access to the [locale] param,
// so it falls back to the default locale.
export default function NotFound() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="flex min-h-[62vh] items-center py-20">
      <Container className="flex flex-col items-start gap-6">
        <NovaStar size={84} face mood="lost" className="ns-float" />
        <p className="text-sm font-bold text-accent">{dict.notFound.code}</p>
        <h1 className="text-display-2 font-extrabold tracking-tight text-ink">{dict.notFound.title}</h1>
        <p className="max-w-md text-[1.05rem] leading-relaxed text-muted">{dict.notFound.text}</p>
        <Button href={`/${defaultLocale}`} arrow>
          {dict.notFound.button}
        </Button>
      </Container>
    </div>
  );
}
