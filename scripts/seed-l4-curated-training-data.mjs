import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  CURATED_DATASET_NAME,
  CURATED_DATASET_DESCRIPTION,
  buildCuratedTrainingExamples,
  getCategoryDistribution,
} from './data/l4-curated-examples-v2.mjs';

export { CURATED_DATASET_NAME, CURATED_DATASET_DESCRIPTION, buildCuratedTrainingExamples, getCategoryDistribution };

function parseArgs(argv) {
  let dryRun = false;
  let limit = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--limit') limit = parseInt(argv[++i] || '0', 10);
  }
  return { dryRun, limit };
}

export async function seedCuratedDataset(prisma = new PrismaClient(), options = {}) {
  const { dryRun = false, limit = 0 } = options;
  let examples = buildCuratedTrainingExamples();
  if (limit > 0) examples = examples.slice(0, limit);

  // Find or create dataset
  const dataset =
    (await prisma.trainingDataset.findFirst({ where: { name: CURATED_DATASET_NAME } })) ??
    (dryRun
      ? { id: 'dry-run-id', name: CURATED_DATASET_NAME, description: CURATED_DATASET_DESCRIPTION, status: 'active' }
      : await prisma.trainingDataset.create({
          data: { name: CURATED_DATASET_NAME, description: CURATED_DATASET_DESCRIPTION, status: 'active' },
        }));

  // Update description/status if needed
  if (!dryRun && (dataset.description !== CURATED_DATASET_DESCRIPTION || dataset.status !== 'active')) {
    await prisma.trainingDataset.update({
      where: { id: dataset.id },
      data: { description: CURATED_DATASET_DESCRIPTION, status: 'active' },
    });
  }

  // Find existing to avoid duplicates
  const existing = dryRun
    ? []
    : await prisma.trainingExample.findMany({
        where: { datasetId: dataset.id, sourceId: { in: examples.map((e) => e.sourceId) } },
        select: { sourceId: true },
      });

  const existingIds = new Set(existing.map((e) => e.sourceId).filter(Boolean));
  const toCreate = examples.filter((e) => !existingIds.has(e.sourceId));

  // Insert missing examples
  if (!dryRun && toCreate.length > 0) {
    await prisma.trainingExample.createMany({
      data: toCreate.map((e) => ({
        datasetId: dataset.id,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        subject: e.subject,
        topic: e.topic,
        learningMode: e.learningMode,
        userLevel: e.userLevel,
        inputMessages: e.inputMessages,
        idealResponse: e.idealResponse,
        qualityScore: e.qualityScore,
        status: e.status,
      })),
    });
  }

  const approvedCount = dryRun
    ? examples.length
    : await prisma.trainingExample.count({ where: { datasetId: dataset.id, status: 'approved' } });

  // Category distribution
  const dist = getCategoryDistribution();

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Seed dataset: ${CURATED_DATASET_NAME}`);
  console.log(`datasetId: ${dataset.id}`);
  console.log(`totalExamples: ${examples.length}`);
  console.log(`toInsert: ${toCreate.length}`);
  console.log(`alreadyExist: ${existingIds.size}`);
  console.log(`approvedExamples: ${approvedCount}`);
  console.log('--- Category Distribution ---');
  for (const [cat, count] of Object.entries(dist).sort()) {
    console.log(`  ${cat}: ${count}`);
  }

  return { datasetId: dataset.id, totalExamples: examples.length, insertedExamples: toCreate.length, approvedExamples: approvedCount, dryRun };
}

const runFromCli = async () => {
  const options = parseArgs(process.argv.slice(2));
  const prisma = options.dryRun ? null : new PrismaClient();
  try {
    if (options.dryRun) {
      // Dry run with mock prisma
      const mockPrisma = {
        trainingDataset: { findFirst: async () => null, create: async () => null, update: async () => null },
        trainingExample: { findMany: async () => [], createMany: async () => ({}), count: async () => 0 },
      };
      await seedCuratedDataset(mockPrisma, options);
    } else {
      await seedCuratedDataset(prisma, options);
      await prisma.$disconnect();
    }
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    if (prisma) await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
