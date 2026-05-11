import type {
  CreateTrainingDatasetInput,
  CreateTrainingExampleInput,
  CreateTrainingJobInput,
  PaginatedResponse,
  TrainingDatasetExportFormat,
  TrainingDatasetExportPayload,
  TrainingDatasetSummary,
  TrainingExample,
  TrainingJob,
  UpdateTrainingExampleInput,
} from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const fetchTrainingDatasets = () =>
  apiRequest<PaginatedResponse<TrainingDatasetSummary>>('/api/training/datasets', {
    method: 'GET',
  });

export const createTrainingDataset = (input: CreateTrainingDatasetInput) =>
  apiRequest<TrainingDatasetSummary>('/api/training/datasets', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchTrainingExamples = (datasetId: string) =>
  apiRequest<PaginatedResponse<TrainingExample>>(`/api/training/datasets/${datasetId}/examples`, {
    method: 'GET',
  });

export const createTrainingExample = (
  datasetId: string,
  input: CreateTrainingExampleInput,
) =>
  apiRequest<TrainingExample>(`/api/training/datasets/${datasetId}/examples`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateTrainingExample = (exampleId: string, input: UpdateTrainingExampleInput) =>
  apiRequest<TrainingExample>(`/api/training/examples/${exampleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const approveTrainingExample = (exampleId: string) =>
  apiRequest<TrainingExample>(`/api/training/examples/${exampleId}/approve`, {
    method: 'POST',
  });

export const rejectTrainingExample = (exampleId: string) =>
  apiRequest<TrainingExample>(`/api/training/examples/${exampleId}/reject`, {
    method: 'POST',
  });

export const exportTrainingDataset = (
  datasetId: string,
  format: TrainingDatasetExportFormat,
) =>
  apiRequest<TrainingDatasetExportPayload>(`/api/training/datasets/${datasetId}/export`, {
    method: 'GET',
    params: { format },
  });

export const fetchTrainingJobs = () =>
  apiRequest<PaginatedResponse<TrainingJob>>('/api/training/jobs', {
    method: 'GET',
  });

export const createTrainingJob = (input: CreateTrainingJobInput) =>
  apiRequest<TrainingJob>('/api/training/jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
