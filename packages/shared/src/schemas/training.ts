import { z } from 'zod';

export const trainingDatasetStatusSchema = z.enum(['draft', 'active', 'archived']);
export const trainingExampleSourceTypeSchema = z.enum([
  'chat_message',
  'artifact_refinement',
  'manual',
]);
export const trainingExampleStatusSchema = z.enum(['draft', 'approved', 'rejected']);
export const trainingDatasetExportFormatSchema = z.enum(['openai_jsonl', 'hf_chat']);

export const trainingMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1).max(12_000),
});

export const createTrainingDatasetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500).optional(),
  status: trainingDatasetStatusSchema.optional().default('draft'),
});

export const trainingDatasetParamSchema = z.object({
  id: z.string().uuid(),
});

export const createTrainingExampleSchema = z.object({
  sourceType: trainingExampleSourceTypeSchema,
  sourceId: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(80).optional(),
  topic: z.string().trim().min(1).max(120).optional(),
  learningMode: z.string().trim().min(1).max(80).optional(),
  userLevel: z.string().trim().min(1).max(80).optional(),
  inputMessages: z.array(trainingMessageSchema).min(1).max(20),
  idealResponse: z.string().trim().min(1).max(12_000),
  qualityScore: z.number().int().min(1).max(5).optional().default(3),
  status: trainingExampleStatusSchema.optional().default('draft'),
});

export const updateTrainingExampleSchema = z.object({
  sourceType: trainingExampleSourceTypeSchema.optional(),
  sourceId: z.string().trim().min(1).max(120).nullable().optional(),
  subject: z.string().trim().min(1).max(80).nullable().optional(),
  topic: z.string().trim().min(1).max(120).nullable().optional(),
  learningMode: z.string().trim().min(1).max(80).nullable().optional(),
  userLevel: z.string().trim().min(1).max(80).nullable().optional(),
  inputMessages: z.array(trainingMessageSchema).min(1).max(20).optional(),
  idealResponse: z.string().trim().min(1).max(12_000).optional(),
  qualityScore: z.number().int().min(1).max(5).optional(),
  status: trainingExampleStatusSchema.optional(),
});

export const trainingExampleParamSchema = z.object({
  id: z.string().uuid(),
});

export const trainingDatasetExportQuerySchema = z.object({
  format: trainingDatasetExportFormatSchema,
});
