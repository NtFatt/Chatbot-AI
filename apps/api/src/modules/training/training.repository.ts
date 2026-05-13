import type { ModelVersionProvider } from '@chatbot-ai/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../config/prisma';

type DatabaseClient = Pick<
  PrismaClient,
  'trainingDataset' | 'trainingExample' | 'trainingJob'
>;

export class TrainingRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  listDatasets() {
    return this.db.trainingDataset.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        _count: {
          select: {
            examples: true,
          },
        },
      },
    });
  }

  listDatasetExampleCounts(datasetIds: string[]) {
    if (datasetIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.db.trainingExample.groupBy({
      by: ['datasetId', 'status'],
      where: {
        datasetId: {
          in: datasetIds,
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  createDataset(input: {
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'archived';
  }) {
    return this.db.trainingDataset.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        status: input.status,
      },
    });
  }

  findDatasetById(id: string) {
    return this.db.trainingDataset.findUnique({
      where: { id },
    });
  }

  listExamples(datasetId: string) {
    return this.db.trainingExample.findMany({
      where: { datasetId },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  listApprovedExamples(datasetId: string) {
    return this.db.trainingExample.findMany({
      where: {
        datasetId,
        status: 'approved',
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  createExample(datasetId: string, input: {
    sourceType: 'chat_message' | 'artifact_refinement' | 'manual';
    sourceId?: string | null;
    subject?: string | null;
    topic?: string | null;
    learningMode?: string | null;
    userLevel?: string | null;
    inputMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    idealResponse: string;
    qualityScore: number;
    status: 'draft' | 'approved' | 'rejected';
  }) {
    return this.db.trainingExample.create({
      data: {
        datasetId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        subject: input.subject ?? null,
        topic: input.topic ?? null,
        learningMode: input.learningMode ?? null,
        userLevel: input.userLevel ?? null,
        inputMessages: JSON.parse(JSON.stringify(input.inputMessages)),
        idealResponse: input.idealResponse,
        qualityScore: input.qualityScore,
        status: input.status,
      },
    });
  }

  findExampleById(id: string) {
    return this.db.trainingExample.findUnique({
      where: { id },
    });
  }

  updateExample(id: string, input: {
    sourceType?: 'chat_message' | 'artifact_refinement' | 'manual';
    sourceId?: string | null;
    subject?: string | null;
    topic?: string | null;
    learningMode?: string | null;
    userLevel?: string | null;
    inputMessages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    idealResponse?: string;
    qualityScore?: number;
    status?: 'draft' | 'approved' | 'rejected';
  }) {
    return this.db.trainingExample.update({
      where: { id },
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        subject: input.subject,
        topic: input.topic,
        learningMode: input.learningMode,
        userLevel: input.userLevel,
        inputMessages: input.inputMessages
          ? JSON.parse(JSON.stringify(input.inputMessages))
          : undefined,
        idealResponse: input.idealResponse,
        qualityScore: input.qualityScore,
        status: input.status,
      },
    });
  }

  listJobs() {
    return this.db.trainingJob.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  createJob(input: {
    datasetId: string;
    provider: ModelVersionProvider;
    baseModel: string;
  }) {
    return this.db.trainingJob.create({
      data: {
        datasetId: input.datasetId,
        provider: input.provider,
        baseModel: input.baseModel,
      },
    });
  }

  updateJob(id: string, input: {
    status?: 'draft' | 'queued' | 'running' | 'succeeded' | 'failed';
    externalJobId?: string | null;
    modelVersionId?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.db.trainingJob.update({
      where: { id },
      data: {
        status: input.status,
        externalJobId: input.externalJobId,
        modelVersionId: input.modelVersionId,
        errorMessage: input.errorMessage,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : input.metadata,
      },
    });
  }
}
