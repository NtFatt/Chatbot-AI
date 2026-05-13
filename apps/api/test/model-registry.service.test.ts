import { describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { ModelRegistryService } from '../src/modules/model-registry/model-registry.service';

describe('ModelRegistryService', () => {
  it('activates only ready model versions', async () => {
    const service = new ModelRegistryService({
      findById: vi.fn().mockResolvedValue({
        id: 'version-1',
        name: 'OpenAI FT',
        provider: 'fine_tuned_openai',
        baseModel: 'gpt-5.4-mini',
        fineTunedModel: 'ft:gpt-5.4-mini:custom',
        status: 'ready',
        isActive: false,
        metadata: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
      activate: vi.fn().mockResolvedValue({
        id: 'version-1',
        name: 'OpenAI FT',
        provider: 'fine_tuned_openai',
        baseModel: 'gpt-5.4-mini',
        fineTunedModel: 'ft:gpt-5.4-mini:custom',
        status: 'ready',
        isActive: true,
        metadata: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      }),
    } as never);

    const version = await service.activateVersion('version-1');

    expect(version.isActive).toBe(true);
  });

  it('rejects activation for non-ready versions', async () => {
    const service = new ModelRegistryService({
      findById: vi.fn().mockResolvedValue({
        id: 'version-1',
        name: 'OpenAI FT',
        provider: 'fine_tuned_openai',
        baseModel: 'gpt-5.4-mini',
        fineTunedModel: null,
        status: 'training',
        isActive: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never);

    await expect(service.activateVersion('version-1')).rejects.toMatchObject({
      code: 'MODEL_VERSION_NOT_READY',
      statusCode: 400,
    });
  });

  it('ensures a default internal L3 tutor version for the learning engine runtime', async () => {
    const repository = {
      findActiveByProviders: vi.fn().mockResolvedValue(null),
      findFirstByProviderAndBaseModel: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'internal-l3-version',
        name: 'Internal L3 Tutor',
        provider: 'internal_l3_tutor',
        baseModel: env.L3_INTERNAL_MODEL_NAME,
        fineTunedModel: null,
        status: 'ready',
        isActive: false,
        metadata: { runtimeMode: 'learning_engine_l3' },
        createdAt: new Date('2026-05-13T00:00:00.000Z'),
        updatedAt: new Date('2026-05-13T00:00:00.000Z'),
      }),
      activate: vi.fn().mockResolvedValue({
        id: 'internal-l3-version',
        name: 'Internal L3 Tutor',
        provider: 'internal_l3_tutor',
        baseModel: env.L3_INTERNAL_MODEL_NAME,
        fineTunedModel: null,
        status: 'ready',
        isActive: true,
        metadata: { runtimeMode: 'learning_engine_l3' },
        createdAt: new Date('2026-05-13T00:00:00.000Z'),
        updatedAt: new Date('2026-05-13T00:00:00.000Z'),
      }),
      listVersions: vi.fn().mockResolvedValue([
        {
          id: 'internal-l3-version',
          name: 'Internal L3 Tutor',
          provider: 'internal_l3_tutor',
          baseModel: env.L3_INTERNAL_MODEL_NAME,
          fineTunedModel: null,
          status: 'ready',
          isActive: true,
          metadata: { runtimeMode: 'learning_engine_l3' },
          createdAt: new Date('2026-05-13T00:00:00.000Z'),
          updatedAt: new Date('2026-05-13T00:00:00.000Z'),
        },
      ]),
    };

    const service = new ModelRegistryService(repository as never);
    const version = await service.getActiveLearningEngineModel();

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.activate).toHaveBeenCalledWith('internal-l3-version', ['internal_l3_tutor']);
    expect(version?.provider).toBe('internal_l3_tutor');
    expect(version?.baseModel).toBe(env.L3_INTERNAL_MODEL_NAME);
  });
});
