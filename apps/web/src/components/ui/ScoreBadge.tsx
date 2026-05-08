import { cn } from '../../utils/cn';

const scoreToLevel = (score: number) => {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
};

export const ScoreBadge = ({
  kind,
  score,
}: {
  kind: 'confidence' | 'quality';
  score: number | null | undefined;
}) => {
  if (score == null) {
    return null;
  }

  const level = scoreToLevel(score);
  const config = {
    confidence: {
      label: 'Tin cậy',
      tone:
        level === 'high'
          ? 'border-emerald-500/18 bg-emerald-500/[0.1] text-emerald-700 dark:text-emerald-300'
          : level === 'medium'
            ? 'border-amber-500/20 bg-amber-500/[0.1] text-amber-700 dark:text-amber-300'
            : 'border-rose-500/20 bg-rose-500/[0.1] text-rose-700 dark:text-rose-300',
    },
    quality: {
      label: 'Artifact',
      tone:
        level === 'high'
          ? 'border-sky-500/18 bg-sky-500/[0.1] text-sky-700 dark:text-sky-300'
          : level === 'medium'
            ? 'border-violet-500/20 bg-violet-500/[0.1] text-violet-700 dark:text-violet-300'
            : 'border-slate-500/18 bg-slate-500/[0.1] text-slate-700 dark:text-slate-300',
    },
  }[kind];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        config.tone,
      )}
      title={`${config.label}: ${Math.round(score * 100)}%`}
    >
      <span>{config.label}</span>
      <span>{level === 'high' ? 'cao' : level === 'medium' ? 'vừa' : 'thấp'}</span>
    </span>
  );
};
