import { truncateText } from '../../utils/text';

const MAX_RESPONSE_CHARS = 16_000;

const normalizeMarkdown = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

export const sanitizeAIResponse = (value: string) => {
  const normalized = truncateText(normalizeMarkdown(value), MAX_RESPONSE_CHARS);
  return normalized.trim();
};

export const isRenderableAIResponse = (value: string) => /[\p{L}\p{N}]/u.test(value) && value.trim().length >= 8;
