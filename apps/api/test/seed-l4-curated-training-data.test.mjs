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
    expect(LATEST_STABLE_CURATED_VERSION).toBe('v4');
    expect(getCuratedDatasetDefinition().name).toBe('DEV Targeted L4 Tutor v4');
  });

  it('builds exactly 180 approved targeted v4 examples with unique source ids', () => {
    const examples = buildCuratedTrainingExamples({ version: 'v4' });
    const sourceIds = new Set(examples.map((example) => example.sourceId));

    expect(examples).toHaveLength(180);
    expect(sourceIds.size).toBe(180);
    expect(examples.every((example) => example.status === 'approved')).toBe(true);
    expect(examples.every((example) => example.sourceId.startsWith('dev-targeted-v4__'))).toBe(true);
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

  it('has exactly 10 categories with 18 examples each for v4', () => {
    const dist = getCategoryDistribution({ version: 'v4' });
    const categories = Object.keys(dist).sort();

    expect(categories).toHaveLength(10);
    for (const category of categories) {
      expect(dist[category]).toBe(18);
    }
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

  it('updates matching source ids instead of inserting duplicates for v4', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'ds-v4',
      name: 'DEV Targeted L4 Tutor v4',
      description: 'old',
      status: 'draft',
      version: 4,
    });
    const update = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'example-1',
        sourceId: 'dev-targeted-v4__too_generic__explain_concept__v4-ec-java-encapsulation',
        subject: 'Java',
        topic: 'explain_concept',
        learningMode: 'explain_concept',
        userLevel: 'beginner',
        inputMessages: [{ role: 'user', content: 'Giải thích tính đóng gói trong Java thật ngắn cho người mới. Có ví dụ, lỗi hay gặp, và 1 câu tự luyện.' }],
        idealResponse: '- Câu trả lời cũ.',
        qualityScore: 3,
        status: 'approved',
      },
    ]);
    const createMany = vi.fn().mockResolvedValue({ count: 179 });
    const updateExample = vi.fn().mockResolvedValue({});
    const count = vi.fn().mockResolvedValue(180);
    const prisma = {
      trainingDataset: { findFirst, create: vi.fn(), update },
      trainingExample: { findMany, createMany, update: updateExample, count },
    };

    const result = await seedCuratedDataset(prisma, { dryRun: false, version: 'v4' });

    expect(update).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(createMany.mock.calls[0][0].data).toHaveLength(179);
    expect(updateExample).toHaveBeenCalledTimes(1);
    expect(result.insertedExamples).toBe(179);
    expect(result.updatedExamples).toBe(1);
    expect(result.skippedExamples).toBe(0);
    expect(result.approvedExamples).toBe(180);
  });

  it('dry-run does not write to database', async () => {
    const prisma = {
      trainingDataset: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      trainingExample: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    };

    const result = await seedCuratedDataset(prisma, { dryRun: true, version: 'v4' });

    expect(prisma.trainingDataset.create).not.toHaveBeenCalled();
    expect(prisma.trainingExample.createMany).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.totalExamples).toBe(180);
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
