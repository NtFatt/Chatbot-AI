import { DEFAULT_MESSAGE_WINDOW } from '@chatbot-ai/shared';

const stopwords = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'this',
  'from',
  'have',
  'what',
  'your',
  'into',
  'when',
  'where',
  'which',
  'about',
  'please',
  'explain',
  'help',
  'toi',
  'la',
  'va',
  'cho',
  'cac',
  'mot',
  'nhung',
  'giai',
  'thich',
  'giup',
  'minh',
  'voi',
  'nhu',
  'nao',
  'tai',
  'sao',
]);

export const sanitizeInput = (value: string) => value.replace(/\u0000/g, '').trim();

export const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

export const buildSessionTitle = (message: string) => {
  // Strip markdown code fences and inline code
  let cleaned = message.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  // Strip common question/task prefixes in English and Vietnamese
  cleaned = cleaned.replace(
    /^(explain|giải thích|what is|what's|how to|how do|why\b|show me|write a|tạo|viết|tìm hiểu|bài học|lesson|làm sao|cho tôi|hãy|mình)\s*[:-]?\s*/i,
    '',
  );
  // Strip leading whitespace after stripping
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (!cleaned) return truncateText(message.replace(/\s+/g, ' '), 64);
  return truncateText(cleaned, 64);
};

export const buildContextSummary = (messages: string[]) => {
  const combined = messages
    .slice(-DEFAULT_MESSAGE_WINDOW)
    .map((message) => message.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' | ');

  return truncateText(combined, 420);
};

export const extractKeywords = (input: string) => {
  const words = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopwords.has(word));

  return Array.from(new Set(words)).slice(0, 20);
};

export const sliceRecentMessages = <T>(items: T[], limit: number) => items.slice(Math.max(items.length - limit, 0));
