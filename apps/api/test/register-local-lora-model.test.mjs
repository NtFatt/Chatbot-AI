import { describe, expect, it, vi } from 'vitest';

import {
  LOCAL_LORA_RUNTIME_GROUP,
  activateLocalLoraVersion,
  deriveLocalLoraDisplayName,
  buildRealLocalLoraVersionInput,
  buildLocalLoraVersionInput,
  parseCliArgs,
} from '../../../scripts/register-local-lora-model.mjs';

describe('register-local-lora-model script', () => {
  it('creates and activates a ready local_lora version idempotently', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'mv-local-lora',
      provider: 'local_lora',
      name: 'Local LoRA Tutor v1',
      baseModel: 'local-lora-base',
      fineTunedModel: 'local-lora-tutor-v1',
      status: 'ready',
      isActive: false,
      metadata: { runtimeMode: 'learning_engine_l3' },
    });
    const update = vi.fn().mockResolvedValue({
      id: 'mv-local-lora',
      provider: 'local_lora',
      name: 'Local LoRA Tutor v1',
      baseModel: 'local-lora-base',
      fineTunedModel: 'local-lora-tutor-v1',
      status: 'ready',
      isActive: true,
      metadata: { runtimeMode: 'learning_engine_l3' },
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValueOnce(null);
    const prisma = {
      $transaction: async (callback) =>
        callback({
          modelVersion: {
            findFirst,
            create,
            update,
            updateMany,
          },
        }),
    };

    const version = await activateLocalLoraVersion(prisma);

    expect(findFirst).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'local_lora',
          fineTunedModel: 'local-lora-tutor-v1',
          status: 'ready',
          isActive: false,
        }),
      }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        provider: { in: LOCAL_LORA_RUNTIME_GROUP },
        id: { not: 'mv-local-lora' },
      },
      data: { isActive: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'mv-local-lora' },
      data: { isActive: true },
    });
    expect(version.id).toBe('mv-local-lora');
    expect(version.isActive).toBe(true);
  });

  it('updates an existing local_lora version instead of creating a duplicate', async () => {
    const existing = {
      id: 'mv-existing',
      provider: 'local_lora',
      name: 'Old local version',
      baseModel: 'old-base',
      fineTunedModel: 'local-lora-tutor-v1',
      status: 'draft',
      isActive: false,
      metadata: { note: 'stale' },
    };
    const update = vi
      .fn()
      .mockResolvedValueOnce({
        ...existing,
        ...buildLocalLoraVersionInput(),
        id: existing.id,
        metadata: { note: 'Mock runtime validation only, not a real trained adapter' },
      })
      .mockResolvedValueOnce({
        ...existing,
        ...buildLocalLoraVersionInput(),
        id: existing.id,
        isActive: true,
      });
    const create = vi.fn();
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue(existing);
    const prisma = {
      $transaction: async (callback) =>
        callback({
          modelVersion: {
            findFirst,
            create,
            update,
            updateMany,
          },
        }),
    };

    const version = await activateLocalLoraVersion(prisma);

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mv-existing' },
        data: expect.objectContaining({
          name: 'Local LoRA Tutor v1',
          baseModel: 'local-lora-base',
          fineTunedModel: 'local-lora-tutor-v1',
          status: 'ready',
        }),
      }),
    );
    expect(version.id).toBe('mv-existing');
    expect(version.isActive).toBe(true);
  });

  it('builds a real adapter registration payload from training metadata', () => {
    const input = buildRealLocalLoraVersionInput({
      model: 'local-lora-tutor-v2',
      trainingMetadataPath: 'ml/adapters/local-lora-tutor-v1/training-metadata.json',
      adapterPath: 'ml/adapters/local-lora-tutor-v2',
      datasetId: 'dataset-dev',
      datasetName: 'DEV Curated L4 Tutor v2',
      trainingMetadata: {
        isMockTraining: false,
        baseModel: 'HuggingFaceTB/SmolLM2-135M-Instruct',
        adapterName: 'local-lora-tutor-v2',
        fineTunedModel: 'local-lora-tutor-v2',
        trainingExampleCount: 90,
        validationExampleCount: 10,
      },
    });

    expect(input.baseModel).toBe('HuggingFaceTB/SmolLM2-135M-Instruct');
    expect(input.name).toBe('Local LoRA Tutor v2');
    expect(input.fineTunedModel).toBe('local-lora-tutor-v2');
    expect(input.metadata).toEqual(
      expect.objectContaining({
        source: 'real-local-lora-training',
        adapterPath: 'ml/adapters/local-lora-tutor-v2',
        trainingMetadataPath: 'ml/adapters/local-lora-tutor-v1/training-metadata.json',
        datasetName: 'DEV Curated L4 Tutor v2',
        datasetId: 'dataset-dev',
        trainingExampleCount: 90,
        validationExampleCount: 10,
        isMockTraining: false,
      }),
    );
  });

  it('parses model and adapter aliases for v2 registration', () => {
    const options = parseCliArgs([
      '--real',
      '--model',
      'local-lora-tutor-v2',
      '--adapter',
      'ml/adapters/local-lora-tutor-v2',
      '--dataset-name',
      'DEV Curated L4 Tutor v2',
      '--training-example-count',
      '90',
    ]);

    expect(options.model).toBe('local-lora-tutor-v2');
    expect(options.adapterPath).toBe('ml/adapters/local-lora-tutor-v2');
    expect(options.datasetName).toBe('DEV Curated L4 Tutor v2');
    expect(options.trainingExampleCount).toBe(90);
  });

  it('derives the display name from the fine-tuned model name', () => {
    expect(deriveLocalLoraDisplayName('local-lora-tutor-v2')).toBe('Local LoRA Tutor v2');
  });
});
