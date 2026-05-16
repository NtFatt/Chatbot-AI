import { describe, expect, it, vi } from 'vitest';

import {
  LATEST_STABLE_CURATED_VERSION,
  buildCuratedTrainingExamples,
  getCategoryDistribution,
  getCuratedDatasetDefinition,
  seedCuratedDataset,
} from '../../../scripts/seed-l4-curated-training-data.mjs';

describe('seed-l4-curated-training-data', () => {
  it('defaults to the latest stable curated version', () => {
    expect(LATEST_STABLE_CURATED_VERSION).toBe('v3');
    expect(getCuratedDatasetDefinition().name).toBe('DEV Curated L4 Tutor v3');
  });

  it('builds exactly 300 approved synthetic v3 examples with unique source ids', () => {
    const examples = buildCuratedTrainingExamples({ version: 'v3' });
    const sourceIds = new Set(examples.map((example) => example.sourceId));

    expect(examples).toHaveLength(300);
    expect(sourceIds.size).toBe(300);
    expect(examples.every((example) => example.status === 'approved')).toBe(true);
    expect(examples.every((example) => example.sourceId.startsWith('dev-curated-v3-'))).toBe(true);
  });

  it('still supports the v2 dataset definition', () => {
    const examples = buildCuratedTrainingExamples({ version: 'v2' });
    expect(examples).toHaveLength(100);
  });

  it('has exactly 10 categories with 30 examples each for v3', () => {
    const dist = getCategoryDistribution({ version: 'v3' });
    const categories = Object.keys(dist).sort();

    expect(categories).toHaveLength(10);
    for (const category of categories) {
      expect(dist[category]).toBe(30);
    }
  });

  it('contains Vietnamese characters in all v3 outputs', () => {
    const examples = buildCuratedTrainingExamples({ version: 'v3' });
    const vietnamesePattern =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

    for (const example of examples) {
      expect(vietnamesePattern.test(example.idealResponse)).toBe(true);
    }
  });

  it('has no empty prompts or outputs in v3', () => {
    const examples = buildCuratedTrainingExamples({ version: 'v3' });
    for (const example of examples) {
      expect(example.inputMessages[0].content.trim().length).toBeGreaterThan(0);
      expect(example.idealResponse.trim().length).toBeGreaterThan(0);
    }
  });

  it('is idempotent by sourceId and prompt content', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'ds-v3',
      name: 'DEV Curated L4 Tutor v3',
      description: 'old',
      status: 'draft',
      version: 1,
    });
    const update = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      { sourceId: 'dev-curated-v3-ec-java-encapsulation', inputMessages: [{ role: 'user', content: 'Giải thích tính đóng gói trong Java cho người mới bằng ví dụ ngắn.' }] },
      { sourceId: 'legacy-duplicate', inputMessages: [{ role: 'user', content: 'Cho mình một ví dụ ngắn về dictionary trong Python và nói vì sao ví dụ đó đúng.' }] },
    ]);
    const createMany = vi.fn().mockResolvedValue({ count: 298 });
    const count = vi.fn().mockResolvedValue(300);
    const prisma = {
      trainingDataset: { findFirst, create: vi.fn(), update },
      trainingExample: { findMany, createMany, count },
    };

    const result = await seedCuratedDataset(prisma, { dryRun: false, version: 'v3' });

    expect(update).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(createMany.mock.calls[0][0].data).toHaveLength(298);
    expect(result.insertedExamples).toBe(298);
    expect(result.skippedExamples).toBe(2);
    expect(result.approvedExamples).toBe(300);
  });

  it('dry-run does not write to database', async () => {
    const prisma = {
      trainingDataset: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      trainingExample: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    };

    const result = await seedCuratedDataset(prisma, { dryRun: true, version: 'v3' });

    expect(prisma.trainingDataset.create).not.toHaveBeenCalled();
    expect(prisma.trainingExample.createMany).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.totalExamples).toBe(300);
  });

  it('respects --limit option for v3', async () => {
    const prisma = {
      trainingDataset: { findFirst: vi.fn().mockResolvedValue(null) },
      trainingExample: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn(), count: vi.fn() },
    };

    const result = await seedCuratedDataset(prisma, {
      dryRun: true,
      version: 'v3',
      limit: 25,
    });

    expect(result.totalExamples).toBe(25);
  });
});
