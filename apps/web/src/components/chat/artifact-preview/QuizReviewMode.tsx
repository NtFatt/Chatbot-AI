import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  XCircle,
} from 'lucide-react';

import type { QuizQuestion, StudyArtifact } from '@chatbot-ai/shared';

import { cn } from '../../../utils/cn';
import { QuizItem } from './ArtifactPreviewContent';

interface QuizReviewModeProps {
  artifact: StudyArtifact;
  onBack: () => void;
}

export const QuizReviewMode = ({ artifact, onBack }: QuizReviewModeProps) => {
  const questions = artifact.content as QuizQuestion[];
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = useCallback(
    (optionIndex: number) => {
      setAnswers((previous) => ({ ...previous, [currentIndex]: optionIndex }));
    },
    [currentIndex],
  );

  const handleReveal = useCallback(() => {
    setRevealedQuestions((previous) => {
      const next = new Set(previous);
      next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setRevealedQuestions(new Set());
    setCurrentIndex(0);
    setShowSummary(false);
  };

  const score = Object.entries(answers).reduce((total, [questionIndex, answerIndex]) => {
    const question = questions[Number.parseInt(questionIndex, 10)];
    return total + (question && question.answer === answerIndex ? 1 : 0);
  }, 0);
  const totalAnswered = Object.keys(answers).length;
  const percentage = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

  if (showSummary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] bg-white/60 text-ink/60 transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-white"
            onClick={onBack}
            title="Back to artifacts"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-ink dark:text-slate-100">Quiz Results</span>
          <span className="ml-auto text-xs text-ink/40 dark:text-slate-500">
            {score}/{totalAnswered} correct
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center dark:border-amber-400/20 dark:bg-amber-400/5">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{percentage}%</p>
          <p className="text-xs text-ink/50 dark:text-slate-500">
            {score} of {totalAnswered} correct
          </p>
        </div>

        <div className="space-y-2">
          {questions.map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.answer;

            return (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  isCorrect
                    ? 'border-emerald-500/20 bg-emerald-500/5 dark:border-emerald-400/20 dark:bg-emerald-400/5'
                    : 'border-red-500/20 bg-red-500/5 dark:border-red-400/20 dark:bg-red-400/5',
                )}
                key={index}
              >
                <span
                  className={cn(
                    'shrink-0',
                    isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </span>
                <span className="truncate text-xs font-medium text-ink dark:text-slate-200">
                  {index + 1}. {question.question}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/14 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-400"
            onClick={handleRetake}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retake Quiz
          </button>
          <button
            className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/[0.06] bg-white/60 px-3 py-2 text-xs font-medium text-ink/70 transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Artifact
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] bg-white/60 text-ink/60 transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-white"
          onClick={onBack}
          title="Back to artifacts"
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-ink dark:text-slate-100">Quiz Review</span>
        <span className="ml-auto text-xs text-ink/40 dark:text-slate-500">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <QuizItem
        index={currentIndex}
        onReveal={handleReveal}
        onSelectAnswer={handleSelectAnswer}
        question={currentQuestion!}
        revealed={revealedQuestions.has(currentIndex)}
        selectedAnswer={answers[currentIndex]}
      />

      <div className="flex gap-2">
        <button
          className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-lg border border-black/[0.06] bg-white/60 px-3 py-2 text-xs font-medium text-ink/70 transition hover:bg-white/80 hover:text-ink disabled:opacity-30 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white"
          disabled={currentIndex === 0}
          onClick={handlePrev}
          type="button"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>
        <button
          className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/14 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-400"
          onClick={handleNext}
          type="button"
        >
          {currentIndex === totalQuestions - 1 ? 'See Results' : 'Next'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
