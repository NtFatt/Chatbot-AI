import * as v2 from './l4-curated-examples-v2.mjs';
import * as v3 from './l4-curated-examples-v3.mjs';

export const CURATED_DATASET_DEFINITIONS = {
  v2: {
    version: 'v2',
    numericVersion: 2,
    name: v2.CURATED_DATASET_NAME,
    description: v2.CURATED_DATASET_DESCRIPTION,
    buildExamples: v2.buildCuratedTrainingExamples,
    getCategoryDistribution: v2.getCategoryDistribution,
  },
  v3: {
    version: 'v3',
    numericVersion: 3,
    name: v3.CURATED_DATASET_NAME,
    description: v3.CURATED_DATASET_DESCRIPTION,
    buildExamples: v3.buildCuratedTrainingExamples,
    getCategoryDistribution: v3.getCategoryDistribution,
  },
};

export const LATEST_STABLE_CURATED_VERSION = 'v3';

export const getCuratedDatasetDefinition = (version = LATEST_STABLE_CURATED_VERSION) => {
  const key = String(version || LATEST_STABLE_CURATED_VERSION).toLowerCase();
  const definition = CURATED_DATASET_DEFINITIONS[key];
  if (!definition) {
    throw new Error(
      `Unsupported curated dataset version "${version}". Supported versions: ${Object.keys(CURATED_DATASET_DEFINITIONS).join(', ')}`,
    );
  }
  return definition;
};
