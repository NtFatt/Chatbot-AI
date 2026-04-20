import { z } from 'zod';

import { PROVIDER_KEYS } from '../constants/providers';
import { MAX_MESSAGE_CHARS, MAX_SESSION_TITLE_CHARS } from '../constants/ui';

export const createChatSessionSchema = z.object({
  title: z.string().trim().min(1).max(MAX_SESSION_TITLE_CHARS).optional(),
  providerPreference: z.enum(PROVIDER_KEYS).default('GEMINI'),
});

export const updateChatSessionSchema = z.object({
  title: z.string().trim().min(1).max(MAX_SESSION_TITLE_CHARS).optional(),
  providerPreference: z.enum(PROVIDER_KEYS).optional(),
});

export const askChatSchema = z.object({
  sessionId: z.string().uuid(),
  clientMessageId: z.string().min(8).max(100),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(MAX_MESSAGE_CHARS, 'Message is too long.'),
  provider: z.enum(PROVIDER_KEYS).optional(),
});

export const sessionParamSchema = z.object({
  id: z.string().uuid(),
});
