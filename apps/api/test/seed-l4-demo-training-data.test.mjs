import { describe, expect, it, vi } from 'vitest';

import {
  DEMO_DATASET_NAME,
  buildDemoTrainingExamples,
  seedDemoDataset,
} from '../../../scripts/seed-l4-demo-training-data.mjs';

describe('seed-l4-demo-training-data', () => {
  it('builds approved synthetic examples with unique source ids', () => {
    const examples = buildDemoTrainingExamples();
    const sourceIds = new Set(examples.map((example) => example.sourceId));

    expect(examples).toHaveLength(24);
    expect(sourceIds.size).toBe(24);
    expect(examples.every((example) => example.status === 'approved')).toBe(true);
    expect(examples.every((example) => example.sourceId.startsWith('dev-synthetic-'))).toBe(true);
    expect(examples[0]?.idealResponse).toContain('Lưu ý minh bạch');
  });

  it('creates only missing demo examples and keeps the dataset idempotent', async () => {
    const findFirstDataset = vi.fn().mockResolvedValue({
      id: 'dataset-dev',
      name: DEMO_DATASET_NAME,
      description: 'old',
      status: 'draft',
    });
    const updateDataset = vi.fn().mockResolvedValue({});
    const findManyExamples = vi.fn().mockResolvedValue([
      { sourceId: 'dev-synthetic-001' },
      { sourceId: 'dev-synthetic-002' },
    ]);
    const createMany = vi.fn().mockResolvedValue({ count: 22 });
    const count = vi.fn().mockResolvedValue(24);
    const prisma = {
      trainingDataset: {
        findFirst: findFirstDataset,
        create: vi.fn(),
        update: updateDataset,
      },
      trainingExample: {
        findMany: findManyExamples,
        createMany,
        count,
      },
    };

    const result = await seedDemoDataset(prisma);

    expect(updateDataset).toHaveBeenCalledWith({
      where: { id: 'dataset-dev' },
      data: {
        description:
          'DEV-ONLY synthetic Vietnamese tutor examples for Local LoRA pipeline validation. Not real user data and not a model-quality claim.',
        status: 'active',
      },
    });
    expect(createMany).toHaveBeenCalled();
    expect(createMany.mock.calls[0][0].data).toHaveLength(22);
    expect(result).toEqual({
      datasetId: 'dataset-dev',
      insertedExamples: 22,
      approvedExamples: 24,
    });
  });
});
