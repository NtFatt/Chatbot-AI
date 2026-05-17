import { batch3Profiles } from './l4-curated-examples-v3-batch3.mjs';
import { batch4Profiles } from './l4-curated-examples-v3-batch4.mjs';

export const v4Batch3Profiles = [
  ...batch3Profiles.slice(2),
  batch4Profiles[0],
  batch4Profiles[1],
  batch4Profiles[2],
];
