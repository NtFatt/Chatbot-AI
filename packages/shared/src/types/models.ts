export type ModelVersionProvider =
  | 'internal_l3_tutor'
  | 'gemini'
  | 'openai'
  | 'fine_tuned_openai'
  | 'local_ollama'
  | 'local_lora';
export type ModelVersionStatus = 'draft' | 'training' | 'ready' | 'failed' | 'archived';
export type TrainingJobStatus = 'draft' | 'queued' | 'running' | 'succeeded' | 'failed';

export interface ModelVersion {
  id: string;
  name: string;
  provider: ModelVersionProvider;
  baseModel: string;
  fineTunedModel: string | null;
  status: ModelVersionStatus;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingJob {
  id: string;
  datasetId: string;
  provider: ModelVersionProvider;
  baseModel: string;
  status: TrainingJobStatus;
  externalJobId: string | null;
  modelVersionId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingJobInput {
  datasetId: string;
  provider: ModelVersionProvider;
  baseModel: string;
}
