import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  LATEST_STABLE_CURATED_VERSION,
  getCuratedDatasetDefinition,
} from './data/l4-curated-dataset-registry.mjs';

export { LATEST_STABLE_CURATED_VERSION, getCuratedDatasetDefinition };

const latestDefinition = getCuratedDatasetDefinition(LATEST_STABLE_CURATED_VERSION);

export const CURATED_DATASET_NAME = latestDefinition.name;
export const CURATED_DATASET_DESCRIPTION = latestDefinition.description;
export const buildCuratedTrainingExamples = (options = {}) =>
  getCuratedDatasetDefinition(options.version).buildExamples();
export const getCategoryDistribution = (options = {}) =>
  getCuratedDatasetDefinition(options.version).getCategoryDistribution();

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: 0,
    version: LATEST_STABLE_CURATED_VERSION,
    datasetName: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--limit') {
      options.limit = parseInt(argv[++index] || '0', 10);
    } else if (arg === '--version') {
      options.version = argv[++index] || options.version;
    } else if (arg === '--dataset-name') {
      options.datasetName = argv[++index] || '';
    }
  }

  return options;
}

const normalizePrompt = (inputMessages) =>
  (Array.isArray(inputMessages) ? inputMessages : [])
    .map((message) => (typeof message?.content === 'string' ? message.content.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const buildDistribution = (examples) =>
  examples.reduce((acc, example) => {
    const category = example.learningMode || example.topic || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

const buildDryRunPrisma = () => ({
  trainingDataset: {
    findFirst: async () => null,
    create: async () => null,
    update: async () => null,
  },
  trainingExample: {
    findMany: async () => [],
    createMany: async () => ({ count: 0 }),
    count: async () => 0,
  },
});

export async function seedCuratedDataset(prisma = new PrismaClient(), options = {}) {
  const version = options.version || LATEST_STABLE_CURATED_VERSION;
  const definition = getCuratedDatasetDefinition(version);
  const datasetName = options.datasetName?.trim() || definition.name;
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 0;
  const dryRun = Boolean(options.dryRun);

  let examples = definition.buildExamples();
  if (limit > 0) {
    examples = examples.slice(0, limit);
  }

  const uniquePromptSet = new Set();
  const normalizedExamples = examples.filter((example) => {
    const prompt = normalizePrompt(example.inputMessages);
    if (!prompt || uniquePromptSet.has(prompt)) {
      return false;
    }
    uniquePromptSet.add(prompt);
    return true;
  });

  const dataset =
    (await prisma.trainingDataset.findFirst({ where: { name: datasetName } })) ??
    (dryRun
      ? {
          id: `dry-run-${definition.version}`,
          name: datasetName,
          description: definition.description,
          status: 'active',
          version: definition.numericVersion,
        }
      : await prisma.trainingDataset.create({
          data: {
            name: datasetName,
            description: definition.description,
            status: 'active',
            version: definition.numericVersion,
          },
        }));

  if (
    !dryRun &&
    (dataset.description !== definition.description ||
      dataset.status !== 'active' ||
      dataset.version !== definition.numericVersion)
  ) {
    await prisma.trainingDataset.update({
      where: { id: dataset.id },
      data: {
        description: definition.description,
        status: 'active',
        version: definition.numericVersion,
      },
    });
  }

  const existingExamples = await prisma.trainingExample.findMany({
    where: { datasetId: dataset.id },
    select: { sourceId: true, inputMessages: true },
  });

  const existingSourceIds = new Set(existingExamples.map((item) => item.sourceId).filter(Boolean));
  const existingPrompts = new Set(existingExamples.map((item) => normalizePrompt(item.inputMessages)).filter(Boolean));

  const toCreate = normalizedExamples.filter((example) => {
    const prompt = normalizePrompt(example.inputMessages);
    return !existingSourceIds.has(example.sourceId) && !existingPrompts.has(prompt);
  });

  if (!dryRun && toCreate.length > 0) {
    await prisma.trainingExample.createMany({
      data: toCreate.map((example) => ({
        datasetId: dataset.id,
        sourceType: example.sourceType,
        sourceId: example.sourceId,
        subject: example.subject,
        topic: example.topic,
        learningMode: example.learningMode,
        userLevel: example.userLevel,
        inputMessages: example.inputMessages,
        idealResponse: example.idealResponse,
        qualityScore: example.qualityScore,
        status: example.status,
      })),
    });
  }

  const approvedCount = dryRun
    ? existingExamples.length + toCreate.length
    : await prisma.trainingExample.count({ where: { datasetId: dataset.id, status: 'approved' } });
  const distribution = buildDistribution(normalizedExamples);
  const skippedExamples = normalizedExamples.length - toCreate.length;

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Seed dataset: ${datasetName}`);
  console.log(`version: ${definition.version}`);
  console.log(`datasetId: ${dataset.id}`);
  console.log(`totalExamples: ${normalizedExamples.length}`);
  console.log(`insertedExamples: ${toCreate.length}`);
  console.log(`skippedExamples: ${skippedExamples}`);
  console.log(`approvedExamples: ${approvedCount}`);
  console.log('--- Category Distribution ---');
  for (const [category, count] of Object.entries(distribution).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${category}: ${count}`);
  }

  return {
    datasetId: dataset.id,
    datasetName,
    version: definition.version,
    totalExamples: normalizedExamples.length,
    insertedExamples: toCreate.length,
    skippedExamples,
    approvedExamples: approvedCount,
    dryRun,
  };
}

const runFromCli = async () => {
  const options = parseArgs(process.argv.slice(2));
  const prisma = options.dryRun ? buildDryRunPrisma() : new PrismaClient();

  try {
    await seedCuratedDataset(prisma, options);
    if (!options.dryRun && '$disconnect' in prisma) {
      await prisma.$disconnect();
    }
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    if (!options.dryRun && '$disconnect' in prisma) {
      await prisma.$disconnect();
    }
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
