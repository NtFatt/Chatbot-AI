import { z } from 'zod';

import { EXTERNAL_PROVIDER_KEYS } from '../constants/providers';
import { trainingMessageSchema } from './training';

export const evalCategorySchema = z.enum([
  'explain_concept',
  'give_example',
  'compare_concepts',
  'socratic_hint',
  'grade_answer',
  'correct_student_answer',
  'generate_quiz',
  'generate_flashcards',
  'summarize_lesson',
  'study_plan',
  'source_grounded_answer',
  'fallback_transparency',
]);

export const createEvalCaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500).optional(),
  category: evalCategorySchema,
  inputMessages: z.array(trainingMessageSchema).min(1).max(20),
  idealResponse: z.string().trim().min(1).max(12_000).optional(),
  scoringNotes: z.string().trim().min(1).max(1_000).optional(),
});

export const updateEvalCaseSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(500).nullable().optional(),
  category: evalCategorySchema.optional(),
  inputMessages: z.array(trainingMessageSchema).min(1).max(20).optional(),
  idealResponse: z.string().trim().min(1).max(12_000).nullable().optional(),
  scoringNotes: z.string().trim().min(1).max(1_000).nullable().optional(),
});

export const evalCaseParamSchema = z.object({
  id: z.string().uuid(),
});

export const createEvalRunSchema = z.object({
  provider: z.enum([...EXTERNAL_PROVIDER_KEYS, 'internal_l3_tutor', 'local_lora'] as const).optional(),
  model: z.string().trim().min(1).max(160).optional(),
  modelVersionId: z.string().uuid().optional(),
  evalCaseIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  notes: z.string().trim().min(1).max(500).optional(),
});
