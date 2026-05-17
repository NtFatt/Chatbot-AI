import { buildTargetedExamplesFromProfiles } from './l4-targeted-examples-v4-shared.mjs';
import { v4Batch1Profiles } from './l4-targeted-examples-v4-batch1.mjs';
import { v4Batch2Profiles } from './l4-targeted-examples-v4-batch2.mjs';
import { v4Batch3Profiles } from './l4-targeted-examples-v4-batch3.mjs';

export const CURATED_DATASET_NAME = 'DEV Targeted L4 Tutor v4';
export const CURATED_DATASET_DESCRIPTION =
  'DEV-ONLY targeted synthetic Vietnamese tutor examples for Local LoRA quality debugging. 180 examples focused on prompt shape, format compliance, groundedness, and concise tutor behavior. Not real user data.';

const allProfiles = [
  ...v4Batch1Profiles,
  ...v4Batch2Profiles,
  ...v4Batch3Profiles,
];

const rawExamples = buildTargetedExamplesFromProfiles(allProfiles);

const toTrainingExample = (raw) => ({
  sourceType: 'manual',
  sourceId: `dev-targeted-v4__${raw.targetedFailureMode}__${raw.targetCategory}__${raw.id}`,
  subject: raw.subject,
  topic: raw.category,
  learningMode: raw.category,
  userLevel: raw.difficulty,
  inputMessages: [{ role: 'user', content: raw.prompt }],
  idealResponse: raw.output,
  qualityScore: 5,
  status: raw.status,
});

export const buildCuratedTrainingExamples = () => rawExamples.map(toTrainingExample);

export const getCategoryDistribution = () =>
  rawExamples.reduce((acc, example) => {
    acc[example.category] = (acc[example.category] || 0) + 1;
    return acc;
  }, {});

export const getFailureModeDistribution = () =>
  rawExamples.reduce((acc, example) => {
    acc[example.targetedFailureMode] = (acc[example.targetedFailureMode] || 0) + 1;
    return acc;
  }, {});

export const getCuratedProfileCount = () => allProfiles.length;
