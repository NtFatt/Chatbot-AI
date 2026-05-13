import { useEffect, useMemo, useState } from 'react';

import type { EvalCategory, ExternalProviderKey, ModelVersion } from '@chatbot-ai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, FlaskConical, Play, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { createEvalCase, createEvalRun, deleteEvalCase, fetchEvalCases, fetchEvalRuns } from '../../services/evals-service';
import { activateModelVersion, fetchActiveModels, fetchModelVersions } from '../../services/models-service';
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
} from '../../services/training-service';
import { queryKeys } from '../../utils/query-keys';
import { getTransportErrorInfo, toPanelError } from '../../utils/transport-errors';

const fieldClass =
  'w-full rounded-2xl border border-black/[0.08] bg-white/92 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ocean/40 focus:ring-2 focus:ring-ocean/15 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-cyan/40 dark:focus:ring-cyan/15';
const panelClass =
  'rounded-[28px] border border-black/[0.06] bg-white/72 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.82)]';

const evalCategories: Array<{ value: EvalCategory; label: string }> = [
  { value: 'explain_concept', label: 'Explain concept' },
  { value: 'socratic_hint', label: 'Socratic hint' },
  { value: 'grade_answer', label: 'Grade answer' },
  { value: 'generate_quiz', label: 'Generate quiz' },
  { value: 'summarize_lesson', label: 'Summarize lesson' },
  { value: 'source_grounded_answer', label: 'Source grounded' },
  { value: 'fallback_transparency', label: 'Fallback transparency' },
];

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const showMutationError = (error: unknown, fallbackMessage: string) => {
  const info = getTransportErrorInfo(error, fallbackMessage);
  toast.error(info.message, {
    description: info.description,
  });
};

const runtimeProviderLabel = (provider: string) => {
  switch (provider) {
    case 'internal_l3_tutor':
      return 'Internal L3 Tutor';
    case 'GEMINI':
      return 'Gemini';
    case 'OPENAI':
      return 'OpenAI';
    case 'LOCAL':
      return 'Local runtime';
    default:
      return provider;
  }
};

const modelProviderLabel = (provider: ModelVersion['provider']) => {
  switch (provider) {
    case 'internal_l3_tutor':
      return 'Internal L3 Tutor';
    case 'gemini':
      return 'Gemini';
    case 'openai':
      return 'OpenAI';
    case 'fine_tuned_openai':
      return 'Fine-tuned OpenAI';
    case 'local_ollama':
      return 'Local Ollama';
    case 'local_lora':
      return 'Local LoRA';
    default:
      return provider;
  }
};

const benchmarkableProviders = new Set<ModelVersion['provider']>(['gemini', 'openai', 'fine_tuned_openai', 'local_lora']);

