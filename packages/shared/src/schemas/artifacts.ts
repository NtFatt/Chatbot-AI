import { z } from 'zod';

export const artifactTypeSchema = z.enum(['summary', 'flashcard_set', 'quiz_set', 'note']);

export const generateArtifactSchema = z.object({
  sessionId: z.string().uuid().optional(),
  messageId: z.string().optional(),
  type: artifactTypeSchema,
  sourceContent: z.string().trim().min(10, 'Content too short to generate artifact.').max(50000),
});

export const artifactParamSchema = z.object({
  id: z.string().uuid(),
});

export const artifactQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  type: artifactTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});
