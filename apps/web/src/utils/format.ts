import {
  formatDistanceToNow,
  isThisWeek,
  isToday,
  isYesterday,
  subDays,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ChatSessionSummary } from '@chatbot-ai/shared';

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

export const groupSessionsByRecency = (sessions: ChatSessionSummary[]) => {
  const now = new Date();
  const buckets = [
    {
      label: 'Hôm nay',
      match: (date: Date) => isToday(date),
    },
    {
      label: 'Hôm qua',
      match: (date: Date) => isYesterday(date),
    },
    {
      label: '7 ngày gần đây',
      match: (date: Date) => date >= subDays(now, 7),
    },
    {
      label: 'Tuần này',
      match: (date: Date) => isThisWeek(date, { weekStartsOn: 1 }),
    },
  ];

  const pinned: ChatSessionSummary[] = [];
  const byLabel = new Map<string, ChatSessionSummary[]>();
  const older: ChatSessionSummary[] = [];

  sessions.forEach((session) => {
    if (session.isPinned) {
      pinned.push(session);
      return;
    }
    const date = new Date(session.updatedAt);
    const bucket = buckets.find((candidate) => candidate.match(date));
    if (!bucket) {
      older.push(session);
      return;
    }
    const current = byLabel.get(bucket.label) ?? [];
    current.push(session);
    byLabel.set(bucket.label, current);
  });

  const groups = buckets
    .map((bucket) => ({
      label: bucket.label,
      items: byLabel.get(bucket.label) ?? [],
    }))
    .filter((group) => group.items.length > 0);

  if (older.length > 0) {
    groups.push({
      label: 'Cũ hơn',
      items: older,
    });
  }

  return groups;
};

export const groupArchivedSessionsByRecency = (sessions: ChatSessionSummary[]) => {
  const now = new Date();
  const buckets = [
    {
      label: 'Hôm nay',
      match: (date: Date) => isToday(date),
    },
    {
      label: 'Hôm qua',
      match: (date: Date) => isYesterday(date),
    },
    {
      label: '7 ngày gần đây',
      match: (date: Date) => date >= subDays(now, 7),
    },
    {
      label: 'Tuần này',
      match: (date: Date) => isThisWeek(date, { weekStartsOn: 1 }),
    },
  ];

  const byLabel = new Map<string, ChatSessionSummary[]>();
  const older: ChatSessionSummary[] = [];

  sessions.forEach((session) => {
    const date = session.archivedAt ? new Date(session.archivedAt) : new Date(session.updatedAt);
    const bucket = buckets.find((candidate) => candidate.match(date));
    if (!bucket) {
      older.push(session);
      return;
    }
    const current = byLabel.get(bucket.label) ?? [];
    current.push(session);
    byLabel.set(bucket.label, current);
  });

  const groups = buckets
    .map((bucket) => ({
      label: bucket.label,
      items: byLabel.get(bucket.label) ?? [],
    }))
    .filter((group) => group.items.length > 0);

  if (older.length > 0) {
    groups.push({
      label: 'Cũ hơn',
      items: older,
    });
  }

  return groups;
};
