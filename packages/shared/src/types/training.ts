export type TrainingDatasetStatus = 'draft' | 'active' | 'archived';
export type TrainingExampleSourceType = 'chat_message' | 'artifact_refinement' | 'manual';
export type TrainingExampleStatus = 'draft' | 'approved' | 'rejected';
export type TrainingDatasetExportFormat = 'openai_jsonl' | 'hf_chat';

export interface TrainingMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string | null;
  status: TrainingDatasetStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDatasetSummary extends TrainingDataset {
  totalExamples: number;
  approvedExamples: number;
  draftExamples: number;
  rejectedExamples: number;
}

export interface TrainingExample {
  id: string;
  datasetId: string;
  sourceType: TrainingExampleSourceType;
  sourceId: string | null;
  subject: string | null;
  topic: string | null;
  learningMode: string | null;
  userLevel: string | null;
  inputMessages: TrainingMessage[];
  idealResponse: string;
  qualityScore: number;
  status: TrainingExampleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingDatasetInput {
  name: string;
  description?: string;
  status?: TrainingDatasetStatus;
}

export interface CreateTrainingExampleInput {
  sourceType: TrainingExampleSourceType;
  sourceId?: string;
  subject?: string;
  topic?: string;
  learningMode?: string;
  userLevel?: string;
  inputMessages: TrainingMessage[];
  idealResponse: string;
  qualityScore?: number;
  status?: TrainingExampleStatus;
}

export interface UpdateTrainingExampleInput {
  sourceType?: TrainingExampleSourceType;
  sourceId?: string | null;
  subject?: string | null;
  topic?: string | null;
  learningMode?: string | null;
  userLevel?: string | null;
  inputMessages?: TrainingMessage[];
  idealResponse?: string;
  qualityScore?: number;
  status?: TrainingExampleStatus;
}

export interface TrainingDatasetExportPayload {
  datasetId: string;
  format: TrainingDatasetExportFormat;
  filename: string;
  mimeType: 'application/x-ndjson' | 'application/json';
  content: string;
  exportedCount: number;
}
