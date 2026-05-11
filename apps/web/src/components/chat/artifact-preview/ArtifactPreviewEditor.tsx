import { useEffect, useState } from 'react';

import type {
  ArtifactContent,
  FlashcardCard,
  NoteContent,
  QuizQuestion,
  StudyArtifact,
  SummaryContent,
} from '@chatbot-ai/shared';

const inputClassName =
  'w-full rounded-xl border border-black/[0.08] bg-white/88 px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean/40 focus:ring-2 focus:ring-ocean/15 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:focus:border-cyan/40 dark:focus:ring-cyan/15';

const textareaClassName = `${inputClassName} min-h-[100px] resize-y leading-relaxed`;

interface ArtifactPreviewEditorProps {
  type: StudyArtifact['type'];
  content: ArtifactContent;
  onChange: (next: ArtifactContent) => void;
  disabled?: boolean;
}

const SummaryEditor = ({
  content,
  onChange,
  disabled,
}: {
  content: SummaryContent;
  onChange: (next: SummaryContent) => void;
  disabled?: boolean;
}) => {
  const [bulletsText, setBulletsText] = useState(content.bullets.join('\n'));
  const [keyTermsText, setKeyTermsText] = useState((content.keyTerms ?? []).join(', '));

  useEffect(() => {
    setBulletsText(content.bullets.join('\n'));
    setKeyTermsText((content.keyTerms ?? []).join(', '));
  }, [content]);

  const buildNextSummary = (nextBulletsText: string, nextKeyTermsText: string) => {
    const bullets = nextBulletsText
      .split('\n')
      .map((bullet) => bullet.trim())
      .filter(Boolean);
    const keyTerms = nextKeyTermsText
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean);

    onChange({
      bullets,
      ...(keyTerms.length > 0 ? { keyTerms } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
        Bullet points
      </label>
      <textarea
        className={textareaClassName}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          setBulletsText(nextValue);
          buildNextSummary(nextValue, keyTermsText);
        }}
        value={bulletsText}
      />
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
        Key terms
      </label>
      <input
        className={inputClassName}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          setKeyTermsText(nextValue);
          buildNextSummary(bulletsText, nextValue);
        }}
        placeholder="SQL, JOIN, index"
        value={keyTermsText}
      />
    </div>
  );
};

const NoteEditor = ({
  content,
  onChange,
  disabled,
}: {
  content: NoteContent;
  onChange: (next: NoteContent) => void;
  disabled?: boolean;
}) => {
  const [body, setBody] = useState(content.body);
  const [tagsText, setTagsText] = useState((content.tags ?? []).join(', '));

  useEffect(() => {
    setBody(content.body);
    setTagsText((content.tags ?? []).join(', '));
  }, [content]);

  const buildNextNote = (nextBody: string, nextTagsText: string) => {
    const tags = nextTagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onChange({
      body: nextBody,
      ...(tags.length > 0 ? { tags } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
        Note body
      </label>
      <textarea
        className={`${textareaClassName} min-h-[180px]`}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          setBody(nextValue);
          buildNextNote(nextValue, tagsText);
        }}
        value={body}
      />
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
        Tags
      </label>
      <input
        className={inputClassName}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          setTagsText(nextValue);
          buildNextNote(body, nextValue);
        }}
        placeholder="sql, joins, practice"
        value={tagsText}
      />
    </div>
  );
};

const FlashcardEditor = ({
  content,
  onChange,
  disabled,
}: {
  content: FlashcardCard[];
  onChange: (next: FlashcardCard[]) => void;
  disabled?: boolean;
}) => {
  const updateCard = (index: number, patch: Partial<FlashcardCard>) => {
    onChange(
      content.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card,
      ),
    );
  };

  return (
    <div className="space-y-3">
      {content.map((card, index) => (
        <div
          className="space-y-2 rounded-2xl border border-black/[0.06] bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/40"
          key={index}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
            Card {index + 1}
          </p>
          <input
            className={inputClassName}
            disabled={disabled}
            onChange={(event) => updateCard(index, { front: event.target.value })}
            placeholder="Front"
            value={card.front}
          />
          <textarea
            className={`${textareaClassName} min-h-[88px]`}
            disabled={disabled}
            onChange={(event) => updateCard(index, { back: event.target.value })}
            placeholder="Back"
            value={card.back}
          />
        </div>
      ))}
    </div>
  );
};

const QuizEditor = ({
  content,
  onChange,
  disabled,
}: {
  content: QuizQuestion[];
  onChange: (next: QuizQuestion[]) => void;
  disabled?: boolean;
}) => {
  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    onChange(
      content.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question,
      ),
    );
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const nextOptions = content[questionIndex]?.options.map((option, currentIndex) =>
      currentIndex === optionIndex ? value : option,
    ) ?? [];

    updateQuestion(questionIndex, { options: nextOptions });
  };

  return (
    <div className="space-y-3">
      {content.map((question, index) => (
        <div
          className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/40"
          key={index}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
            Question {index + 1}
          </p>
          <textarea
            className={`${textareaClassName} min-h-[92px]`}
            disabled={disabled}
            onChange={(event) => updateQuestion(index, { question: event.target.value })}
            value={question.question}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {question.options.map((option, optionIndex) => (
              <input
                className={inputClassName}
                disabled={disabled}
                key={optionIndex}
                onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                value={option}
              />
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[160px,1fr]">
            <select
              className={inputClassName}
              disabled={disabled}
              onChange={(event) => updateQuestion(index, { answer: Number(event.target.value) })}
              value={String(question.answer)}
            >
              <option value="0">Correct: A</option>
              <option value="1">Correct: B</option>
              <option value="2">Correct: C</option>
              <option value="3">Correct: D</option>
            </select>
            <textarea
              className={`${textareaClassName} min-h-[88px]`}
              disabled={disabled}
              onChange={(event) => updateQuestion(index, { explanation: event.target.value })}
              placeholder="Explanation"
              value={question.explanation ?? ''}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ArtifactPreviewEditor = ({
  type,
  content,
  onChange,
  disabled = false,
}: ArtifactPreviewEditorProps) => {
  if (type === 'summary') {
    return (
      <SummaryEditor
        content={content as SummaryContent}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (type === 'note') {
    return (
      <NoteEditor
        content={content as NoteContent}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (type === 'flashcard_set') {
    return (
      <FlashcardEditor
        content={content as FlashcardCard[]}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  return (
    <QuizEditor
      content={content as QuizQuestion[]}
      disabled={disabled}
      onChange={onChange}
    />
  );
};