export const AiLabPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [examplePrompt, setExamplePrompt] = useState('');
  const [exampleIdealResponse, setExampleIdealResponse] = useState('');
  const [evalCaseName, setEvalCaseName] = useState('');
  const [evalCaseCategory, setEvalCaseCategory] = useState<EvalCategory>('explain_concept');
  const [evalCasePrompt, setEvalCasePrompt] = useState('');
  const [evalCaseIdealResponse, setEvalCaseIdealResponse] = useState('');
  const [evalProvider, setEvalProvider] = useState<ExternalProviderKey>('OPENAI');
  const [evalModelOverride, setEvalModelOverride] = useState('');
  const [selectedEvalModelVersionId, setSelectedEvalModelVersionId] = useState('');
  const [trainingProvider, setTrainingProvider] = useState<'fine_tuned_openai' | 'local_lora'>('local_lora');
  const [trainingBaseModel, setTrainingBaseModel] = useState('gpt-5.4-mini');

  const trainingDatasetsQuery = useQuery({ queryKey: queryKeys.trainingDatasets, queryFn: fetchTrainingDatasets });
  const trainingExamplesQuery = useQuery({
    enabled: Boolean(selectedDatasetId),
    queryKey: queryKeys.trainingExamples(selectedDatasetId),
    queryFn: () => fetchTrainingExamples(selectedDatasetId!),
  });
  const trainingJobsQuery = useQuery({ queryKey: queryKeys.trainingJobs, queryFn: fetchTrainingJobs });
  const evalCasesQuery = useQuery({ queryKey: queryKeys.evalCases, queryFn: fetchEvalCases });
  const evalRunsQuery = useQuery({ queryKey: queryKeys.evalRuns, queryFn: fetchEvalRuns });
  const modelVersionsQuery = useQuery({ queryKey: queryKeys.modelVersions, queryFn: fetchModelVersions });
  const activeModelsQuery = useQuery({ queryKey: queryKeys.activeModels, queryFn: fetchActiveModels });
  const trainingDatasetsError = trainingDatasetsQuery.error
    ? toPanelError(trainingDatasetsQuery.error, 'Could not load training datasets.')
    : null;
  const trainingExamplesError = trainingExamplesQuery.error
    ? toPanelError(trainingExamplesQuery.error, 'Could not load training examples.')
    : null;
  const trainingJobsError = trainingJobsQuery.error
    ? toPanelError(trainingJobsQuery.error, 'Could not load training jobs.')
    : null;
  const evalCasesError = evalCasesQuery.error
    ? toPanelError(evalCasesQuery.error, 'Could not load evaluation cases.')
    : null;
  const evalRunsError = evalRunsQuery.error
    ? toPanelError(evalRunsQuery.error, 'Could not load evaluation runs.')
    : null;
  const modelVersionsError = modelVersionsQuery.error
    ? toPanelError(modelVersionsQuery.error, 'Could not load model versions.')
    : null;
  const activeModelsError = activeModelsQuery.error
    ? toPanelError(activeModelsQuery.error, 'Could not load the active model registry state.')
    : null;
  const aiLabLoadErrors = [
    trainingDatasetsError,
    trainingExamplesError,
    trainingJobsError,
    evalCasesError,
    evalRunsError,
    modelVersionsError,
    activeModelsError,
  ].filter((error): error is NonNullable<typeof error> => Boolean(error));
  const trainingDatasets = trainingDatasetsQuery.data?.items ?? [];
  const trainingExamples = trainingExamplesQuery.data?.items ?? [];
  const trainingJobs = trainingJobsQuery.data?.items ?? [];
  const evalCases = evalCasesQuery.data?.items ?? [];
  const evalRuns = evalRunsQuery.data?.items ?? [];
  const modelVersions = modelVersionsQuery.data?.items ?? [];
  const activeModels = activeModelsQuery.data?.items ?? [];
  const benchmarkableModelVersions = useMemo(
    () => modelVersions.filter((version) => benchmarkableProviders.has(version.provider)),
    [modelVersions],
  );

  useEffect(() => {
    if (!selectedDatasetId && trainingDatasetsQuery.data?.items.length) {
      setSelectedDatasetId(trainingDatasetsQuery.data.items[0]!.id);
    }
  }, [selectedDatasetId, trainingDatasetsQuery.data?.items]);

  const selectedDataset =
    trainingDatasets.find((dataset) => dataset.id === selectedDatasetId) ?? null;

  const invalidateTraining = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trainingDatasets });
    void queryClient.invalidateQueries({ queryKey: queryKeys.trainingJobs });
    void queryClient.invalidateQueries({ queryKey: queryKeys.modelVersions });
    if (selectedDatasetId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trainingExamples(selectedDatasetId) });
    }
  };

  const createDatasetMutation = useMutation({
    mutationFn: createTrainingDataset,
    onSuccess: (dataset) => {
      invalidateTraining();
      setSelectedDatasetId(dataset.id);
      setDatasetName('');
      setDatasetDescription('');
      toast.success('Training dataset created');
    },
    onError: (error) => {
      showMutationError(error, 'Could not create the training dataset.');
    },
  });
  const createExampleMutation = useMutation({
    mutationFn: () =>
      createTrainingExample(selectedDatasetId!, {
        sourceType: 'manual',
        inputMessages: [{ role: 'user', content: examplePrompt }],
        idealResponse: exampleIdealResponse,
      }),
    onSuccess: () => {
      invalidateTraining();
      setExamplePrompt('');
      setExampleIdealResponse('');
      toast.success('Training example saved');
    },
    onError: (error) => {
      showMutationError(error, 'Could not save the training example.');
    },
  });
  const approveExampleMutation = useMutation({
    mutationFn: approveTrainingExample,
    onSuccess: invalidateTraining,
    onError: (error) => {
      showMutationError(error, 'Could not approve the training example.');
    },
  });
  const rejectExampleMutation = useMutation({
    mutationFn: rejectTrainingExample,
    onSuccess: invalidateTraining,
    onError: (error) => {
      showMutationError(error, 'Could not reject the training example.');
    },
  });
  const exportDatasetMutation = useMutation({
    mutationFn: ({ datasetId, format }: { datasetId: string; format: 'openai_jsonl' | 'hf_chat' }) =>
      exportTrainingDataset(datasetId, format),
    onSuccess: (payload) => {
      downloadTextFile(payload.filename, payload.content, payload.mimeType);
      toast.success(`Exported ${payload.exportedCount} approved examples`);
    },
    onError: (error) => {
      showMutationError(error, 'Could not export the training dataset.');
    },
  });
  const createTrainingJobMutation = useMutation({
    mutationFn: () => createTrainingJob({ datasetId: selectedDatasetId!, provider: trainingProvider, baseModel: trainingBaseModel }),
    onSuccess: () => {
      invalidateTraining();
      toast.success('Training job scaffolded');
    },
    onError: (error) => {
      showMutationError(error, 'Could not scaffold the training job.');
    },
  });
  const createEvalCaseMutation = useMutation({
    mutationFn: () =>
      createEvalCase({
        name: evalCaseName,
        category: evalCaseCategory,
        inputMessages: [{ role: 'user', content: evalCasePrompt }],
        idealResponse: evalCaseIdealResponse || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.evalCases });
      setEvalCaseName('');
      setEvalCasePrompt('');
      setEvalCaseIdealResponse('');
      toast.success('Eval case created');
    },
    onError: (error) => {
      showMutationError(error, 'Could not create the evaluation case.');
    },
  });
  const deleteEvalCaseMutation = useMutation({
    mutationFn: deleteEvalCase,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.evalCases }),
    onError: (error) => {
      showMutationError(error, 'Could not delete the evaluation case.');
    },
  });
  const createEvalRunMutation = useMutation({
    mutationFn: () =>
      createEvalRun({
        provider: selectedEvalModelVersionId ? undefined : evalProvider,
        model: selectedEvalModelVersionId || !evalModelOverride.trim() ? undefined : evalModelOverride.trim(),
        modelVersionId: selectedEvalModelVersionId || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.evalRuns });
      toast.success('Benchmark run completed');
    },
    onError: (error) => {
      showMutationError(error, 'Could not complete the benchmark run.');
    },
  });
  const activateModelVersionMutation = useMutation({
    mutationFn: activateModelVersion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modelVersions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activeModels });
      toast.success('Model version activated');
    },
    onError: (error) => {
      showMutationError(error, 'Could not activate the model version.');
    },
  });
  const exportingDatasetId = exportDatasetMutation.variables?.datasetId ?? null;
  const approvingExampleId = approveExampleMutation.isPending ? approveExampleMutation.variables ?? null : null;
  const rejectingExampleId = rejectExampleMutation.isPending ? rejectExampleMutation.variables ?? null : null;
  const deletingEvalCaseId = deleteEvalCaseMutation.isPending ? deleteEvalCaseMutation.variables ?? null : null;
  const activatingModelVersionId = activateModelVersionMutation.isPending
    ? activateModelVersionMutation.variables ?? null
    : null;

  const comparison = useMemo(() => {
    const versions = new Map((modelVersionsQuery.data?.items ?? []).map((version) => [version.id, version]));
    const baseRun = (evalRunsQuery.data?.items ?? []).find((run) => !run.modelVersionId) ?? null;
    const fineTunedRun =
      (evalRunsQuery.data?.items ?? []).find((run) => {
        const version = run.modelVersionId ? versions.get(run.modelVersionId) : null;
        return version?.provider === 'fine_tuned_openai' || version?.provider === 'local_lora';
      }) ?? null;

    const labelFor = (version: ModelVersion | null | undefined) => version?.fineTunedModel ?? version?.baseModel ?? 'Base runtime';

    return {
      baseRun,
      fineTunedRun,
      baseLabel: labelFor(baseRun?.modelVersionId ? versions.get(baseRun.modelVersionId) : null),
      fineTunedLabel: labelFor(fineTunedRun?.modelVersionId ? versions.get(fineTunedRun.modelVersionId) : null),
    };
  }, [evalRunsQuery.data?.items, modelVersionsQuery.data?.items]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] px-4 py-5 dark:bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.12),_transparent_26%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className={`${panelClass} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean/70 dark:text-cyan/70">Phase AI-L3 Workspace</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink dark:text-slate-50">AI Lab</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68 dark:text-slate-300">Manage training datasets, eval runs, and model registry state in one internal workspace.</p>
          </div>
          <button className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/88 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100" onClick={() => navigate('/app')} type="button">
            <ArrowLeft className="h-4 w-4" />
            Back To Workspace
          </button>
        </div>

        {aiLabLoadErrors.length > 0 ? (
          <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/6 px-4 py-3 text-sm text-ink dark:border-amber-400/20 dark:bg-amber-400/8 dark:text-slate-100">
            <p className="font-semibold text-amber-700 dark:text-amber-300">Some AI Lab panels did not load cleanly.</p>
            <div className="mt-2 space-y-1 text-xs leading-5 text-ink/70 dark:text-slate-300">
              {aiLabLoadErrors.map((error, index) => (
                <p key={`${error.message}-${index}`}>
                  {error.message}
                  {error.meta ? ` · ${error.meta}` : ''}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className={`${panelClass} space-y-4`} data-testid="ai-lab-datasets">
            <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <div className="space-y-2 rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">New dataset</p>
                  <input className={fieldClass} onChange={(event) => setDatasetName(event.target.value)} placeholder="Vietnamese tutoring L3" value={datasetName} />
                  <textarea className={`${fieldClass} min-h-[88px] resize-y`} onChange={(event) => setDatasetDescription(event.target.value)} placeholder="Describe scope and quality bar." value={datasetDescription} />
                  <button className="focus-ring rounded-xl bg-ocean px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90 disabled:opacity-60 dark:bg-cyan dark:text-slate-950" disabled={createDatasetMutation.isPending || datasetName.trim().length === 0} onClick={() => createDatasetMutation.mutate({ name: datasetName, description: datasetDescription || undefined })} type="button">Create dataset</button>
                </div>
                {trainingDatasetsQuery.isLoading && trainingDatasets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                    Loading datasets...
                  </div>
                ) : null}
                {trainingDatasetsError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                    {trainingDatasetsError.message}
                    {trainingDatasetsError.meta ? ` · ${trainingDatasetsError.meta}` : ''}
                  </div>
                ) : null}
                {trainingDatasets.length === 0 && !trainingDatasetsQuery.isLoading && !trainingDatasetsError ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                    No training datasets yet. Create one to start curating Level 3 examples.
                  </div>
                ) : null}
                {trainingDatasets.map((dataset) => (
                  <button className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedDatasetId === dataset.id ? 'border-ocean/25 bg-ocean/8 dark:border-cyan/25 dark:bg-cyan/10' : 'border-black/[0.06] bg-white/58 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.03]'}`} key={dataset.id} onClick={() => setSelectedDatasetId(dataset.id)} type="button">
                    <p className="text-sm font-semibold text-ink dark:text-slate-100">{dataset.name}</p>
                    <p className="mt-1 text-xs text-ink/55 dark:text-slate-400">{dataset.description ?? 'No description yet'}</p>
                    <p className="mt-2 text-[11px] font-semibold text-ink/55 dark:text-slate-400">{dataset.totalExamples} total / {dataset.approvedExamples} approved / {dataset.draftExamples} draft</p>
                  </button>
                ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-slate-100">{selectedDataset?.name ?? 'Select a dataset'}</p>
                    <p className="text-xs text-ink/55 dark:text-slate-400">Only approved examples are exported into fine-tune files.</p>
                  </div>
                  {selectedDataset ? (
                    <div className="flex gap-2">
                      <button aria-label="Export approved examples as OpenAI JSONL" className="focus-ring rounded-xl border border-black/[0.08] bg-white/82 px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200" disabled={exportDatasetMutation.isPending && exportingDatasetId === selectedDataset.id} onClick={() => exportDatasetMutation.mutate({ datasetId: selectedDataset.id, format: 'openai_jsonl' })} type="button"><Download className="mr-1 inline h-3.5 w-3.5" />JSONL</button>
                      <button aria-label="Export approved examples as Hugging Face chat JSON" className="focus-ring rounded-xl border border-black/[0.08] bg-white/82 px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200" disabled={exportDatasetMutation.isPending && exportingDatasetId === selectedDataset.id} onClick={() => exportDatasetMutation.mutate({ datasetId: selectedDataset.id, format: 'hf_chat' })} type="button"><Download className="mr-1 inline h-3.5 w-3.5" />HF</button>
                    </div>
                  ) : null}
                </div>
                {selectedDataset ? (
                  <>
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <select className={fieldClass} onChange={(event) => setTrainingProvider(event.target.value as 'fine_tuned_openai' | 'local_lora')} value={trainingProvider}>
                        <option value="local_lora">local_lora</option>
                        <option value="fine_tuned_openai">fine_tuned_openai</option>
                      </select>
                      <input className={fieldClass} onChange={(event) => setTrainingBaseModel(event.target.value)} value={trainingBaseModel} />
                      <button className="focus-ring rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500/90 disabled:opacity-60" disabled={createTrainingJobMutation.isPending} onClick={() => createTrainingJobMutation.mutate()} type="button"><FlaskConical className="mr-1 inline h-3.5 w-3.5" />Job</button>
                    </div>
                    <textarea className={`${fieldClass} min-h-[86px] resize-y`} onChange={(event) => setExamplePrompt(event.target.value)} placeholder="Student prompt" value={examplePrompt} />
                    <textarea className={`${fieldClass} min-h-[100px] resize-y`} onChange={(event) => setExampleIdealResponse(event.target.value)} placeholder="Ideal assistant response" value={exampleIdealResponse} />
                    <button className="focus-ring rounded-xl bg-ocean px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90 disabled:opacity-60 dark:bg-cyan dark:text-slate-950" disabled={createExampleMutation.isPending || examplePrompt.trim().length === 0 || exampleIdealResponse.trim().length === 0} onClick={() => createExampleMutation.mutate()} type="button">Save example</button>
                    {trainingExamplesQuery.isLoading ? (
                      <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                        Loading examples...
                      </div>
                    ) : null}
                    {trainingExamplesError ? (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                        {trainingExamplesError.message}
                        {trainingExamplesError.meta ? ` · ${trainingExamplesError.meta}` : ''}
                      </div>
                    ) : null}
                    {trainingExamples.length === 0 && !trainingExamplesQuery.isLoading && !trainingExamplesError ? (
                      <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                        No examples in this dataset yet. Save a prompt/ideal-response pair to begin approval.
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {trainingExamples.map((example) => (
                        <div className="rounded-2xl border border-black/[0.06] bg-white/82 p-3 dark:border-white/10 dark:bg-slate-950/30" key={example.id}>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">{example.status}</p>
                          <p className="mt-1 text-sm font-medium text-ink dark:text-slate-100">{example.inputMessages[0]?.content}</p>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/58 dark:text-slate-400">{example.idealResponse}</p>
                          <div className="mt-3 flex gap-2">
                            <button className="focus-ring rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 disabled:opacity-60 dark:text-emerald-400" disabled={approvingExampleId === example.id || rejectingExampleId === example.id} onClick={() => approveExampleMutation.mutate(example.id)} type="button"><Check className="mr-1 inline h-3.5 w-3.5" />Approve</button>
                            <button className="focus-ring rounded-xl border border-red-500/20 bg-red-500/8 px-2.5 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60 dark:text-red-400" disabled={approvingExampleId === example.id || rejectingExampleId === example.id} onClick={() => rejectExampleMutation.mutate(example.id)} type="button"><X className="mr-1 inline h-3.5 w-3.5" />Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">Select a dataset to manage examples.</div>}
              </div>
            </div>
          </section>

          <section className={`${panelClass} space-y-4`} data-testid="ai-lab-evals">
            <div className="space-y-2 rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Create eval case</p>
              <input className={fieldClass} onChange={(event) => setEvalCaseName(event.target.value)} placeholder="Explain SQL joins" value={evalCaseName} />
              <select className={fieldClass} onChange={(event) => setEvalCaseCategory(event.target.value as EvalCategory)} value={evalCaseCategory}>{evalCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select>
              <textarea className={`${fieldClass} min-h-[86px] resize-y`} onChange={(event) => setEvalCasePrompt(event.target.value)} placeholder="Prompt to benchmark" value={evalCasePrompt} />
              <textarea className={`${fieldClass} min-h-[100px] resize-y`} onChange={(event) => setEvalCaseIdealResponse(event.target.value)} placeholder="Reference answer (optional)" value={evalCaseIdealResponse} />
              <button className="focus-ring rounded-xl bg-ocean px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90 disabled:opacity-60 dark:bg-cyan dark:text-slate-950" disabled={createEvalCaseMutation.isPending || evalCaseName.trim().length === 0 || evalCasePrompt.trim().length === 0} onClick={() => createEvalCaseMutation.mutate()} type="button"><ShieldCheck className="mr-1 inline h-4 w-4" />Save eval case</button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                {evalCasesQuery.isLoading && evalCases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                    Loading evaluation cases...
                  </div>
                ) : null}
                {evalCasesError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                    {evalCasesError.message}
                    {evalCasesError.meta ? ` · ${evalCasesError.meta}` : ''}
                  </div>
                ) : null}
                {evalCases.length === 0 && !evalCasesQuery.isLoading && !evalCasesError ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                    No evaluation cases yet. Save a benchmark prompt to start measuring runtime quality.
                  </div>
                ) : null}
                {evalCases.map((evalCase) => <div className="rounded-2xl border border-black/[0.06] bg-white/58 p-3 dark:border-white/10 dark:bg-white/[0.03]" key={evalCase.id}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink dark:text-slate-100">{evalCase.name}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">{evalCase.category}</p></div><button className="focus-ring rounded-xl border border-red-500/20 bg-red-500/8 px-2.5 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60 dark:text-red-400" disabled={deletingEvalCaseId === evalCase.id} onClick={() => deleteEvalCaseMutation.mutate(evalCase.id)} type="button">Delete</button></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/58 dark:text-slate-400">{evalCase.inputMessages[0]?.content}</p></div>)}
              </div>
              <div className="space-y-2 rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <select className={fieldClass} onChange={(event) => setEvalProvider(event.target.value as ExternalProviderKey)} value={evalProvider}><option value="OPENAI">OPENAI</option><option value="GEMINI">GEMINI</option></select>
                <input className={fieldClass} onChange={(event) => setEvalModelOverride(event.target.value)} placeholder="Optional model override" value={evalModelOverride} />
                <select className={fieldClass} onChange={(event) => setSelectedEvalModelVersionId(event.target.value)} value={selectedEvalModelVersionId}><option value="">Use current runtime model</option>{benchmarkableModelVersions.map((version) => <option key={version.id} value={version.id}>{version.name} ({version.status})</option>)}</select>
                {modelVersions.length > 0 && benchmarkableModelVersions.length === 0 ? (
                  <p className="text-xs leading-5 text-ink/55 dark:text-slate-400">
                    Evaluation runs currently benchmark external or fine-tuned OpenAI/Gemini versions. Internal L3 Tutor and local scaffolds stay visible in the model registry panel below.
                  </p>
                ) : null}
                <button className="focus-ring rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-500/90 disabled:opacity-60" disabled={createEvalRunMutation.isPending || evalCases.length === 0} onClick={() => createEvalRunMutation.mutate()} type="button"><Play className="mr-1 inline h-4 w-4" />Run all cases</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">Base comparison</p><p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{comparison.baseLabel}</p><p className="mt-1 text-2xl font-semibold text-ocean dark:text-cyan">{comparison.baseRun?.averageScore?.toFixed(2) ?? 'N/A'}</p></div><div className="rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">Fine-tuned comparison</p><p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{comparison.fineTunedLabel}</p><p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{comparison.fineTunedRun?.averageScore?.toFixed(2) ?? 'N/A'}</p></div></div>
            <div className="space-y-2">
              {evalRunsQuery.isLoading && evalRuns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                  Loading evaluation runs...
                </div>
              ) : null}
              {evalRunsError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                  {evalRunsError.message}
                  {evalRunsError.meta ? ` · ${evalRunsError.meta}` : ''}
                </div>
              ) : null}
              {evalRuns.length === 0 && !evalRunsQuery.isLoading && !evalRunsError ? (
                <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                  No benchmark runs yet. Run the current case pack to capture a baseline score.
                </div>
              ) : null}
              {evalRuns.map((run) => <div className="rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]" key={run.id}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink dark:text-slate-100">{runtimeProviderLabel(run.provider)} / {run.model}</p><p className="mt-1 text-xs text-ink/55 dark:text-slate-400">Avg score: {run.averageScore?.toFixed(2) ?? 'N/A'}</p></div><span className="rounded-full bg-black/[0.05] px-2 py-1 text-[11px] font-semibold text-ink/60 dark:bg-white/10 dark:text-slate-300">{new Date(run.createdAt).toLocaleString()}</span></div><div className="mt-3 space-y-2">{run.results.map((result) => <div className="rounded-xl border border-black/[0.05] bg-white/82 px-3 py-2 text-xs dark:border-white/8 dark:bg-slate-950/30" key={result.id}><div className="flex items-center justify-between gap-3"><span className="font-semibold text-ink dark:text-slate-100">{result.evalCaseName}</span><span className="font-semibold text-ocean dark:text-cyan">{result.score.toFixed(2)}</span></div>{result.notes ? <p className="mt-1 text-ink/55 dark:text-slate-400">{result.notes}</p> : null}</div>)}</div></div>)}
            </div>
          </section>
        </div>

        <section className={`${panelClass} space-y-4`} data-testid="ai-lab-models">
          <div className="flex flex-wrap gap-2">
            {activeModels.map((item) => <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs font-semibold text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-400" key={`${item.runtimeProvider}-${item.version.id}`}>{runtimeProviderLabel(item.runtimeProvider)}: {item.version.name}</span>)}
            {activeModelsError ? (
              <span className="rounded-full border border-red-500/20 bg-red-500/8 px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300">
                {activeModelsError.message}
              </span>
            ) : null}
            {activeModels.length === 0 && !activeModelsQuery.isLoading && !activeModelsError ? (
              <span className="rounded-full border border-black/[0.08] bg-white/82 px-3 py-1 text-xs font-semibold text-ink/62 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                No active model overrides. External API mode uses provider defaults, while Learning Engine L3 uses Internal L3 Tutor.
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-2">
              {modelVersionsError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                  {modelVersionsError.message}
                  {modelVersionsError.meta ? ` · ${modelVersionsError.meta}` : ''}
                </div>
              ) : null}
              {modelVersions.length === 0 && !modelVersionsQuery.isLoading && !modelVersionsError ? (
                <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                  No model versions registered yet. Training jobs will populate this panel as they progress.
                </div>
              ) : null}
              {modelVersions.map((version) => <div className="rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]" key={version.id}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink dark:text-slate-100">{version.name}</p><p className="mt-1 text-xs text-ink/55 dark:text-slate-400">{modelProviderLabel(version.provider)} / {version.fineTunedModel ?? version.baseModel}</p></div><button className="focus-ring rounded-xl border border-black/[0.08] bg-white/82 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200" disabled={activatingModelVersionId === version.id || version.status !== 'ready'} onClick={() => {
                if (!window.confirm(`Activate ${version.name} for the ${version.provider} runtime group?`)) {
                  return;
                }
                activateModelVersionMutation.mutate(version.id);
              }} type="button">Activate</button></div></div>)}
            </div>
            <div className="space-y-2">
              {trainingJobsError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-xs leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-300">
                  {trainingJobsError.message}
                  {trainingJobsError.meta ? ` · ${trainingJobsError.meta}` : ''}
                </div>
              ) : null}
              {trainingJobs.length === 0 && !trainingJobsQuery.isLoading && !trainingJobsError ? (
                <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-ink/55 dark:border-white/10 dark:text-slate-400">
                  No training jobs yet. Scaffold one from an approved dataset export to populate this queue.
                </div>
              ) : null}
              {trainingJobs.map((job) => <div className="rounded-2xl border border-black/[0.06] bg-white/58 p-4 dark:border-white/10 dark:bg-white/[0.03]" key={job.id}><p className="text-sm font-semibold text-ink dark:text-slate-100">{modelProviderLabel(job.provider)} / {job.baseModel}</p><p className="mt-1 text-xs text-ink/55 dark:text-slate-400">Status: {job.status}</p>{job.metadata?.adapter ? <p className="mt-2 text-xs leading-5 text-ink/58 dark:text-slate-400">Adapter: {String(job.metadata.adapter)}</p> : null}</div>)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
