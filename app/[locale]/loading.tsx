import NovaStar from '@/components/brand/NovaStar';

/** Écran de chargement entre deux pages : la mascotte patiente. */
export default function Loading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-live="polite">
      <div className="ns-float">
        <NovaStar size={72} face mood="think" />
      </div>
      <span className="sr-only">Loading / Chargement…</span>
    </div>
  );
}
