import { z } from 'zod';

import { EXTERNAL_PROVIDER_KEYS } from '../constants/providers';
import {
  MATERIAL_LEVELS,
  MAX_MESSAGE_CHARS,
  MAX_SESSION_TITLE_CHARS,
} from '../constants/ui';
import { aiRuntimeModeSchema } from './ai-runtime';

export const createChatSessionSchema = z.object({
  title: z.string().trim().min(1).max(MAX_SESSION_TITLE_CHARS).optional(),
  providerPreference: z.enum(EXTERNAL_PROVIDER_KEYS).default('GEMINI'),
  aiRuntimeMode: aiRuntimeModeSchema.optional(),
});

export const updateChatSessionSchema = z.object({
  title: z.string().trim().min(1).max(MAX_SESSION_TITLE_CHARS).optional(),
  providerPreference: z.enum(EXTERNAL_PROVIDER_KEYS).optional(),
  aiRuntimeMode: aiRuntimeModeSchema.optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const askChatSchema = z.object({
  sessionId: z.string().uuid(),
  clientMessageId: z.string().min(8).max(100),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(MAX_MESSAGE_CHARS, 'Message is too long.'),
  provider: z.enum(EXTERNAL_PROVIDER_KEYS).optional(),
});

export const sessionParamSchema = z.object({
  id: z.string().uuid(),
});

export const sessionSearchSchema = z.object({
  q: z.string().trim().min(1).max(200).default(''),
});

export const globalSearchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const sessionListQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const confidenceScoreSchema = z.number().min(0).max(1);

const nullableTrimmedString = z.string().trim().min(1).max(80).nullable();

export const turnIntelligenceSchema = z.object({
  subjectLabel: nullableTrimmedString,
  topicLabel: z.string().trim().min(1).max(120).nullable(),
  levelLabel: z.enum(MATERIAL_LEVELS).nullable(),
  confidenceScore: confidenceScoreSchema.nullable(),
  titleSuggestion: z.string().trim().min(1).max(MAX_SESSION_TITLE_CHARS).nullable(),
});

export const sessionSummaryIntelligenceSchema = z.object({
  contextSummary: z.string().trim().min(24).max(500),
  subjectLabel: nullableTrimmedString.optional().default(null),
  topicLabel: z.string().trim().min(1).max(120).nullable().optional().default(null),
  levelLabel: z.enum(MATERIAL_LEVELS).nullable().optional().default(null),
  titleSuggestion: z
    .string()
    .trim()
    .min(1)
    .max(MAX_SESSION_TITLE_CHARS)
    .nullable()
    .optional()
    .default(null),
});

export const turnIntelligenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['subjectLabel', 'topicLabel', 'levelLabel', 'confidenceScore', 'titleSuggestion'],
  properties: {
    subjectLabel: { anyOf: [{ type: 'string', minLength: 1, maxLength: 80 }, { type: 'null' }] },
    topicLabel: { anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }] },
    levelLabel: {
      anyOf: [{ type: 'string', enum: [...MATERIAL_LEVELS] }, { type: 'null' }],
    },
    confidenceScore: {
      anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
    },
    titleSuggestion: {
      anyOf: [{ type: 'string', minLength: 1, maxLength: MAX_SESSION_TITLE_CHARS }, { type: 'null' }],
    },
  },
} as const;

export const sessionSummaryIntelligenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['contextSummary', 'subjectLabel', 'topicLabel', 'levelLabel', 'titleSuggestion'],
  properties: {
    contextSummary: { type: 'string', minLength: 24, maxLength: 500 },
    subjectLabel: { anyOf: [{ type: 'string', minLength: 1, maxLength: 80 }, { type: 'null' }] },
    topicLabel: { anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }] },
    levelLabel: {
      anyOf: [{ type: 'string', enum: [...MATERIAL_LEVELS] }, { type: 'null' }],
    },
    titleSuggestion: {
      anyOf: [{ type: 'string', minLength: 1, maxLength: MAX_SESSION_TITLE_CHARS }, { type: 'null' }],
    },
  },
} as const;
