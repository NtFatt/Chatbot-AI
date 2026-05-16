import { describe, expect, it, vi } from 'vitest';

import {
  CURATED_DATASET_NAME,
  buildCuratedTrainingExamples,
  getCategoryDistribution,
  seedCuratedDataset,
} from '../../../scripts/seed-l4-curated-training-data.mjs';

describe('seed-l4-curated-training-data', () => {
  it('builds exactly 100 approved synthetic examples with unique source ids', () => {
    const examples = buildCuratedTrainingExamples();
    const sourceIds = new Set(examples.map((e) => e.sourceId));
    expect(examples).toHaveLength(100);
    expect(sourceIds.size).toBe(100);
    expect(examples.every((e) => e.status === 'approved')).toBe(true);
    expect(examples.every((e) => e.sourceId.startsWith('dev-curated-'))).toBe(true);
  });

  it('has exactly 10 categories with 10 examples each', () => {
    const dist = getCategoryDistribution();
    const categories = Object.keys(dist).sort();
    expect(categories).toHaveLength(10);
    for (const cat of categories) {
      expect(dist[cat]).toBe(10);
    }
  });

  it('contains Vietnamese characters in all outputs', () => {
    const examples = buildCuratedTrainingExamples();
    const vietPattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    for (const ex of examples) {
      expect(vietPattern.test(ex.idealResponse)).toBe(true);
    }
  });

  it('has no empty prompts or outputs', () => {
    const examples = buildCuratedTrainingExamples();
    for (const ex of examples) {
      expect(ex.inputMessages[0].content.trim().length).toBeGreaterThan(0);
      expect(ex.idealResponse.trim().length).toBeGreaterThan(0);
    }
  });

  it('is idempotent: creates only missing examples on second run', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'ds-v2', name: CURATED_DATASET_NAME,
      description: 'old', status: 'draft',
    });
    const update = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      { sourceId: 'dev-curated-v2-ec-001' },
      { sourceId: 'dev-curated-v2-ec-002' },
    ]);
    const createMany = vi.fn().mockResolvedValue({ count: 98 });
    const count = vi.fn().mockResolvedValue(100);
    const prisma = {
      trainingDataset: { findFirst, create: vi.fn(), update },
      trainingExample: { findMany, createMany, count },
    };

    const result = await seedCuratedDataset(prisma, { dryRun: false, limit: 0 });
    expect(update).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(createMany.mock.calls[0][0].data).toHaveLength(98);
    expect(result.insertedExamples).toBe(98);
    expect(result.approvedExamples).toBe(100);
  });

  it('dry-run does not write to database', async () => {
    const prisma = {
      trainingDataset: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      trainingExample: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    };
    const result = await seedCuratedDataset(prisma, { dryRun: true });
    expect(prisma.trainingDataset.create).not.toHaveBeenCalled();
    expect(prisma.trainingExample.createMany).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.totalExamples).toBe(100);
  });

  it('respects --limit option', async () => {
    const prisma = {
      trainingDataset: { findFirst: vi.fn().mockResolvedValue(null) },
      trainingExample: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn(), count: vi.fn() },
    };
    const result = await seedCuratedDataset(prisma, { dryRun: true, limit: 25 });
    expect(result.totalExamples).toBe(25);
  });
});
