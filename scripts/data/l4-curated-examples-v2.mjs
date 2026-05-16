/**
 * DEV Curated L4 Tutor v2 - 100 synthetic Vietnamese tutor examples.
 * All content is dev-safe, synthetic, and intended for Local LoRA training pipeline seeding.
 * No real user data. No fake citations. No hallucinated sources.
 *
 * Categories (10 each): explain_concept, give_example, compare_concepts,
 * correct_student_answer, generate_quiz, generate_flashcards,
 * summarize_lesson, study_plan, source_grounded_answer, fallback_transparency.
 */
import { batch1 } from './l4-curated-examples-v2-batch1.mjs';
import { batch2 } from './l4-curated-examples-v2-batch2.mjs';
import { batch3 } from './l4-curated-examples-v2-batch3.mjs';
import { batch4 } from './l4-curated-examples-v2-batch4.mjs';

export const CURATED_DATASET_NAME = 'DEV Curated L4 Tutor v2';
export const CURATED_DATASET_DESCRIPTION =
  'DEV-ONLY curated synthetic Vietnamese tutor examples for Local LoRA training quality improvement. 100 examples across 10 categories. Not real user data.';

const toTrainingExample = (raw) => ({
  sourceType: 'manual',
  sourceId: `dev-curated-${raw.id}`,
  subject: raw.subject,
  topic: raw.category,
  learningMode: raw.category,
  userLevel: raw.difficulty,
  inputMessages: [{ role: 'user', content: raw.prompt }],
  idealResponse: raw.output,
  qualityScore: 4,
  status: 'approved',
  metadata: { source: 'synthetic-curated-dev', version: 'v2', category: raw.category },
});

const allRaw = [...batch1, ...batch2, ...batch3, ...batch4];

export const buildCuratedTrainingExamples = () => allRaw.map(toTrainingExample);

export const getCategoryDistribution = () => {
  const dist = {};
  for (const ex of allRaw) {
    dist[ex.category] = (dist[ex.category] || 0) + 1;
  }
  return dist;
};
