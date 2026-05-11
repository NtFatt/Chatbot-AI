import { z } from 'zod';

export const modelVersionProviderSchema = z.enum([
  'gemini',
  'openai',
  'fine_tuned_openai',
  'local_ollama',
  'local_lora',
]);
export const modelVersionStatusSchema = z.enum([
  'draft',
  'training',
  'ready',
  'failed',
  'archived',
]);
export const trainingJobStatusSchema = z.enum([
  'draft',
  'queued',
  'running',
  'succeeded',
  'failed',
]);

export const modelVersionParamSchema = z.object({
  id: z.string().uuid(),
});

export const createTrainingJobSchema = z.object({
  datasetId: z.string().uuid(),
  provider: modelVersionProviderSchema,
  baseModel: z.string().trim().min(1).max(160),
});
