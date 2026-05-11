import type {
  ModelVersionProvider,
  ModelVersionStatus,
  TrainingDataset,
  TrainingExample,
  TrainingJobStatus,
} from '@chatbot-ai/shared';

export interface FineTuneAdapterStartInput {
  jobId: string;
  dataset: TrainingDataset;
  approvedExamples: TrainingExample[];
  baseModel: string;
  exports: {
    openaiJsonl: string;
    hfChat: string;
  };
}

export interface FineTuneAdapterResult {
  status: TrainingJobStatus;
  externalJobId?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  modelVersion?:
    | {
        name: string;
        provider: ModelVersionProvider;
        baseModel: string;
        fineTunedModel?: string | null;
        status: ModelVersionStatus;
        metadata?: Record<string, unknown> | null;
      }
    | null;
}

export interface FineTuneAdapter {
  readonly provider: ModelVersionProvider;
  startJob(input: FineTuneAdapterStartInput): Promise<FineTuneAdapterResult>;
}
