import { useState } from 'react';
import { BookOpen, FlipHorizontal, Lightbulb, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type {
  ArtifactContent,
  FlashcardCard,
  QuizQuestion,
  StudyArtifact,
  SummaryContent,
} from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';

interface ArtifactPreviewProps {
  artifact: StudyArtifact;
  onDelete?: (id: string) => void;
  compact?: boolean;
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
}: ArtifactPreviewProps) => {
  const typeInfo = artifactTypeLabel[artifact.type] ?? { label: artifact.type, icon: BookOpen };
  const TypeIcon = typeInfo.icon;

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
          <span className="truncate text-xs text-ink/60 dark:text-slate-400">
            {artifact.title}
          </span>
          {onDelete && (
            <button
              className="focus-ring ml-auto shrink-0 rounded-md p-1 text-ink/30 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
              onClick={() => onDelete(artifact.id)}
              title="Delete artifact"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
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
          <span className={cn('text-sm font-semibold', artifactTypeColor[artifact.type])}>
            {typeInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink/40 dark:text-slate-500">
            {new Date(artifact.createdAt).toLocaleDateString()}
          </span>
          {onDelete && (
            <button
              className="focus-ring rounded-lg p-1.5 text-ink/30 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
              onClick={() => onDelete(artifact.id)}
              title="Delete artifact"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm font-semibold leading-tight text-ink dark:text-slate-100">
        {artifact.title}
      </p>
      <ArtifactContentView content={artifact.content} type={artifact.type} />
    </div>
  );
};

const ArtifactContentView = ({
  content,
  type,
}: {
  content: ArtifactContent;
  type: string;
}) => {
  if (type === 'summary') {
    const summary = content as SummaryContent;
    return (
      <div className="space-y-2">
        {summary.bullets.map((bullet, i) => (
          <div className="flex items-start gap-2" key={i}>
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean dark:bg-cyan" />
            <p className="text-sm leading-relaxed text-ink/80 dark:text-slate-300">{bullet}</p>
          </div>
        ))}
        {summary.keyTerms && summary.keyTerms.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.keyTerms.map((term, i) => (
              <span
                className="rounded-full border border-cyan/20 bg-cyan/8 px-2.5 py-0.5 text-[11px] font-medium text-ocean dark:border-cyan/30 dark:bg-cyan/10 dark:text-cyan"
                key={i}
              >
                {term}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'flashcard_set') {
    const cards = content as FlashcardCard[];
    return (
      <div className="space-y-2">
        {cards.slice(0, 5).map((card, i) => (
          <FlashcardItem card={card} key={i} index={i} />
        ))}
        {cards.length > 5 && (
          <p className="text-xs text-ink/40 dark:text-slate-500">
            +{cards.length - 5} more cards
          </p>
        )}
      </div>
    );
  }

  if (type === 'quiz_set') {
    const questions = content as QuizQuestion[];
    return (
      <div className="space-y-3">
        {questions.slice(0, 3).map((q, i) => (
          <QuizItem question={q} key={i} index={i} />
        ))}
        {questions.length > 3 && (
          <p className="text-xs text-ink/40 dark:text-slate-500">
            +{questions.length - 3} more questions
          </p>
        )}
      </div>
    );
  }

  if (type === 'note') {
    const note = content as { body: string; tags?: string[] };
    return (
      <div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80 dark:text-slate-300">
          {note.body}
        </p>
        {note.tags && note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.map((tag, i) => (
              <span
                className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2 py-0.5 text-[11px] text-ink/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
                key={i}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-ink/50 dark:text-slate-500">Unknown artifact type</p>
  );
};

const FlashcardItem = ({ card, index }: { card: FlashcardCard; index: number }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl border border-black/[0.06] bg-white/60 p-3 transition dark:border-white/10 dark:bg-slate-900/40',
        flipped && 'border-cyan/30 bg-cyan/5 dark:border-cyan/30 dark:bg-cyan/8',
      )}
      data-testid={`flashcard-${index}`}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFlipped((f) => !f); }}
    >
      <div className="flex items-center gap-2">
        <FlipHorizontal className="h-3 w-3 shrink-0 text-ink/30 dark:text-slate-600" />
        <p className={cn(
          'flex-1 text-sm transition-colors',
          flipped ? 'text-ocean dark:text-cyan' : 'font-medium text-ink dark:text-slate-100'
        )}>
          {flipped ? card.back : card.front}
        </p>
        <span className="shrink-0 text-[10px] text-ink/30 dark:text-slate-600">
          {flipped ? 'Answer' : 'Question'} {index + 1}
        </span>
      </div>
    </div>
  );
};

const QuizItem = ({ question, index }: { question: QuizQuestion; index: number }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="rounded-xl border border-black/[0.05] bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/30"
      data-testid={`quiz-q-${index}`}
    >
      <p className="mb-2 text-sm font-medium text-ink dark:text-slate-100">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-1">
        {question.options.map((option, oi) => {
          const isCorrect = oi === question.answer;
          return (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                revealed && isCorrect && 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                revealed && !isCorrect && 'text-ink/40 dark:text-slate-600',
                !revealed && 'text-ink/60 dark:text-slate-400',
              )}
              key={oi}
            >
              <span className="shrink-0 text-xs font-medium">{String.fromCharCode(65 + oi)}.</span>
              <span className="text-xs">{option}</span>
              {revealed && isCorrect && (
                <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Correct</span>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="focus-ring mt-2 text-xs text-ocean/70 transition hover:text-ocean dark:text-cyan/70 dark:hover:text-cyan"
        onClick={(e) => { e.stopPropagation(); setRevealed((r) => !r); }}
        type="button"
      >
        {revealed ? 'Hide answer' : 'Reveal answer'}
      </button>
      {revealed && question.explanation && (
        <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">
          {question.explanation}
        </p>
      )}
    </div>
  );
};
