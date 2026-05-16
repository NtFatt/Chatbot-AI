import { batch1Profiles } from './l4-curated-examples-v3-batch1.mjs';
import { batch2Profiles } from './l4-curated-examples-v3-batch2.mjs';
import { batch3Profiles } from './l4-curated-examples-v3-batch3.mjs';
import { batch4Profiles } from './l4-curated-examples-v3-batch4.mjs';
import { batch5Profiles } from './l4-curated-examples-v3-batch5.mjs';
import { batch6Profiles } from './l4-curated-examples-v3-batch6.mjs';
import { buildExamplesFromProfiles } from './l4-curated-examples-v3-shared.mjs';

export const CURATED_DATASET_NAME = 'DEV Curated L4 Tutor v3';
export const CURATED_DATASET_DESCRIPTION =
  'DEV-ONLY curated synthetic Vietnamese tutor examples for Local LoRA training quality improvement. 300 examples across 10 categories. Not real user data.';

const allProfiles = [
  ...batch1Profiles,
  ...batch2Profiles,
  ...batch3Profiles,
  ...batch4Profiles,
  ...batch5Profiles,
  ...batch6Profiles,
];

const rawExamples = buildExamplesFromProfiles(allProfiles);

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
  status: raw.status,
});

export const buildCuratedTrainingExamples = () => rawExamples.map(toTrainingExample);

export const getCategoryDistribution = () =>
  rawExamples.reduce((acc, example) => {
    acc[example.category] = (acc[example.category] || 0) + 1;
    return acc;
  }, {});

export const getCuratedProfileCount = () => allProfiles.length;
