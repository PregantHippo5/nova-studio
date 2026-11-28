import katex from 'katex';
import 'katex/dist/katex.min.css';
import { mathToText } from '@/lib/novaia/format';

/** Formule LaTeX rendue par KaTeX (vraies fractions, racines, exposants). Si la formule est illisible : version texte simple, jamais d'erreur à l'écran. */
export default function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  let html: string | null = null;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: true,
      output: 'html',
      strict: 'ignore',
      trust: false,
      maxSize: 20,
      maxExpand: 500,
    });
  } catch {
    html = null;
  }
  if (html === null) {
    const t = mathToText(tex);
    return display ? <p className="nv-formula text-center">{t}</p> : <span>{t}</span>;
  }
  if (display) {
    return <div className="nv-math overflow-x-auto overflow-y-hidden py-1 text-center" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className="nv-math" dangerouslySetInnerHTML={{ __html: html }} />;
}
