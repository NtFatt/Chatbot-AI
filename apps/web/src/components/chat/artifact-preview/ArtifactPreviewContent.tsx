import { useState } from 'react';
import { CheckCircle, Copy, FlipHorizontal, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import type {
  ArtifactContent,
  FlashcardCard,
  NoteContent,
  QuizQuestion,
  StudyArtifact,
  SummaryContent,
} from '@chatbot-ai/shared';

import { cn } from '../../../utils/cn';

interface ArtifactContentViewProps {
  content: ArtifactContent;
  type: StudyArtifact['type'];
  previewOnly?: boolean;
}

export const ArtifactContentView = ({
  content,
  type,
  previewOnly = false,
}: ArtifactContentViewProps) => {
  if (type === 'summary') {
    return <SummaryContentView summary={content as SummaryContent} />;
  }

  if (type === 'flashcard_set') {
    const cards = content as FlashcardCard[];
    return (
      <div className="space-y-2">
        {cards.slice(0, 5).map((card, index) => (
          <FlashcardItem card={card} index={index} key={index} />
        ))}
        {cards.length > 5 ? (
          <p className="text-xs text-ink/40 dark:text-slate-500">+{cards.length - 5} more cards</p>
        ) : null}
      </div>
    );
  }

  if (type === 'quiz_set') {
    const questions = content as QuizQuestion[];
    return (
      <div className="space-y-3">
        {questions.slice(0, 3).map((question, index) => (
          <QuizItem index={index} key={index} previewOnly={previewOnly} question={question} />
        ))}
        {questions.length > 3 ? (
          <p className="text-xs text-ink/40 dark:text-slate-500">
            +{questions.length - 3} more questions
          </p>
        ) : null}
      </div>
    );
  }

  if (type === 'note') {
    return <NoteContentView note={content as NoteContent} />;
  }

  return <p className="text-sm text-ink/50 dark:text-slate-500">Unknown artifact type</p>;
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
      onClick={() => setFlipped((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          setFlipped((current) => !current);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-2">
        <FlipHorizontal className="h-3 w-3 shrink-0 text-ink/30 dark:text-slate-600" />
        <p
          className={cn(
            'flex-1 text-sm transition-colors',
            flipped ? 'text-ocean dark:text-cyan' : 'font-medium text-ink dark:text-slate-100',
          )}
        >
          {flipped ? card.back : card.front}
        </p>
        <span className="shrink-0 text-[10px] text-ink/30 dark:text-slate-600">
          {flipped ? 'Answer' : 'Question'} {index + 1}
        </span>
      </div>
    </div>
  );
};

interface QuizItemProps {
  question: QuizQuestion;
  index: number;
  previewOnly?: boolean;
  selectedAnswer?: number | null;
  onSelectAnswer?: (optionIndex: number) => void;
  revealed?: boolean;
  onReveal?: () => void;
}

export const QuizItem = ({
  question,
  index,
  previewOnly = false,
  selectedAnswer,
  onSelectAnswer,
  revealed,
  onReveal,
}: QuizItemProps) => {
  const isControlled =
    selectedAnswer !== undefined &&
    onSelectAnswer !== undefined &&
    revealed !== undefined &&
    onReveal !== undefined;
  const [internalRevealed, setInternalRevealed] = useState(false);

  const isRevealed = isControlled ? revealed : internalRevealed;

  return (
    <div
      className="rounded-xl border border-black/[0.05] bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/30"
      data-testid={`quiz-q-${index}`}
    >
      <p className="mb-2 text-sm font-medium text-ink dark:text-slate-100">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-1">
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.answer;
          const isSelected = selectedAnswer === optionIndex;

          return (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                isRevealed &&
                  isCorrect &&
                  'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                isRevealed &&
                  !isCorrect &&
                  isSelected &&
                  'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                isRevealed && !isCorrect && !isSelected && 'text-ink/40 dark:text-slate-600',
                !isRevealed &&
                  isSelected &&
                  'border border-ocean/20 bg-ocean/8 text-ocean dark:border-cyan/20 dark:bg-cyan/10 dark:text-cyan',
                !isRevealed && !isSelected && 'cursor-pointer text-ink/60 dark:text-slate-400',
              )}
              key={optionIndex}
              onClick={() => {
                if (!isRevealed && onSelectAnswer) {
                  onSelectAnswer(optionIndex);
                }
              }}
              onKeyDown={(event) => {
                if (!isRevealed && onSelectAnswer && (event.key === 'Enter' || event.key === ' ')) {
                  onSelectAnswer(optionIndex);
                }
              }}
              role={!isRevealed && onSelectAnswer ? 'button' : undefined}
              tabIndex={!isRevealed && onSelectAnswer ? 0 : undefined}
            >
              <span className="shrink-0 text-xs font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
              <span className="text-xs">{option}</span>
              {isRevealed && isCorrect ? (
                <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" /> Correct
                </span>
              ) : null}
              {isRevealed && !isCorrect && isSelected ? (
                <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> Wrong
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!previewOnly ? (
        <button
          className="focus-ring mt-2 text-xs text-ocean/70 transition hover:text-ocean dark:text-cyan/70 dark:hover:text-cyan"
          onClick={(event) => {
            event.stopPropagation();
            if (isControlled) {
              onReveal?.();
            } else {
              setInternalRevealed((current) => !current);
            }
          }}
          type="button"
        >
          {isRevealed ? 'Hide answer' : 'Reveal answer'}
        </button>
      ) : null}
      {isRevealed && question.explanation ? (
        <p className="mt-2 rounded-lg border border-black/[0.04] bg-ocean/4 px-3 py-2 text-xs leading-relaxed text-ink/60 dark:border-white/6 dark:bg-cyan/6 dark:text-slate-400">
          <span className="font-medium text-ocean dark:text-cyan">Explanation: </span>
          {question.explanation}
        </p>
      ) : null}
    </div>
  );
};

const SummaryContentView = ({ summary }: { summary: SummaryContent }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalLength = summary.bullets.join(' ').length;
  const shouldTruncate = summary.bullets.length > 3 || totalLength > 280;
  const displayBullets = shouldTruncate && !expanded ? summary.bullets.slice(0, 3) : summary.bullets;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.bullets.join('\n'));
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {displayBullets.map((bullet, index) => (
            <div className="flex items-start gap-2" key={index}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean dark:bg-cyan" />
              <p className="text-sm leading-relaxed text-ink/80 dark:text-slate-300">{bullet}</p>
            </div>
          ))}
        </div>
        <button
          className="focus-ring shrink-0 rounded-lg p-1.5 text-ink/30 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
          onClick={handleCopy}
          title="Copy summary"
          type="button"
        >
          <Copy className={cn('h-3.5 w-3.5 transition-colors', copied && 'text-emerald-500')} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {shouldTruncate ? (
          <button
            className="focus-ring text-xs text-ocean/70 transition hover:text-ocean dark:text-cyan/70 dark:hover:text-cyan"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? 'Show less' : `Show ${summary.bullets.length - 3} more`}
          </button>
        ) : null}
        {summary.keyTerms && summary.keyTerms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {summary.keyTerms.map((term, index) => (
              <span
                className="rounded-full border border-cyan/20 bg-cyan/8 px-2.5 py-0.5 text-[11px] font-medium text-ocean dark:border-cyan/30 dark:bg-cyan/10 dark:text-cyan"
                key={index}
              >
                {term}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const NoteContentView = ({ note }: { note: NoteContent }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const shouldTruncate = note.body.length > 320;
  const displayBody = shouldTruncate && !expanded ? `${note.body.slice(0, 320).trimEnd()}...` : note.body;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      toast.success('Note copied to clipboard');
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Failed to copy note');
    }
  };

  return (
    <div>
      <div className="flex items-start gap-2">
        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80 dark:text-slate-300">
          {displayBody}
        </p>
        <button
          className="focus-ring shrink-0 rounded-lg p-1.5 text-ink/30 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
          onClick={handleCopy}
          title="Copy note"
          type="button"
        >
          <Copy className={cn('h-3.5 w-3.5 transition-colors', copied && 'text-emerald-500')} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {shouldTruncate ? (
          <button
            className="focus-ring text-xs text-ocean/70 transition hover:text-ocean dark:text-cyan/70 dark:hover:text-cyan"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}
        {note.tags && note.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag, index) => (
              <span
                className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2 py-0.5 text-[11px] text-ink/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
                key={index}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
