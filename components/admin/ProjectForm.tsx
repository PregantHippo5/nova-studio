'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectCategory, ProjectStatus, ProjectLink, ProjectScreenshot } from '@/lib/types';

const categories: ProjectCategory[] = ['Software', 'Games', 'Music', 'Videos'];
const statuses: ProjectStatus[] = ['Live', 'In development', 'Paused', 'Archived'];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? '');
  const [slug, setSlug] = useState(project?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [category, setCategory] = useState<ProjectCategory>(project?.category ?? 'Software');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'In development');
  const [taglineFr, setTaglineFr] = useState(project?.tagline.fr ?? '');
  const [taglineEn, setTaglineEn] = useState(project?.tagline.en ?? '');
  const [descriptionFr, setDescriptionFr] = useState(project?.description.fr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(project?.description.en ?? '');
  const [currentVersion, setCurrentVersion] = useState(project?.currentVersion ?? '');
  const [gradientStart, setGradientStart] = useState(project?.cover.gradient[0] ?? '#EDEBFF');
  const [gradientEnd, setGradientEnd] = useState(project?.cover.gradient[1] ?? '#F6F5FF');
  const [coverLabel, setCoverLabel] = useState(project?.cover.label ?? project?.name ?? '');
  const [coverVideoUrl, setCoverVideoUrl] = useState(project?.cover.videoUrl ?? '');
  const [coverPosterUrl, setCoverPosterUrl] = useState(project?.cover.posterUrl ?? '');
  const [screenshots, setScreenshots] = useState<ProjectScreenshot[]>(project?.screenshots ?? []);
  const [featuresFr, setFeaturesFr] = useState((project?.features?.fr ?? []).join('\n'));
  const [featuresEn, setFeaturesEn] = useState((project?.features?.en ?? []).join('\n'));
  const [links, setLinks] = useState<ProjectLink[]>(
    project?.links && project.links.length > 0
      ? project.links
      : [{ label: '', href: '#', kind: 'primary', available: false }]
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLink = (index: number, patch: Partial<ProjectLink>) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const addLink = () =>
    setLinks((prev) => [...prev, { label: '', href: '#', kind: 'secondary', available: true }]);
  const removeLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));

  const updateScreenshot = (index: number, patch: Partial<ProjectScreenshot>) => {
    setScreenshots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addScreenshot = () => setScreenshots((prev) => [...prev, { url: '', alt: '' }]);
  const removeScreenshot = (index: number) =>
    setScreenshots((prev) => prev.filter((_, i) => i !== index));

  // Note : l'upload du fichier .exe/.zip/.dmg de SOCLE ne se fait plus ici —
  // voir /admin/releases, qui écrit directement dans app_releases (partagée
  // avec l'auto-updater de l'app et le bouton de téléchargement public).

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      slug,
      name,
      category,
      status,
      tagline_fr: taglineFr,
      tagline_en: taglineEn,
      description_fr: descriptionFr,
      description_en: descriptionEn,
      current_version: currentVersion || null,
      cover_gradient_start: gradientStart,
      cover_gradient_end: gradientEnd,
      cover_label: coverLabel,
      cover_video_url: coverVideoUrl.trim() || null,
      cover_poster_url: coverPosterUrl.trim() || null,
      screenshots: screenshots.filter((s) => s.url.trim().length > 0),
      features_fr: featuresFr.split('\n').map((s) => s.trim()).filter(Boolean),
      features_en: featuresEn.split('\n').map((s) => s.trim()).filter(Boolean),
      links: links.filter((l) => l.label.trim().length > 0),
    };

    const { error } = isEdit
      ? await supabase.from('projects').update(payload).eq('slug', project!.slug)
      : await supabase.from('projects').insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin/projects');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm(`Supprimer "${project.name}" définitivement ?`)) return;
    setDeleting(true);
    const { error } = await supabase.from('projects').delete().eq('slug', project.slug);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin/projects');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="grid gap-5 rounded-2xl border border-line bg-paper p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Nom</label>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Slug (URL)</label>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              className="w-full rounded-lg border border-line px-3 py-2 font-mono text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProjectCategory)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[0.8rem] font-medium">Version actuelle (optionnel)</label>
          <input
            value={currentVersion}
            onChange={(e) => setCurrentVersion(e.target.value)}
            placeholder="v1.0.0"
            className="w-full rounded-lg border border-line px-3 py-2 font-mono text-sm focus:outline-2 focus:outline-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Phrase d'accroche — FR</label>
            <input
              required
              value={taglineFr}
              onChange={(e) => setTaglineFr(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Phrase d'accroche — EN</label>
            <input
              required
              value={taglineEn}
              onChange={(e) => setTaglineEn(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Description — FR</label>
            <textarea
              required
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Description — EN</label>
            <textarea
              required
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Features — FR (une par ligne)</label>
            <textarea
              value={featuresFr}
              onChange={(e) => setFeaturesFr(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Features — EN (une par ligne)</label>
            <textarea
              value={featuresEn}
              onChange={(e) => setFeaturesEn(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Couverture — couleur 1</label>
            <input
              type="color"
              value={gradientStart}
              onChange={(e) => setGradientStart(e.target.value)}
              className="h-10 w-full rounded-lg border border-line"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Couverture — couleur 2</label>
            <input
              type="color"
              value={gradientEnd}
              onChange={(e) => setGradientEnd(e.target.value)}
              className="h-10 w-full rounded-lg border border-line"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Texte sur la couverture</label>
            <input
              value={coverLabel}
              onChange={(e) => setCoverLabel(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>
		<p className="text-xs text-muted">
			Le fichier de téléchargement de SOCLE (Windows/macOS) se gère
			désormais depuis <a href="/admin/releases" className="underline">/admin/releases</a>,
			pas ici.
		</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">
              Vidéo de couverture (mp4/webm)
            </label>
            <input
              placeholder="/videos/socle-ba-web.mp4"
              value={coverVideoUrl}
              onChange={(e) => setCoverVideoUrl(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
            <p className="mt-1 text-xs text-muted">
              Si renseignée, remplace le dégradé en boucle (muet, autoplay) dans le hero.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">
              Image d'attente de la vidéo (poster)
            </label>
            <input
              placeholder="/images/projects/socle/today.webp"
              value={coverPosterUrl}
              onChange={(e) => setCoverPosterUrl(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[0.8rem] font-medium">
            Screenshots (carrousel sous le hero)
          </label>
          <div className="flex flex-col gap-2">
            {screenshots.map((shot, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1.4fr_auto] items-center gap-2">
                <input
                  placeholder="URL de l'image"
                  value={shot.url}
                  onChange={(e) => updateScreenshot(i, { url: e.target.value })}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
                />
                <input
                  placeholder="Texte alternatif (accessibilité)"
                  value={shot.alt ?? ''}
                  onChange={(e) => updateScreenshot(i, { alt: e.target.value })}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:text-ink"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addScreenshot}
            className="mt-2 text-xs font-medium text-ink underline underline-offset-2"
          >
            + Ajouter un screenshot
          </button>
        </div>

        <div>
          <label className="mb-2 block text-[0.8rem] font-medium">Liens</label>
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div key={i} className="grid grid-cols-[1.2fr_1.4fr_0.8fr_auto_auto] items-center gap-2">
                <input
                  placeholder="Label (ex: Download SOCLE)"
                  value={link.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
                />
                <input
                  placeholder="URL"
                  value={link.href}
                  onChange={(e) => updateLink(i, { href: e.target.value })}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
                />
                <select
                  value={link.kind}
                  onChange={(e) => updateLink(i, { kind: e.target.value as 'primary' | 'secondary' })}
                  className="rounded-lg border border-line px-2 py-1.5 text-xs"
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={link.available !== false}
                    onChange={(e) => updateLink(i, { available: e.target.checked })}
                  />
                  actif
                </label>
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-xs text-red-600 hover:underline"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLink}
            className="mt-2 text-xs text-muted hover:text-ink"
          >
            + Ajouter un lien
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Supprimer ce projet'}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  );
}