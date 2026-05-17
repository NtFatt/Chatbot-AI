import { batch2Profiles } from './l4-curated-examples-v3-batch2.mjs';
import { batch3Profiles } from './l4-curated-examples-v3-batch3.mjs';

export const v4Batch2Profiles = [
  ...batch2Profiles.slice(1),
  batch3Profiles[0],
  batch3Profiles[1],
];
