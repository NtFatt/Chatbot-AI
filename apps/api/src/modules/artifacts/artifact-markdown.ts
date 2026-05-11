import type {
  ArtifactContent,
  ArtifactType,
  FlashcardCard,
  NoteContent,
  QuizQuestion,
  SummaryContent,
} from '@chatbot-ai/shared';

const artifactTypeHeading: Record<ArtifactType, string> = {
  summary: 'Summary',
  flashcard_set: 'Flashcards',
  quiz_set: 'Quiz',
  note: 'Note',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'study-artifact';

const renderSummaryMarkdown = (content: SummaryContent) => {
  const lines = [
    '## Summary',
    '',
    ...content.bullets.map((bullet) => `- ${bullet}`),
  ];

  if (content.keyTerms?.length) {
    lines.push('', '## Key Terms', '', ...content.keyTerms.map((term) => `- ${term}`));
  }

  return lines.join('\n');
};

const renderNoteMarkdown = (content: NoteContent) => {
  const lines = [
    '## Note',
    '',
    content.body.trim(),
  ];

  if (content.tags?.length) {
    lines.push('', '## Tags', '', ...content.tags.map((tag) => `- ${tag}`));
  }

  return lines.join('\n');
};

const renderFlashcardMarkdown = (content: FlashcardCard[]) => [
  '## Flashcards',
  '',
  ...content.flatMap((card, index) => [
    `### Card ${index + 1}`,
    '',
    `**Front:** ${card.front}`,
    '',
    `**Back:** ${card.back}`,
    '',
  ]),
].join('\n').trimEnd();

const optionLetter = (index: number) => String.fromCharCode(65 + index);

const renderQuizMarkdown = (content: QuizQuestion[]) => [
  '## Quiz',
  '',
  ...content.flatMap((question, index) => {
    const correctOption = optionLetter(question.answer);
    return [
      `### Question ${index + 1}`,
      '',
      question.question,
      '',
      ...question.options.map((option, optionIndex) => `- ${optionLetter(optionIndex)}. ${option}`),
      '',
      `**Correct answer:** ${correctOption}`,
      ...(question.explanation ? ['', `**Explanation:** ${question.explanation}`] : []),
      '',
    ];
  }),
].join('\n').trimEnd();

export const buildArtifactMarkdown = (artifact: {
  title: string;
  type: ArtifactType;
  createdAt: Date;
  content: ArtifactContent;
}) => {
  const heading = artifactTypeHeading[artifact.type] ?? 'Artifact';
  const frontmatter = [
    `# ${artifact.title}`,
    '',
    `- Type: ${heading}`,
    `- Created: ${artifact.createdAt.toISOString()}`,
    '',
  ];

  const body =
    artifact.type === 'summary'
      ? renderSummaryMarkdown(artifact.content as SummaryContent)
      : artifact.type === 'note'
        ? renderNoteMarkdown(artifact.content as NoteContent)
        : artifact.type === 'flashcard_set'
          ? renderFlashcardMarkdown(artifact.content as FlashcardCard[])
          : renderQuizMarkdown(artifact.content as QuizQuestion[]);

  return {
    markdown: [...frontmatter, body].join('\n'),
    filename: `${slugify(artifact.title)}.md`,
  };
};
