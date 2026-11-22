import { ProjectStatus } from '@/lib/types';
import { Dictionary } from '@/lib/i18n/dictionaries';

const statusDot: Record<ProjectStatus, string> = {
  Live: 'bg-[rgb(var(--ok))] ns-live',
  'In development': 'bg-accent',
  Paused: 'bg-[rgb(var(--sun))]',
  Archived: 'bg-muted',
};

export default function StatusBadge({ status, dict }: { status: ProjectStatus; dict: Dictionary }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.8rem] font-semibold text-muted">
      <span className={`relative h-2 w-2 rounded-full ${statusDot[status]}`} aria-hidden="true" />
      {dict.status[status]}
    </span>
  );
}
