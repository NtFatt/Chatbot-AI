import { batch1Profiles } from './l4-curated-examples-v3-batch1.mjs';
import { batch2Profiles } from './l4-curated-examples-v3-batch2.mjs';

export const v4Batch1Profiles = [
  ...batch1Profiles,
  batch2Profiles[0],
];
