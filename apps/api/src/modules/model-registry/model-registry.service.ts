import type { ProviderKey } from '@chatbot-ai/shared';
import type {
  ModelVersion,
  ModelVersionProvider as SharedModelVersionProvider,
} from '@chatbot-ai/shared';
import type { ModelVersion as PrismaModelVersion, ModelVersionProvider } from '@prisma/client';

import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { ModelRegistryRepository } from './model-registry.repository';

const toIso = (value: Date) => value.toISOString();

const runtimeGroupByProvider = (
  provider: SharedModelVersionProvider,
): SharedModelVersionProvider[] => {
  switch (provider) {
    case 'internal_l3_tutor':
      return ['internal_l3_tutor'];
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

  private async ensureDefaultInternalTutorVersion(): Promise<PrismaModelVersion> {
    const existingActive = await this.repository.findActiveByProviders(['internal_l3_tutor']);
    if (existingActive) {
      return existingActive;
    }

    const existing = await this.repository.findFirstByProviderAndBaseModel(
      'internal_l3_tutor',
      env.L3_INTERNAL_MODEL_NAME,
    );

    const version =
      existing?.status === 'ready'
        ? existing
        :
      (await this.repository.create({
        name: 'Internal L3 Tutor',
        provider: 'internal_l3_tutor',
        baseModel: env.L3_INTERNAL_MODEL_NAME,
        status: 'ready',
        isActive: false,
        metadata: {
          kind: 'internal_policy_model',
          runtimeMode: 'learning_engine_l3',
          managedBy: 'system',
          level: 3,
        },
      }));

    if (!version.isActive) {
      return this.repository.activate(version.id, ['internal_l3_tutor']);
    }

    return version;
  }

  async getVersionById(id: string): Promise<ModelVersion> {
    const version = await this.repository.findById(id);
    if (!version) {
      throw new AppError(404, 'MODEL_VERSION_NOT_FOUND', 'Model version not found.');
    }

    return toSharedModelVersion(version);
  }

  async listVersions(): Promise<ModelVersion[]> {
    await this.ensureDefaultInternalTutorVersion();
    const versions = await this.repository.listVersions();
    return versions.map(toSharedModelVersion);
  }

  async listActiveVersions(): Promise<ModelVersion[]> {
    await this.ensureDefaultInternalTutorVersion();
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

  async getActiveLearningEngineModel(): Promise<ModelVersion | null> {
    await this.ensureDefaultInternalTutorVersion();
    const versions = await this.repository.listVersions();
    const activeLearningEngineVersions = versions.filter(
      (version) =>
        version.isActive &&
        version.status === 'ready' &&
        typeof (version.metadata as Record<string, unknown> | null)?.runtimeMode === 'string' &&
        (version.metadata as Record<string, unknown>).runtimeMode === 'learning_engine_l3',
    );
    const active =
      activeLearningEngineVersions.find((version) => version.provider !== 'internal_l3_tutor') ??
      activeLearningEngineVersions[0] ??
      null;
    return active ? toSharedModelVersion(active) : null;
  }

  async getActiveModelForRuntime(provider: ProviderKey): Promise<{
    modelVersionId: string | null;
    model: string | null;
  }> {
    if (provider === 'internal_l3_tutor') {
      const internal = await this.ensureDefaultInternalTutorVersion();
      return {
        modelVersionId: internal.id,
        model: internal.fineTunedModel ?? internal.baseModel,
      };
    }

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
        version.provider === 'internal_l3_tutor'
          ? 'internal_l3_tutor'
          : version.provider === 'gemini'
          ? 'GEMINI'
          : version.provider === 'openai' || version.provider === 'fine_tuned_openai'
            ? 'OPENAI'
            : 'LOCAL',
      version,
    }));
  }
}
