// lib/novaia/pdf.ts
//
// Lecture d'un PDF dans le NAVIGATEUR : on affiche une page à la fois sous forme d'image, que NovaIA lit avec son modèle de vision
// (marche aussi pour les PDF scannés, les schémas, les formules). Le fichier ne quitte jamais l'appareil : seule la page
// choisie est envoyée, comme une photo, et rien n'est enregistré.
// La bibliothèque pdf.js est chargée à la demande depuis cdnjs (version figée), seulement quand quelqu'un joint un PDF.

const PDFJS_VERSION = '3.11.174';
const BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
const MAX_PDF_BYTES = 25_000_000;
const RENDER_SIDE = 1800; // un peu plus que l'envoi final (1600) : le redimensionnement lisse le texte

/* eslint-disable @typescript-eslint/no-explicit-any */
let loader: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('server'));
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${BASE}/pdf.min.js`;
      s.async = true;
      s.onload = () => {
        if (!w.pdfjsLib) return reject(new Error('pdfjs'));
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.js`;
        resolve(w.pdfjsLib);
      };
      s.onerror = () => {
        loader = null;
        reject(new Error('pdfjs'));
      };
      document.head.appendChild(s);
    });
  }
  return loader;
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export interface OpenedPdf {
  name: string;
  pages: number;
  /** Page n (à partir de 1) rendue en image JPEG, prête à passer par prepareImage. */
  renderPage: (n: number) => Promise<File>;
  destroy: () => void;
}

export async function openPdf(file: File): Promise<OpenedPdf> {
  if (file.size > MAX_PDF_BYTES) throw new Error('size');
  const lib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;

  return {
    name: file.name,
    pages: doc.numPages,
    async renderPage(n: number) {
      const page = await doc.getPage(Math.min(Math.max(1, n), doc.numPages));
      const base = page.getViewport({ scale: 1 });
      const scale = RENDER_SIDE / Math.max(base.width, base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('canvas');
      return new File([blob], `page-${n}.jpg`, { type: 'image/jpeg' });
    },
    destroy: () => {
      try {
        doc.destroy();
      } catch {
        /* déjà fermé */
      }
    },
  };
}
