import { describe, expect, it, vi } from 'vitest';

import { TrainingRepository } from '../src/modules/training/training.repository';

describe('TrainingRepository', () => {
  it('delegates grouped example counts to Prisma with dataset ids', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      {
        datasetId: 'dataset-1',
        status: 'approved',
        _count: { _all: 2 },
      },
    ]);
    const repository = new TrainingRepository({
      trainingDataset: {} as never,
      trainingExample: {
        groupBy,
      } as never,
      trainingJob: {} as never,
    } as never);

    const result = await repository.listDatasetExampleCounts(['dataset-1']);

    expect(groupBy).toHaveBeenCalledWith({
      by: ['datasetId', 'status'],
      where: {
        datasetId: {
          in: ['dataset-1'],
        },
      },
      _count: {
        _all: true,
      },
    });
    expect(result).toHaveLength(1);
  });

  it('serializes input messages when creating a training example', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'example-1',
    });
    const repository = new TrainingRepository({
      trainingDataset: {} as never,
      trainingExample: {
        create,
      } as never,
      trainingJob: {} as never,
    } as never);

    await repository.createExample('dataset-1', {
      sourceType: 'manual',
      inputMessages: [{ role: 'user', content: 'Hello' }],
      idealResponse: 'Hi',
      qualityScore: 4,
      status: 'draft',
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        datasetId: 'dataset-1',
        inputMessages: [{ role: 'user', content: 'Hello' }],
      }),
    });
  });
});
