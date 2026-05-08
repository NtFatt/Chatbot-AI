import type {
  ArtifactContent,
  ArtifactGenerateType,
  FlashcardCard,
  NoteContent,
  QuizQuestion,
  SummaryContent,
} from '@chatbot-ai/shared';

const MAX_SENTENCE_LENGTH = 220;
const MIN_SENTENCE_LENGTH = 18;

const normalizeText = (value: string) =>
  value
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitIntoSentences = (content: string) => {
  const normalized = normalizeText(content);
  const sentences = normalized
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);

  if (sentences.length >= 4) {
    return sentences;
  }

  const chunks = normalized
    .split(/[;,:]/u)
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter((chunk) => chunk.length >= MIN_SENTENCE_LENGTH);

  return [...new Set([...sentences, ...chunks])];
};

const truncateSentence = (sentence: string, maxLength = MAX_SENTENCE_LENGTH) =>
  sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trimEnd()}…` : sentence;

const extractKeywords = (content: string, limit = 6) => {
  const matches = content.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [];
  const stopwords = new Set([
    'nhung',
    'những',
    'được',
    'duoc',
    'trong',
    'and',
    'the',
    'this',
    'that',
    'with',
    'các',
    'cac',
    'cho',
    'để',
    'de',
    'cua',
    'của',
    'mot',
    'một',
    'hoặc',
    'hoac',
    'about',
    'from',
    'into',
    'which',
    'khi',
    'đang',
    'dang',
  ]);

  const counts = new Map<string, number>();
  for (const token of matches) {
    if (token.length < 4 || stopwords.has(token)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
};

const buildSummaryFallback = (content: string): SummaryContent => {
  const sentences = splitIntoSentences(content);
  const bullets = (sentences.length > 0 ? sentences : [normalizeText(content)])
    .slice(0, 5)
    .map((sentence) => truncateSentence(sentence, 240));

  while (bullets.length < 3) {
    bullets.push(
      bullets[bullets.length - 1]
        ? `Ý bổ sung ${bullets.length + 1}: ${bullets[bullets.length - 1]}`
        : 'Ý chính cần xem lại trong nội dung gốc để học tiếp.',
    );
  }

  return {
    bullets,
    keyTerms: extractKeywords(content, 5),
  };
};

const buildNoteFallback = (content: string): NoteContent => {
  const summary = buildSummaryFallback(content);
  const tags = (summary.keyTerms ?? []).filter((term): term is string => Boolean(term));
  const body = [
    '## Ghi chú học nhanh',
    ...summary.bullets.map((bullet) => `- ${bullet}`),
    summary.keyTerms && summary.keyTerms.length > 0
      ? `\n## Từ khóa\n${summary.keyTerms.map((term) => `- ${term}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    body,
    tags: tags.length >= 2 ? tags.slice(0, 5) : ['study', 'review'],
  };
};

const buildFlashcardFallback = (content: string): FlashcardCard[] => {
  const sentences = splitIntoSentences(content);
  const keywords = extractKeywords(content, 6);
  const cards: FlashcardCard[] = [];

  for (let index = 0; index < Math.min(4, Math.max(sentences.length, 1)); index += 1) {
    const keyword = keywords[index] ?? `ý chính ${index + 1}`;
    const answer = truncateSentence(sentences[index] ?? normalizeText(content), 360);
    cards.push({
      front: `Trong ngữ cảnh này, "${keyword}" gợi đến điều gì?`,
      back: answer,
    });
  }

  while (cards.length < 4) {
    const source = sentences[cards.length % Math.max(sentences.length, 1)] ?? normalizeText(content);
    cards.push({
      front: `Ý chính số ${cards.length + 1} của nội dung là gì?`,
      back: truncateSentence(source, 360),
    });
  }

  return cards.slice(0, 6);
};

const buildQuizFallback = (content: string): QuizQuestion[] => {
  const sentences = splitIntoSentences(content);
  const optionPool = (sentences.length > 0 ? sentences : [normalizeText(content)])
    .slice(0, 6)
    .map((sentence) => truncateSentence(sentence, 160));

  while (optionPool.length < 4) {
    optionPool.push(`Chi tiết phụ ${optionPool.length + 1} cần đọc lại trong nội dung gốc.`);
  }

  const questions: QuizQuestion[] = [];
  for (let index = 0; index < 4; index += 1) {
    const correct =
      optionPool[index % optionPool.length] ??
      optionPool[0] ??
      'Nội dung chính cần được đối chiếu với tài liệu gốc.';
    const distractors = optionPool.filter((option) => option !== correct).slice(0, 3);
    const options = [correct, ...distractors].slice(0, 4);

    questions.push({
      question: `Nhận định nào bám sát nhất với ý chính số ${index + 1}?`,
      options,
      answer: 0,
      explanation: 'Đáp án đúng được lấy trực tiếp từ các ý chính nổi bật trong nội dung gốc.',
    });
  }

  return questions;
};

export const buildLocalArtifactFallback = (
  type: ArtifactGenerateType,
  content: string,
): { content: ArtifactContent; qualityScore: number | null } => {
  switch (type) {
    case 'summary':
      return { content: buildSummaryFallback(content), qualityScore: null };
    case 'note':
      return { content: buildNoteFallback(content), qualityScore: null };
    case 'flashcard_set':
      return { content: buildFlashcardFallback(content), qualityScore: null };
    case 'quiz_set':
      return { content: buildQuizFallback(content), qualityScore: null };
  }
};
