import { z } from 'zod';

export const artifactTypeSchema = z.enum(['summary', 'flashcard_set', 'quiz_set', 'note']);
export const artifactQualityScoreSchema = z.number().min(0).max(1);

export const flashcardCardSchema = z.object({
  front: z.string().trim().min(1).max(220),
  back: z.string().trim().min(1).max(420),
});

export const quizQuestionSchema = z.object({
  question: z.string().trim().min(1).max(260),
  options: z.array(z.string().trim().min(1).max(180)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(320).optional(),
});

export const summaryContentSchema = z.object({
  bullets: z.array(z.string().trim().min(1).max(260)).min(3).max(6),
  keyTerms: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
});

export const noteContentSchema = z.object({
  body: z.string().trim().min(30).max(2400),
  tags: z.array(z.string().trim().min(1).max(32)).min(2).max(6).optional(),
});

export const flashcardSetContentSchema = z.array(flashcardCardSchema).min(4).max(10);
export const quizSetContentSchema = z.array(quizQuestionSchema).min(4).max(8);

export const structuredSummaryArtifactSchema = z.object({
  content: summaryContentSchema,
  qualityScore: artifactQualityScoreSchema.nullable(),
});

export const structuredFlashcardArtifactSchema = z.object({
  content: flashcardSetContentSchema,
  qualityScore: artifactQualityScoreSchema.nullable(),
});

export const structuredQuizArtifactSchema = z.object({
  content: quizSetContentSchema,
  qualityScore: artifactQualityScoreSchema.nullable(),
});

export const structuredNoteArtifactSchema = z.object({
  content: noteContentSchema,
  qualityScore: artifactQualityScoreSchema.nullable(),
});

export const artifactContentSchemasByType = {
  summary: summaryContentSchema,
  flashcard_set: flashcardSetContentSchema,
  quiz_set: quizSetContentSchema,
  note: noteContentSchema,
} as const;

export const structuredArtifactSchemasByType = {
  summary: structuredSummaryArtifactSchema,
  flashcard_set: structuredFlashcardArtifactSchema,
  quiz_set: structuredQuizArtifactSchema,
  note: structuredNoteArtifactSchema,
} as const;

export const structuredArtifactJsonSchemasByType = {
  summary: {
    type: 'object',
    additionalProperties: false,
    required: ['content', 'qualityScore'],
    properties: {
      content: {
        type: 'object',
        additionalProperties: false,
        required: ['bullets'],
        properties: {
          bullets: {
            type: 'array',
            minItems: 3,
            maxItems: 6,
            items: { type: 'string', minLength: 1, maxLength: 260 },
          },
          keyTerms: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
      },
      qualityScore: {
        anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
      },
    },
  },
  flashcard_set: {
    type: 'object',
    additionalProperties: false,
    required: ['content', 'qualityScore'],
    properties: {
      content: {
        type: 'array',
        minItems: 4,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['front', 'back'],
          properties: {
            front: { type: 'string', minLength: 1, maxLength: 220 },
            back: { type: 'string', minLength: 1, maxLength: 420 },
          },
        },
      },
      qualityScore: {
        anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
      },
    },
  },
  quiz_set: {
    type: 'object',
    additionalProperties: false,
    required: ['content', 'qualityScore'],
    properties: {
      content: {
        type: 'array',
        minItems: 4,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer'],
          properties: {
            question: { type: 'string', minLength: 1, maxLength: 260 },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string', minLength: 1, maxLength: 180 },
            },
            answer: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string', minLength: 1, maxLength: 320 },
          },
        },
      },
      qualityScore: {
        anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
      },
    },
  },
  note: {
    type: 'object',
    additionalProperties: false,
    required: ['content', 'qualityScore'],
    properties: {
      content: {
        type: 'object',
        additionalProperties: false,
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 30, maxLength: 2400 },
          tags: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string', minLength: 1, maxLength: 32 },
          },
        },
      },
      qualityScore: {
        anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
      },
    },
  },
} as const;

export const generateArtifactSchema = z.object({
  sessionId: z.string().uuid().optional(),
  messageId: z.string().optional(),
  type: artifactTypeSchema,
  sourceContent: z.string().trim().min(10, 'Content too short to generate artifact.').max(50000),
});

export const artifactParamSchema = z.object({
  id: z.string().uuid(),
});

export const artifactShareTokenParamSchema = z.object({
  shareToken: z
    .string()
    .trim()
    .min(16, 'Share token is invalid.')
    .max(128, 'Share token is invalid.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Share token is invalid.'),
});

export const artifactSearchSchema = z.object({
  q: z.string().trim().min(1, 'Search query is required.').max(200),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: artifactTypeSchema.optional(),
});

export const artifactQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  type: artifactTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});
