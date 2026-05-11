import type {
  CreateTrainingDatasetInput,
  CreateTrainingExampleInput,
  CreateTrainingJobInput,
  TrainingDataset,
  TrainingDatasetExportFormat,
  TrainingDatasetExportPayload,
  TrainingDatasetSummary,
  TrainingExample,
  TrainingJob,
  UpdateTrainingExampleInput,
} from '@chatbot-ai/shared';
import type {
  TrainingDataset as PrismaTrainingDataset,
  TrainingExample as PrismaTrainingExample,
  TrainingJob as PrismaTrainingJob,
} from '@prisma/client';

import { AppError } from '../../utils/errors';
import { LocalLoraFineTuneAdapterStub } from '../../integrations/ai/fine-tune/local-lora-fine-tune.adapter';
import { OpenAIFineTuneAdapter } from '../../integrations/ai/fine-tune/openai-fine-tune.adapter';
import type { FineTuneAdapter } from '../../integrations/ai/fine-tune/fine-tune-adapter';
import { ModelRegistryService } from '../model-registry/model-registry.service';
import { TrainingRepository } from './training.repository';

const toIso = (value: Date) => value.toISOString();

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{10,}/g,
  /gsk_[A-Za-z0-9_-]{10,}/g,
  /hf_[A-Za-z0-9_-]{10,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /(OPENAI_API_KEY|GEMINI_API_KEY)\s*[:=]\s*["']?[^"'\s]+/gi,
];

const redactSecrets = (value: string) =>
  secretPatterns.reduce(
    (current, pattern) => current.replace(pattern, '[REDACTED_SECRET]'),
    value,
  );

const sanitizeMessages = (
  input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
) =>
  input.map((message) => ({
    role: message.role,
    content: redactSecrets(message.content),
  }));

const toOpenAIMessages = (example: TrainingExample) => [
  ...example.inputMessages.map((message) => ({
    role: message.role,
    content: message.content,
  })),
  {
    role: 'assistant' as const,
    content: example.idealResponse,
  },
];

const buildOpenAIJsonl = (examples: TrainingExample[]) =>
  examples
    .map((example) =>
      JSON.stringify({
        messages: toOpenAIMessages(example),
      }),
    )
    .join('\n');

const buildHfChatJson = (examples: TrainingExample[]) =>
  JSON.stringify(
    examples.map((example) => ({
      messages: toOpenAIMessages(example),
      metadata: {
        sourceType: example.sourceType,
        subject: example.subject,
        topic: example.topic,
        learningMode: example.learningMode,
        userLevel: example.userLevel,
        qualityScore: example.qualityScore,
      },
    })),
    null,
    2,
  );

const mapDataset = (dataset: PrismaTrainingDataset): TrainingDataset => ({
  id: dataset.id,
  name: dataset.name,
  description: dataset.description ?? null,
  status: dataset.status,
  version: dataset.version,
  createdAt: toIso(dataset.createdAt),
  updatedAt: toIso(dataset.updatedAt),
});

const mapExample = (example: PrismaTrainingExample): TrainingExample => ({
  id: example.id,
  datasetId: example.datasetId,
  sourceType: example.sourceType,
  sourceId: example.sourceId ?? null,
  subject: example.subject ?? null,
  topic: example.topic ?? null,
  learningMode: example.learningMode ?? null,
  userLevel: example.userLevel ?? null,
  inputMessages: example.inputMessages as unknown as TrainingExample['inputMessages'],
  idealResponse: example.idealResponse,
  qualityScore: example.qualityScore,
  status: example.status,
  createdAt: toIso(example.createdAt),
  updatedAt: toIso(example.updatedAt),
});

const mapJob = (job: PrismaTrainingJob): TrainingJob => ({
  id: job.id,
  datasetId: job.datasetId,
  provider: job.provider,
  baseModel: job.baseModel,
  status: job.status,
  externalJobId: job.externalJobId ?? null,
  modelVersionId: job.modelVersionId ?? null,
  errorMessage: job.errorMessage ?? null,
  metadata: (job.metadata as Record<string, unknown> | null) ?? null,
  createdAt: toIso(job.createdAt),
  updatedAt: toIso(job.updatedAt),
});

export class TrainingService {
  private readonly adapters: Record<string, FineTuneAdapter>;

  constructor(
    private readonly repository: TrainingRepository,
    private readonly modelRegistryService: ModelRegistryService,
  ) {
    const openAiAdapter = new OpenAIFineTuneAdapter();
    const localLoraAdapter = new LocalLoraFineTuneAdapterStub();

    this.adapters = {
      [openAiAdapter.provider]: openAiAdapter,
      [localLoraAdapter.provider]: localLoraAdapter,
    };
  }

  async listDatasets(): Promise<TrainingDatasetSummary[]> {
    const datasets = await this.repository.listDatasets();
    const counts = await this.repository.listDatasetExampleCounts(datasets.map((dataset) => dataset.id));
    const countsByDataset = counts.reduce((map, row) => {
      const entry = map.get(row.datasetId) ?? {
        draft: 0,
        approved: 0,
        rejected: 0,
      };
      entry[row.status] = row._count._all;
      map.set(row.datasetId, entry);
      return map;
    }, new Map<string, { draft: number; approved: number; rejected: number }>());

    return datasets.map((dataset) => {
      const statusCounts = countsByDataset.get(dataset.id) ?? {
        draft: 0,
        approved: 0,
        rejected: 0,
      };

      return {
        ...mapDataset(dataset),
        totalExamples: dataset._count.examples,
        approvedExamples: statusCounts.approved,
        draftExamples: statusCounts.draft,
        rejectedExamples: statusCounts.rejected,
      };
    });
  }

  async createDataset(input: CreateTrainingDatasetInput): Promise<TrainingDataset> {
    const dataset = await this.repository.createDataset({
      name: input.name.trim(),
      description: input.description?.trim(),
      status: input.status ?? 'draft',
    });

    return mapDataset(dataset);
  }

  async listExamples(datasetId: string): Promise<TrainingExample[]> {
    const dataset = await this.repository.findDatasetById(datasetId);
    if (!dataset) {
      throw new AppError(404, 'TRAINING_DATASET_NOT_FOUND', 'Training dataset not found.');
    }

    const examples = await this.repository.listExamples(datasetId);
    return examples.map(mapExample);
  }

  async createExample(
    datasetId: string,
    input: CreateTrainingExampleInput,
  ): Promise<TrainingExample> {
    const dataset = await this.repository.findDatasetById(datasetId);
    if (!dataset) {
      throw new AppError(404, 'TRAINING_DATASET_NOT_FOUND', 'Training dataset not found.');
    }

    const example = await this.repository.createExample(datasetId, {
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      subject: input.subject?.trim() ?? null,
      topic: input.topic?.trim() ?? null,
      learningMode: input.learningMode?.trim() ?? null,
      userLevel: input.userLevel?.trim() ?? null,
      inputMessages: sanitizeMessages(input.inputMessages),
      idealResponse: redactSecrets(input.idealResponse),
      qualityScore: input.qualityScore ?? 3,
      status: input.status ?? 'draft',
    });

    return mapExample(example);
  }

  async updateExample(
    exampleId: string,
    input: UpdateTrainingExampleInput,
  ): Promise<TrainingExample> {
    const existing = await this.repository.findExampleById(exampleId);
    if (!existing) {
      throw new AppError(404, 'TRAINING_EXAMPLE_NOT_FOUND', 'Training example not found.');
    }

    const updated = await this.repository.updateExample(exampleId, {
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? undefined,
      subject: input.subject ?? undefined,
      topic: input.topic ?? undefined,
      learningMode: input.learningMode ?? undefined,
      userLevel: input.userLevel ?? undefined,
      inputMessages: input.inputMessages ? sanitizeMessages(input.inputMessages) : undefined,
      idealResponse: input.idealResponse ? redactSecrets(input.idealResponse) : undefined,
      qualityScore: input.qualityScore,
      status: input.status,
    });

    return mapExample(updated);
  }

  approveExample(exampleId: string) {
    return this.updateExample(exampleId, { status: 'approved' });
  }

  rejectExample(exampleId: string) {
    return this.updateExample(exampleId, { status: 'rejected' });
  }

  async exportDataset(
    datasetId: string,
    format: TrainingDatasetExportFormat,
  ): Promise<TrainingDatasetExportPayload> {
    const dataset = await this.repository.findDatasetById(datasetId);
    if (!dataset) {
      throw new AppError(404, 'TRAINING_DATASET_NOT_FOUND', 'Training dataset not found.');
    }

    const approvedExamples = (await this.repository.listApprovedExamples(datasetId)).map(mapExample);
    const content =
      format === 'openai_jsonl'
        ? buildOpenAIJsonl(approvedExamples)
        : buildHfChatJson(approvedExamples);

    return {
      datasetId,
      format,
      filename:
        format === 'openai_jsonl'
          ? `${dataset.name.replace(/\s+/g, '-').toLowerCase()}-openai.jsonl`
          : `${dataset.name.replace(/\s+/g, '-').toLowerCase()}-hf-chat.json`,
      mimeType: format === 'openai_jsonl' ? 'application/x-ndjson' : 'application/json',
      content,
      exportedCount: approvedExamples.length,
    };
  }

  async listJobs(): Promise<TrainingJob[]> {
    const jobs = await this.repository.listJobs();
    return jobs.map(mapJob);
  }

  async createJob(input: CreateTrainingJobInput): Promise<TrainingJob> {
    const dataset = await this.repository.findDatasetById(input.datasetId);
    if (!dataset) {
      throw new AppError(404, 'TRAINING_DATASET_NOT_FOUND', 'Training dataset not found.');
    }

    const approvedExamples = (await this.repository.listApprovedExamples(input.datasetId)).map(mapExample);
    if (approvedExamples.length === 0) {
      throw new AppError(
        400,
        'TRAINING_DATASET_EMPTY',
        'Only datasets with approved examples can be used for training jobs.',
      );
    }

    const adapter = this.adapters[input.provider];
    if (!adapter) {
      throw new AppError(400, 'TRAINING_ADAPTER_UNSUPPORTED', 'Selected fine-tune provider is not supported yet.');
    }

    const job = await this.repository.createJob({
      datasetId: input.datasetId,
      provider: input.provider,
      baseModel: input.baseModel,
    });

    const datasetView = mapDataset(dataset);
    const openaiJsonl = buildOpenAIJsonl(approvedExamples);
    const hfChat = buildHfChatJson(approvedExamples);
    const adapterResult = await adapter.startJob({
      jobId: job.id,
      dataset: datasetView,
      approvedExamples,
      baseModel: input.baseModel,
      exports: {
        openaiJsonl,
        hfChat,
      },
    });

    const modelVersion = adapterResult.modelVersion
      ? await this.modelRegistryService.createVersion({
          name: adapterResult.modelVersion.name,
          provider: adapterResult.modelVersion.provider,
          baseModel: adapterResult.modelVersion.baseModel,
          fineTunedModel: adapterResult.modelVersion.fineTunedModel ?? null,
          status: adapterResult.modelVersion.status,
          metadata: adapterResult.modelVersion.metadata ?? null,
        })
      : null;

    const updated = await this.repository.updateJob(job.id, {
      status: adapterResult.status,
      externalJobId: adapterResult.externalJobId ?? null,
      modelVersionId: modelVersion?.id ?? null,
      errorMessage: adapterResult.errorMessage ?? null,
      metadata: adapterResult.metadata ?? null,
    });

    return mapJob(updated);
  }
}
