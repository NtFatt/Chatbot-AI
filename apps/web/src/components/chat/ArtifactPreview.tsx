import { BookOpen, Copy, Download, FlipHorizontal, Heart, Lightbulb, Link2Off, Share2, Trash2 } from 'lucide-react';

import type { StudyArtifact } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { ScoreBadge } from '../ui/ScoreBadge';
import { ArtifactContentView } from './artifact-preview/ArtifactPreviewContent';

interface ArtifactPreviewProps {
  artifact: StudyArtifact;
  onDelete?: (id: string) => void;
  compact?: boolean;
  onStartQuizReview?: (artifact: StudyArtifact) => void;
  onToggleFavorite?: (id: string) => void;
  showSessionProvenance?: boolean;
  onExport?: (artifact: StudyArtifact) => void;
  onShare?: (artifact: StudyArtifact) => void;
  onRevokeShare?: (artifact: StudyArtifact) => void;
  isExporting?: boolean;
  isSharing?: boolean;
  isRevokingShare?: boolean;
}

const artifactTypeLabel: Record<string, { label: string; icon: typeof BookOpen }> = {
  summary: { label: 'Summary', icon: BookOpen },
  flashcard_set: { label: 'Flashcards', icon: FlipHorizontal },
  quiz_set: { label: 'Quiz', icon: BookOpen },
  note: { label: 'Note', icon: Lightbulb },
};

const artifactTypeColor: Record<string, string> = {
  summary: 'text-ocean dark:text-cyan',
  flashcard_set: 'text-purple-600 dark:text-purple-400',
  quiz_set: 'text-amber-600 dark:text-amber-400',
  note: 'text-emerald-600 dark:text-emerald-400',
};

