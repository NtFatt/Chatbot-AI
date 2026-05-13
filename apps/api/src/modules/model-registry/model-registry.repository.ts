import type { ModelVersionProvider, ModelVersionStatus, Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../../config/prisma';

type DatabaseClient = Pick<PrismaClient, 'modelVersion' | '$transaction'>;

export class ModelRegistryRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  listVersions() {
    return this.db.modelVersion.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  listActiveVersions() {
    return this.db.modelVersion.findMany({
      where: { isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.db.modelVersion.findUnique({
      where: { id },
    });
  }

  findFirstByProviderAndBaseModel(provider: ModelVersionProvider, baseModel: string) {
    return this.db.modelVersion.findFirst({
      where: {
        provider,
        baseModel,
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  findActiveByProviders(providers: ModelVersionProvider[]) {
    return this.db.modelVersion.findFirst({
      where: {
        provider: { in: providers },
        isActive: true,
        status: 'ready',
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  create(input: {
    name: string;
    provider: ModelVersionProvider;
    baseModel: string;
    fineTunedModel?: string | null;
    status?: ModelVersionStatus;
    isActive?: boolean;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.db.modelVersion.create({
      data: {
        name: input.name,
        provider: input.provider,
        baseModel: input.baseModel,
        fineTunedModel: input.fineTunedModel ?? null,
        status: input.status ?? 'draft',
        isActive: input.isActive ?? false,
        metadata: input.metadata,
      },
    });
  }

  async activate(id: string, groupProviders: ModelVersionProvider[]) {
    return this.db.$transaction(async (tx) => {
      await tx.modelVersion.updateMany({
        where: {
          provider: { in: groupProviders },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.modelVersion.update({
        where: { id },
        data: {
          isActive: true,
        },
      });
    });
  }
}
