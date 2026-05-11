import type {
  CreateEvalCaseInput,
  CreateEvalRunInput,
  EvalCase,
  EvalRun,
  PaginatedResponse,
  UpdateEvalCaseInput,
} from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const fetchEvalCases = () =>
  apiRequest<PaginatedResponse<EvalCase>>('/api/evals/cases', {
    method: 'GET',
  });

export const createEvalCase = (input: CreateEvalCaseInput) =>
  apiRequest<EvalCase>('/api/evals/cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateEvalCase = (evalCaseId: string, input: UpdateEvalCaseInput) =>
  apiRequest<EvalCase>(`/api/evals/cases/${evalCaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteEvalCase = (evalCaseId: string) =>
  apiRequest<{ deleted: boolean }>(`/api/evals/cases/${evalCaseId}`, {
    method: 'DELETE',
  });

export const fetchEvalRuns = () =>
  apiRequest<PaginatedResponse<EvalRun>>('/api/evals/runs', {
    method: 'GET',
  });

export const createEvalRun = (input: CreateEvalRunInput) =>
  apiRequest<EvalRun>('/api/evals/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
