import { describe, expect, it, vi } from 'vitest';

import { TrainingService } from '../src/modules/training/training.service';

describe('TrainingService', () => {
  it('summarizes dataset status counts for the manager view', async () => {
    const service = new TrainingService(
      {
        listDatasets: vi.fn().mockResolvedValue([
          {
            id: 'dataset-1',
            name: 'Dataset 1',
            description: 'desc',
            status: 'draft',
            version: 1,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-02T00:00:00.000Z'),
            _count: { examples: 3 },
          },
        ]),
        listDatasetExampleCounts: vi.fn().mockResolvedValue([
          { datasetId: 'dataset-1', status: 'approved', _count: { _all: 2 } },
          { datasetId: 'dataset-1', status: 'draft', _count: { _all: 1 } },
        ]),
      } as never,
      {} as never,
    );

    const datasets = await service.listDatasets();

    expect(datasets[0]).toMatchObject({
      totalExamples: 3,
      approvedExamples: 2,
      draftExamples: 1,
      rejectedExamples: 0,
    });
  });

  it('redacts secrets when creating training examples', async () => {
    const service = new TrainingService(
      {
        findDatasetById: vi.fn().mockResolvedValue({
          id: 'dataset-1',
          name: 'Dataset 1',
          description: null,
          status: 'draft',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        createExample: vi.fn().mockImplementation(async (_datasetId, input) => ({
          id: 'example-1',
          datasetId: 'dataset-1',
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          subject: input.subject,
          topic: input.topic,
          learningMode: input.learningMode,
          userLevel: input.userLevel,
          inputMessages: input.inputMessages,
          idealResponse: input.idealResponse,
          qualityScore: input.qualityScore,
          status: input.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      } as never,
      {} as never,
    );

    const example = await service.createExample('dataset-1', {
      sourceType: 'manual',
      inputMessages: [{ role: 'user', content: 'Use this key sk-secret-token-12345' }],
      idealResponse: 'Stored key: sk-secret-token-12345',
    });

    expect(example.inputMessages[0]?.content).toContain('[REDACTED_SECRET]');
    expect(example.idealResponse).toContain('[REDACTED_SECRET]');
  });

  it('exports only approved examples in Hugging Face chat format', async () => {
    const service = new TrainingService(
      {
        findDatasetById: vi.fn().mockResolvedValue({
          id: 'dataset-1',
          name: 'Dataset 1',
          description: null,
          status: 'draft',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        listApprovedExamples: vi.fn().mockResolvedValue([
          {
            id: 'example-1',
            datasetId: 'dataset-1',
            sourceType: 'manual',
            sourceId: null,
            subject: 'SQL',
            topic: null,
            learningMode: null,
            userLevel: null,
            inputMessages: [{ role: 'user', content: 'Explain joins' }],
            idealResponse: 'A join combines rows from tables.',
            qualityScore: 4,
            status: 'approved',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      } as never,
      {} as never,
    );

    const exportPayload = await service.exportDataset('dataset-1', 'hf_chat');

    expect(exportPayload.exportedCount).toBe(1);
    expect(exportPayload.content).toContain('"messages"');
    expect(exportPayload.content).toContain('Explain joins');
  });

  it('creates a local LoRA job and stores the produced model version id', async () => {
    const createVersion = vi.fn().mockResolvedValue({
      id: 'model-version-1',
      name: 'Local LoRA Dataset 1',
      provider: 'local_lora',
      baseModel: 'Qwen/Qwen2.5-3B-Instruct',
      fineTunedModel: null,
      status: 'training',
      isActive: false,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const service = new TrainingService(
      {
        findDatasetById: vi.fn().mockResolvedValue({
          id: 'dataset-1',
          name: 'Dataset 1',
          description: null,
          status: 'active',
          version: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        listApprovedExamples: vi.fn().mockResolvedValue([
          {
            id: 'example-1',
            datasetId: 'dataset-1',
            sourceType: 'manual',
            sourceId: null,
            subject: 'SQL',
            topic: null,
            learningMode: null,
            userLevel: null,
            inputMessages: [{ role: 'user', content: 'Explain joins' }],
            idealResponse: 'A join combines rows from tables.',
            qualityScore: 4,
            status: 'approved',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        createJob: vi.fn().mockResolvedValue({
          id: 'job-1',
          datasetId: 'dataset-1',
          provider: 'local_lora',
          baseModel: 'Qwen/Qwen2.5-3B-Instruct',
          status: 'draft',
          externalJobId: null,
          modelVersionId: null,
          errorMessage: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        updateJob: vi.fn().mockImplementation(async (_id, input) => ({
          id: 'job-1',
          datasetId: 'dataset-1',
          provider: 'local_lora',
          baseModel: 'Qwen/Qwen2.5-3B-Instruct',
          status: input.status,
          externalJobId: input.externalJobId ?? null,
          modelVersionId: input.modelVersionId ?? null,
          errorMessage: input.errorMessage ?? null,
          metadata: input.metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      } as never,
      {
        createVersion,
      } as never,
    );

    const job = await service.createJob({
      datasetId: 'dataset-1',
      provider: 'local_lora',
      baseModel: 'Qwen/Qwen2.5-3B-Instruct',
    });

    expect(createVersion).toHaveBeenCalledTimes(1);
    expect(job.status).toBe('queued');
    expect(job.modelVersionId).toBe('model-version-1');
    expect(job.metadata).toMatchObject({
      adapter: 'local-lora-stub',
    });
  });
});
