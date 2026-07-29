import { ProjectStatus } from '@/lib/types';
import { Dictionary } from '@/lib/i18n/dictionaries';

const statusStyles: Record<ProjectStatus, string> = {
  Live: 'bg-emerald-500',
  'In development': 'bg-accent',
  Paused: 'bg-amber-500',
  Archived: 'bg-muted',
};

export default function StatusBadge({ status, dict }: { status: ProjectStatus; dict: Dictionary }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${statusStyles[status]}`} aria-hidden="true" />
      {dict.status[status]}
    </span>
  );
}
