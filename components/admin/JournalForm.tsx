'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { JournalEntry } from '@/lib/types';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function JournalForm({ entry }: { entry?: JournalEntry }) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!entry;

  const [title, setTitle] = useState(entry?.title.fr ?? '');
  const [slug, setSlug] = useState(entry?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [project, setProject] = useState(entry?.project ?? '');
  const [titleFr, setTitleFr] = useState(entry?.title.fr ?? '');
  const [titleEn, setTitleEn] = useState(entry?.title.en ?? '');
  const [categoryFr, setCategoryFr] = useState(entry?.category.fr ?? '');
  const [categoryEn, setCategoryEn] = useState(entry?.category.en ?? '');
  const [readingTimeFr, setReadingTimeFr] = useState(entry?.readingTime.fr ?? '3 min de lecture');
  const [readingTimeEn, setReadingTimeEn] = useState(entry?.readingTime.en ?? '3 min read');
  const [excerptFr, setExcerptFr] = useState(entry?.excerpt.fr ?? '');
  const [excerptEn, setExcerptEn] = useState(entry?.excerpt.en ?? '');
  const [contentFr, setContentFr] = useState((entry?.content.fr ?? []).join('\n\n'));
  const [contentEn, setContentEn] = useState((entry?.content.en ?? []).join('\n\n'));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      slug,
      date,
      project,
      title_fr: titleFr,
      title_en: titleEn,
      category_fr: categoryFr,
      category_en: categoryEn,
      reading_time_fr: readingTimeFr,
      reading_time_en: readingTimeEn,
      excerpt_fr: excerptFr,
      excerpt_en: excerptEn,
      content_fr: contentFr.split('\n\n').map((s) => s.trim()).filter(Boolean),
      content_en: contentEn.split('\n\n').map((s) => s.trim()).filter(Boolean),
    };

    const { error } = isEdit
      ? await supabase.from('journal_entries').update(payload).eq('slug', entry!.slug)
      : await supabase.from('journal_entries').insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin/journal');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!confirm(`Supprimer "${entry.title.fr}" définitivement ?`)) return;
    setDeleting(true);
    const { error } = await supabase.from('journal_entries').delete().eq('slug', entry.slug);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin/journal');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="grid gap-5 rounded-2xl border border-line bg-paper p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Titre — FR</label>
            <input
              required
              value={titleFr}
              onChange={(e) => {
                setTitleFr(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Titre — EN</label>
            <input
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
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
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Projet lié</label>
            <input
              required
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="SOCLE"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Catégorie — FR</label>
            <input
              required
              value={categoryFr}
              onChange={(e) => setCategoryFr(e.target.value)}
              placeholder="Produit"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Catégorie — EN</label>
            <input
              required
              value={categoryEn}
              onChange={(e) => setCategoryEn(e.target.value)}
              placeholder="Product"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Temps de lecture — FR</label>
            <input
              value={readingTimeFr}
              onChange={(e) => setReadingTimeFr(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Temps de lecture — EN</label>
            <input
              value={readingTimeEn}
              onChange={(e) => setReadingTimeEn(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Extrait — FR</label>
            <textarea
              required
              value={excerptFr}
              onChange={(e) => setExcerptFr(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">Extrait — EN</label>
            <textarea
              required
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">
              Contenu — FR (paragraphes séparés par une ligne vide)
            </label>
            <textarea
              value={contentFr}
              onChange={(e) => setContentFr(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium">
              Contenu — EN (paragraphs separated by a blank line)
            </label>
            <textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
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
              {deleting ? 'Suppression...' : 'Supprimer cette entrée'}
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
