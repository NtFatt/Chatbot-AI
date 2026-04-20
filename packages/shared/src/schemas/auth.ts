import { z } from 'zod';

import { APP_LANGUAGES, MAX_DISPLAY_NAME_CHARS } from '../constants/ui';

export const loginSchema = z.object({
  mode: z.literal('guest'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name is required.')
    .max(MAX_DISPLAY_NAME_CHARS, 'Display name is too long.'),
  preferredLanguage: z.enum(APP_LANGUAGES).default('bilingual'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
