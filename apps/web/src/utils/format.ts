import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatRelativeTime = (value: string) =>
  formatDistanceToNow(new Date(value), {
    addSuffix: true,
    locale: vi,
  });

export const stripMarkdownPreview = (value?: string | null) =>
  (value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[##_~*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
