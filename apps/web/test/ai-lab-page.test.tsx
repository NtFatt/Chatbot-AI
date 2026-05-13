import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AiLabPage } from '../src/features/ai-lab/AiLabPage';

vi.mock('../src/services/training-service', () => ({
  fetchTrainingDatasets: vi.fn(),
  fetchTrainingExamples: vi.fn(),
  fetchTrainingJobs: vi.fn(),
  createTrainingDataset: vi.fn(),
  createTrainingExample: vi.fn(),
  approveTrainingExample: vi.fn(),
  rejectTrainingExample: vi.fn(),
  exportTrainingDataset: vi.fn(),
  createTrainingJob: vi.fn(),
}));

vi.mock('../src/services/evals-service', () => ({
  fetchEvalCases: vi.fn(),
  fetchEvalRuns: vi.fn(),
  createEvalCase: vi.fn(),
  createEvalRun: vi.fn(),
  deleteEvalCase: vi.fn(),
}));

vi.mock('../src/services/models-service', () => ({
  fetchModelVersions: vi.fn(),
  fetchActiveModels: vi.fn(),
  activateModelVersion: vi.fn(),
}));

import {
  approveTrainingExample,
  createTrainingDataset,
  createTrainingExample,
  createTrainingJob,
  exportTrainingDataset,
  fetchTrainingDatasets,
  fetchTrainingExamples,
  fetchTrainingJobs,
  rejectTrainingExample,
} from '../src/services/training-service';
import {
  createEvalCase,
  createEvalRun,
  deleteEvalCase,
  fetchEvalCases,
  fetchEvalRuns,
} from '../src/services/evals-service';
import {
  activateModelVersion,
  fetchActiveModels,
  fetchModelVersions,
} from '../src/services/models-service';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/ai-lab']}>
        <Routes>
          <Route path="/app/ai-lab" element={<AiLabPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('AiLabPage', () => {
  it('renders datasets and examples from the training workspace', async () => {
    vi.mocked(fetchTrainingDatasets).mockResolvedValue({
      items: [
        {
          id: 'dataset-1',
          name: 'Vietnamese tutoring L3',
          description: 'Focus on tutoring answers',
          status: 'active',
          version: 1,
          totalExamples: 1,
          approvedExamples: 1,
          draftExamples: 0,
          rejectedExamples: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });
    vi.mocked(fetchTrainingExamples).mockResolvedValue({
      items: [
        {
          id: 'example-1',
          datasetId: 'dataset-1',
          sourceType: 'manual',
          sourceId: null,
          subject: 'SQL',
          topic: null,
          learningMode: null,
          userLevel: null,
          inputMessages: [{ role: 'user', content: 'Explain SQL joins' }],
          idealResponse: 'A join combines rows from multiple tables.',
          qualityScore: 4,
          status: 'approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });
    vi.mocked(fetchTrainingJobs).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalCases).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalRuns).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchModelVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchActiveModels).mockResolvedValue({ items: [], total: 0 });

    renderPage();

    await screen.findByText('Vietnamese tutoring L3');
    await waitFor(() => {
      expect(fetchTrainingExamples).toHaveBeenCalled();
    });
    expect(screen.getByText('A join combines rows from multiple tables.')).toBeTruthy();
  });

  it('creates a dataset and approves an example from the AI lab', async () => {
    const user = userEvent.setup();
    const existingDataset = {
      id: 'dataset-1',
      name: 'Dataset 1',
      description: 'desc',
      status: 'draft',
      version: 1,
      totalExamples: 1,
      approvedExamples: 0,
      draftExamples: 1,
      rejectedExamples: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const createdDataset = {
      id: 'dataset-2',
      name: 'New dataset',
      description: 'new',
      status: 'draft',
      version: 1,
      totalExamples: 0,
      approvedExamples: 0,
      draftExamples: 0,
      rejectedExamples: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    vi.mocked(fetchTrainingDatasets)
      .mockResolvedValueOnce({
        items: [existingDataset],
        total: 1,
      })
      .mockResolvedValue({
        items: [existingDataset, createdDataset],
        total: 2,
      });
    vi.mocked(fetchTrainingExamples).mockResolvedValue({
      items: [
        {
          id: 'example-1',
          datasetId: 'dataset-1',
          sourceType: 'manual',
          sourceId: null,
          subject: null,
          topic: null,
          learningMode: null,
          userLevel: null,
          inputMessages: [{ role: 'user', content: 'Explain joins' }],
          idealResponse: 'A join combines rows.',
          qualityScore: 3,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });
    vi.mocked(fetchTrainingJobs).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalCases).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalRuns).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchModelVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchActiveModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(createTrainingDataset).mockResolvedValue(createdDataset);
    vi.mocked(approveTrainingExample).mockResolvedValue({
      id: 'example-1',
      datasetId: 'dataset-1',
      sourceType: 'manual',
      sourceId: null,
      subject: null,
      topic: null,
      learningMode: null,
      userLevel: null,
      inputMessages: [{ role: 'user', content: 'Explain joins' }],
      idealResponse: 'A join combines rows.',
      qualityScore: 3,
      status: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(createTrainingExample).mockResolvedValue(undefined as never);
    vi.mocked(rejectTrainingExample).mockResolvedValue(undefined as never);
    vi.mocked(exportTrainingDataset).mockResolvedValue(undefined as never);
    vi.mocked(createTrainingJob).mockResolvedValue(undefined as never);
    vi.mocked(createEvalCase).mockResolvedValue(undefined as never);
    vi.mocked(createEvalRun).mockResolvedValue(undefined as never);
    vi.mocked(deleteEvalCase).mockResolvedValue(undefined as never);
    vi.mocked(activateModelVersion).mockResolvedValue(undefined as never);

    renderPage();

    await screen.findByText('Dataset 1');
    await user.type(screen.getByPlaceholderText('Vietnamese tutoring L3'), 'New dataset');
    await user.click(screen.getByText('Create dataset'));

    expect(vi.mocked(createTrainingDataset).mock.calls[0]?.[0]).toEqual({
      name: 'New dataset',
      description: undefined,
    });

    await waitFor(() => {
      expect(fetchTrainingDatasets).toHaveBeenCalledTimes(2);
    });

    await user.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(vi.mocked(approveTrainingExample).mock.calls[0]?.[0]).toBe('example-1');
    });
  });

  it('shows the internal L3 model in the registry and hides it from the eval benchmark selector', async () => {
    vi.mocked(fetchTrainingDatasets).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchTrainingExamples).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchTrainingJobs).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalCases).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchEvalRuns).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(fetchModelVersions).mockResolvedValue({
      items: [
        {
          id: 'model-internal',
          name: 'Internal L3 Tutor',
          provider: 'internal_l3_tutor',
          baseModel: 'internal-l3-tutor-v1',
          fineTunedModel: null,
          status: 'ready',
          isActive: true,
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'model-openai-ft',
          name: 'OpenAI FT',
          provider: 'fine_tuned_openai',
          baseModel: 'gpt-5.4-mini',
          fineTunedModel: 'ft:gpt-5.4-mini:l3',
          status: 'ready',
          isActive: false,
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 2,
    });
    vi.mocked(fetchActiveModels).mockResolvedValue({
      items: [
        {
          runtimeProvider: 'internal_l3_tutor',
          version: {
            id: 'model-internal',
            name: 'Internal L3 Tutor',
            provider: 'internal_l3_tutor',
            baseModel: 'internal-l3-tutor-v1',
            fineTunedModel: null,
            status: 'ready',
            isActive: true,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      total: 1,
    });

    renderPage();

    await screen.findByText('Internal L3 Tutor: Internal L3 Tutor');
    expect(screen.getByText('Internal L3 Tutor / internal-l3-tutor-v1')).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Internal L3 Tutor (ready)' })).toBeNull();
    expect(screen.getByRole('option', { name: 'OpenAI FT (ready)' })).toBeTruthy();
  });
});
