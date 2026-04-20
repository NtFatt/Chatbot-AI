export const APP_LANGUAGES = ['vi', 'en', 'bilingual'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const MATERIAL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type MaterialLevel = (typeof MATERIAL_LEVELS)[number];

export const MATERIAL_TYPES = ['pdf', 'video', 'slide', 'article', 'textbook', 'exercise'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const SENDER_TYPES = ['user', 'assistant', 'system'] as const;
export type SenderType = (typeof SENDER_TYPES)[number];

export const MESSAGE_STATUSES = ['sending', 'streaming', 'sent', 'failed', 'needs_sync'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const AI_FINISH_REASONS = ['stop', 'length', 'error', 'unknown'] as const;
export type AIFinishReason = (typeof AI_FINISH_REASONS)[number];

export const MAX_MESSAGE_CHARS = 4000;
export const MAX_DISPLAY_NAME_CHARS = 80;
export const MAX_SESSION_TITLE_CHARS = 120;
export const DEFAULT_MESSAGE_WINDOW = 10;
