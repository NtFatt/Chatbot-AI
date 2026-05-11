import { useEffect, useState } from 'react';
import { BookOpen, Copy, Download, FlipHorizontal, Heart, Lightbulb, Link2Off, PencilLine, Save, Share2, Sparkles, Trash2, X } from 'lucide-react';

import type { ArtifactContent, ArtifactRefineInput, ArtifactRefineInstruction, StudyArtifact } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { ScoreBadge } from '../ui/ScoreBadge';
import { ArtifactContentView } from './artifact-preview/ArtifactPreviewContent';
import { ArtifactPreviewEditor } from './artifact-preview/ArtifactPreviewEditor';

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
  onSaveContent?: (artifact: StudyArtifact, content: ArtifactContent) => void;
  onRefine?: (artifact: StudyArtifact, input: ArtifactRefineInput) => void;
  isExporting?: boolean;
  isSharing?: boolean;
  isRevokingShare?: boolean;
  isSavingContent?: boolean;
  isRefining?: boolean;
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
  onSaveContent,
  onRefine,
  isExporting = false,
  isSharing = false,
  isRevokingShare = false,
  isSavingContent = false,
  isRefining = false,
}: ArtifactPreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState<ArtifactContent>(artifact.content);
  const [selectedRefineInstruction, setSelectedRefineInstruction] = useState<ArtifactRefineInstruction | ''>('');
  const [customRefineInstruction, setCustomRefineInstruction] = useState('');
  const typeInfo = artifactTypeLabel[artifact.type] ?? { label: artifact.type, icon: BookOpen };
  const TypeIcon = typeInfo.icon;
  const exportDisabled = isExporting || isSharing || isRevokingShare || isSavingContent || isRefining;

  useEffect(() => {
    setDraftContent(artifact.content);
    setIsEditing(false);
    setSelectedRefineInstruction('');
    setCustomRefineInstruction('');
  }, [artifact.content, artifact.id, artifact.updatedAt]);

  const refineDisabled =
    !onRefine ||
    isEditing ||
    isRefining ||
    isSavingContent ||
    !selectedRefineInstruction ||
    (selectedRefineInstruction === 'custom' && customRefineInstruction.trim().length < 5);

  const handleRunRefine = () => {
    if (!onRefine || !selectedRefineInstruction) {
      return;
    }

    onRefine(artifact, {
      instruction: selectedRefineInstruction,
      ...(selectedRefineInstruction === 'custom'
        ? { customInstruction: customRefineInstruction.trim() }
        : {}),
    });
  };

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
          {onSaveContent ? (
            isEditing ? (
              <>
                <button
                  className="focus-ring inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-500/14 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-400"
                  data-testid={`artifact-save-${artifact.id}`}
                  disabled={isSavingContent || isRefining}
                  onClick={() => onSaveContent(artifact, draftContent)}
                  type="button"
                >
                  <Save className={cn('h-3.5 w-3.5', isSavingContent && 'animate-pulse')} />
                  Save
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white/84 px-2.5 py-1 text-[11px] font-semibold text-ink/68 transition hover:bg-white hover:text-ink disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                  data-testid={`artifact-cancel-${artifact.id}`}
                  disabled={isSavingContent || isRefining}
                  onClick={() => {
                    setDraftContent(artifact.content);
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white/84 px-2.5 py-1 text-[11px] font-semibold text-ink/68 transition hover:bg-white hover:text-ink disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                data-testid={`artifact-edit-${artifact.id}`}
                disabled={exportDisabled}
                onClick={() => setIsEditing(true)}
                type="button"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </button>
            )
          ) : null}
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
      {onRefine ? (
        <div className="mb-3 rounded-2xl border border-black/[0.06] bg-white/62 p-3 dark:border-white/10 dark:bg-slate-950/35">
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              className="focus-ring min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-white/88 px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean/40 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:focus:border-cyan/40"
              data-testid={`artifact-refine-select-${artifact.id}`}
              disabled={isEditing || isSavingContent || isRefining}
              onChange={(event) => setSelectedRefineInstruction(event.target.value as ArtifactRefineInstruction | '')}
              value={selectedRefineInstruction}
            >
              <option value="">Refine artifact...</option>
              <option value="make_easier">De hon</option>
              <option value="make_harder">Kho hon</option>
              <option value="add_examples">Them vi du</option>
              <option value="shorten">Rut gon</option>
              <option value="expand">Mo rong</option>
              <option value="fix_accuracy">Sua do chinh xac</option>
              <option value="custom">Tuy chinh</option>
            </select>
            <button
              className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-500/14 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-400"
              data-testid={`artifact-refine-run-${artifact.id}`}
              disabled={refineDisabled}
              onClick={handleRunRefine}
              type="button"
            >
              <Sparkles className={cn('h-3.5 w-3.5', isRefining && 'animate-pulse')} />
              Refine
            </button>
          </div>
          {selectedRefineInstruction === 'custom' ? (
            <textarea
              className="focus-ring mt-2 min-h-[88px] w-full rounded-xl border border-black/[0.08] bg-white/88 px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean/40 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:focus:border-cyan/40"
              disabled={isEditing || isSavingContent || isRefining}
              onChange={(event) => setCustomRefineInstruction(event.target.value)}
              placeholder="Mo ta ban muon artifact duoc dieu chinh nhu the nao..."
              value={customRefineInstruction}
            />
          ) : null}
        </div>
      ) : null}
      {isEditing ? (
        <ArtifactPreviewEditor
          content={draftContent}
          disabled={isSavingContent || isRefining}
          onChange={setDraftContent}
          type={artifact.type}
        />
      ) : artifact.type === 'quiz_set' && onStartQuizReview ? (
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
