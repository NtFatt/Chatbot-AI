import type { ProviderKey } from '@chatbot-ai/shared';
import type {
  ModelVersion,
  ModelVersionProvider as SharedModelVersionProvider,
} from '@chatbot-ai/shared';
import type { ModelVersion as PrismaModelVersion, ModelVersionProvider } from '@prisma/client';

import { AppError } from '../../utils/errors';
import { ModelRegistryRepository } from './model-registry.repository';

const toIso = (value: Date) => value.toISOString();

const runtimeGroupByProvider = (
  provider: SharedModelVersionProvider,
): SharedModelVersionProvider[] => {
  switch (provider) {
    case 'gemini':
      return ['gemini'];
    case 'openai':
    case 'fine_tuned_openai':
      return ['openai', 'fine_tuned_openai'];
    case 'local_ollama':
    case 'local_lora':
      return ['local_ollama', 'local_lora'];
  }
};

const toSharedModelVersion = (version: PrismaModelVersion): ModelVersion => ({
  id: version.id,
  name: version.name,
  provider: version.provider,
  baseModel: version.baseModel,
  fineTunedModel: version.fineTunedModel ?? null,
  status: version.status,
  isActive: version.isActive,
  metadata: (version.metadata as Record<string, unknown> | null) ?? null,
  createdAt: toIso(version.createdAt),
  updatedAt: toIso(version.updatedAt),
});

export class ModelRegistryService {
  constructor(private readonly repository: ModelRegistryRepository) {}

  async getVersionById(id: string): Promise<ModelVersion> {
    const version = await this.repository.findById(id);
    if (!version) {
      throw new AppError(404, 'MODEL_VERSION_NOT_FOUND', 'Model version not found.');
    }

    return toSharedModelVersion(version);
  }

  async listVersions(): Promise<ModelVersion[]> {
    const versions = await this.repository.listVersions();
    return versions.map(toSharedModelVersion);
  }

  async listActiveVersions(): Promise<ModelVersion[]> {
    const versions = await this.repository.listActiveVersions();
    return versions.map(toSharedModelVersion);
  }

  async createVersion(input: {
    name: string;
    provider: SharedModelVersionProvider;
    baseModel: string;
    fineTunedModel?: string | null;
    status?: 'draft' | 'training' | 'ready' | 'failed' | 'archived';
    isActive?: boolean;
    metadata?: Record<string, unknown> | null;
  }): Promise<ModelVersion> {
    const version = await this.repository.create({
      name: input.name,
      provider: input.provider,
      baseModel: input.baseModel,
      fineTunedModel: input.fineTunedModel ?? null,
      status: input.status,
      isActive: input.isActive ?? false,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
    });

    return toSharedModelVersion(version);
  }

  async activateVersion(id: string): Promise<ModelVersion> {
    const version = await this.repository.findById(id);
    if (!version) {
      throw new AppError(404, 'MODEL_VERSION_NOT_FOUND', 'Model version not found.');
    }

    if (version.status !== 'ready') {
      throw new AppError(400, 'MODEL_VERSION_NOT_READY', 'Only ready model versions can be activated.');
    }

    const activated = await this.repository.activate(
      id,
      runtimeGroupByProvider(version.provider as SharedModelVersionProvider) as ModelVersionProvider[],
    );

    return toSharedModelVersion(activated);
  }

  async getActiveModelForRuntime(provider: ProviderKey): Promise<{
    modelVersionId: string | null;
    model: string | null;
  }> {
    const active =
      provider === 'GEMINI'
        ? await this.repository.findActiveByProviders(['gemini'])
        : await this.repository.findActiveByProviders(['openai', 'fine_tuned_openai']);

    if (!active) {
      return {
        modelVersionId: null,
        model: null,
      };
    }

    return {
      modelVersionId: active.id,
      model: active.fineTunedModel ?? active.baseModel,
    };
  }

  async getActiveModels(): Promise<Array<{
    runtimeProvider: ProviderKey | 'LOCAL';
    version: ModelVersion;
  }>> {
    const versions = await this.listActiveVersions();

    return versions.map((version) => ({
      runtimeProvider:
        version.provider === 'gemini'
          ? 'GEMINI'
          : version.provider === 'openai' || version.provider === 'fine_tuned_openai'
            ? 'OPENAI'
            : 'LOCAL',
      version,
    }));
  }
}
