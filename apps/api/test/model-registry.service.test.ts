import { describe, expect, it, vi } from 'vitest';

import { ModelRegistryService } from '../src/modules/model-registry/model-registry.service';
import { AppError } from '../src/utils/errors';

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
});