export const ArtifactPreview = ({
  artifact,
  onDelete,
  compact = false,
  onStartQuizReview,
  onToggleFavorite,
  showSessionProvenance = false,
  onExport,
  onShare,
  onRevokeShare,
  isExporting = false,
  isSharing = false,
  isRevokingShare = false,
}: ArtifactPreviewProps) => {
  const typeInfo = artifactTypeLabel[artifact.type] ?? { label: artifact.type, icon: BookOpen };
  const TypeIcon = typeInfo.icon;
  const exportDisabled = isExporting || isSharing || isRevokingShare;

  if (compact) {
    return (
      <div
        className="rounded-xl border border-black/[0.05] bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-slate-900/40"
        data-testid={`artifact-preview-${artifact.id}`}
      >
        <div className="flex items-center gap-2">
          <TypeIcon className={cn('h-3.5 w-3.5 shrink-0', artifactTypeColor[artifact.type])} />
          <span className={cn('text-xs font-medium', artifactTypeColor[artifact.type])}>
            {typeInfo.label}
          </span>
          <span className="truncate text-xs text-ink/60 dark:text-slate-400">{artifact.title}</span>
          <ScoreBadge kind="quality" score={artifact.qualityScore} />
          {onToggleFavorite ? (
            <button
              className={cn(
                'focus-ring ml-auto shrink-0 rounded-md p-1 transition',
                artifact.isFavorited
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-ink/30 hover:bg-black/[0.05] hover:text-red-400 dark:hover:bg-white/[0.06]',
              )}
              data-testid={`artifact-favorite-${artifact.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(artifact.id);
              }}
              title={artifact.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              type="button"
            >
              <Heart className={cn('h-3 w-3', artifact.isFavorited && 'fill-current')} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="focus-ring shrink-0 rounded-md p-1 text-ink/30 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
              data-testid={`artifact-delete-${artifact.id}`}
              onClick={() => onDelete(artifact.id)}
              title="Delete artifact"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-black/[0.05] bg-white/50 p-4 dark:border-white/10 dark:bg-slate-900/30"
      data-testid={`artifact-full-${artifact.id}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className={cn('h-4 w-4', artifactTypeColor[artifact.type])} />
          <span className={cn('text-sm font-semibold', artifactTypeColor[artifact.type])}>{typeInfo.label}</span>
          <ScoreBadge kind="quality" score={artifact.qualityScore} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink/40 dark:text-slate-500">
            {new Date(artifact.createdAt).toLocaleDateString()}
          </span>
          {onExport ? (
            <button
              className="focus-ring rounded-lg p-1.5 text-ink/34 transition hover:bg-black/[0.05] hover:text-ink disabled:cursor-wait disabled:opacity-50 dark:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
              data-testid={`artifact-export-${artifact.id}`}
              disabled={exportDisabled}
              onClick={() => onExport(artifact)}
              title={isExporting ? 'Exporting markdown...' : 'Export markdown'}
              type="button"
            >
              <Download className={cn('h-3.5 w-3.5', isExporting && 'animate-pulse')} />
            </button>
          ) : null}
          {onShare ? (
            <button
              className="focus-ring rounded-lg p-1.5 text-ink/34 transition hover:bg-black/[0.05] hover:text-ink disabled:cursor-wait disabled:opacity-50 dark:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
              data-testid={`artifact-share-${artifact.id}`}
              disabled={exportDisabled}
              onClick={() => onShare(artifact)}
              title={
                isSharing
                  ? artifact.isShared
                    ? 'Copying link...'
                    : 'Creating share link...'
                  : artifact.isShared
                    ? 'Copy share link'
                    : 'Create share link'
              }
              type="button"
            >
              {artifact.isShared ? (
                <Copy className={cn('h-3.5 w-3.5', isSharing && 'animate-pulse')} />
              ) : (
                <Share2 className={cn('h-3.5 w-3.5', isSharing && 'animate-pulse')} />
              )}
            </button>
          ) : null}
          {artifact.isShared && onRevokeShare ? (
            <button
              className="focus-ring rounded-lg p-1.5 text-ink/34 transition hover:bg-red-500/10 hover:text-red-500 disabled:cursor-wait disabled:opacity-50 dark:text-slate-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              data-testid={`artifact-revoke-share-${artifact.id}`}
              disabled={exportDisabled}
              onClick={() => onRevokeShare(artifact)}
              title={isRevokingShare ? 'Revoking share link...' : 'Revoke share link'}
              type="button"
            >
              <Link2Off className={cn('h-3.5 w-3.5', isRevokingShare && 'animate-pulse')} />
            </button>
          ) : null}
          {onToggleFavorite ? (
            <button
              className={cn(
                'focus-ring rounded-lg p-1.5 transition',
                artifact.isFavorited
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-ink/30 hover:bg-black/[0.05] hover:text-red-400 dark:text-slate-600 dark:hover:bg-white/[0.06]',
              )}
              data-testid={`artifact-favorite-${artifact.id}`}
              onClick={() => onToggleFavorite(artifact.id)}
              title={artifact.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              type="button"
            >
              <Heart className={cn('h-3.5 w-3.5', artifact.isFavorited && 'fill-current')} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="focus-ring rounded-lg p-1.5 text-ink/30 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
              data-testid={`artifact-delete-${artifact.id}`}
              onClick={() => onDelete(artifact.id)}
              title="Delete artifact"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="mb-3 text-sm font-semibold leading-tight text-ink dark:text-slate-100">{artifact.title}</p>
      {showSessionProvenance && artifact.sessionTitle ? (
        <p className="mb-3 text-xs font-medium text-ink/52 dark:text-slate-400">
          From session: <span className="text-ink/70 dark:text-slate-300">{artifact.sessionTitle}</span>
        </p>
      ) : null}
      {artifact.type === 'quiz_set' && onStartQuizReview ? (
        <div>
          <ArtifactContentView content={artifact.content} previewOnly type={artifact.type} />
          <button
            className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/14 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-400"
            onClick={() => onStartQuizReview(artifact)}
            type="button"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Start Quiz Review
          </button>
        </div>
      ) : (
        <ArtifactContentView content={artifact.content} type={artifact.type} />
      )}
    </div>
  );
};
