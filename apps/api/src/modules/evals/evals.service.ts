import type {
  CreateEvalCaseInput,
  CreateEvalRunInput,
  EvalCase,
  EvalRun,
  ChatMessage,
  ProviderKey,
  TrainingMessage,
  UpdateEvalCaseInput,
} from '@chatbot-ai/shared';
import type {
  EvalCase as PrismaEvalCase,
  EvalRun as PrismaEvalRun,
  EvalRunResult as PrismaEvalRunResult,
} from '@prisma/client';

import { ModelGatewayService } from '../../integrations/ai/model-gateway.service';
import type { AIConversationMessage } from '../../integrations/ai/ai.types';
import { InternalL3TutorModelService } from '../../integrations/ai/internal-l3-tutor-model.service';
import { AppError } from '../../utils/errors';
import { ModelRegistryService } from '../model-registry/model-registry.service';
import { ProvidersService } from '../providers/providers.service';
import { EvalsRepository } from './evals.repository';

const toIso = (value: Date) => value.toISOString();

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const average = (scores: number[]) =>
  scores.length === 0
    ? 0
    : Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2));

const mapEvalCase = (item: PrismaEvalCase): EvalCase => ({
  id: item.id,
  name: item.name,
  description: item.description ?? null,
  category: item.category,
  inputMessages: item.inputMessages as unknown as TrainingMessage[],
  idealResponse: item.idealResponse ?? null,
  scoringNotes: item.scoringNotes ?? null,
  createdAt: toIso(item.createdAt),
  updatedAt: toIso(item.updatedAt),
});

const mapEvalRun = (
  run: PrismaEvalRun & {
    results: Array<PrismaEvalRunResult & { evalCase: PrismaEvalCase }>;
  },
): EvalRun => ({
  id: run.id,
  provider: run.provider,
  model: run.model,
  modelVersionId: run.modelVersionId ?? null,
  averageScore: run.averageScore ?? null,
  notes: run.notes ?? null,
  createdAt: toIso(run.createdAt),
  updatedAt: toIso(run.updatedAt),
  results: run.results.map((result) => ({
    id: result.id,
    runId: result.runId,
    evalCaseId: result.evalCaseId,
    evalCaseName: result.evalCase.name,
    category: result.evalCase.category,
    output: result.output,
    score: result.score,
    notes: result.notes ?? null,
    createdAt: toIso(result.createdAt),
  })),
});

const buildEvalPrompt = (evalCase: EvalCase): {
  systemPrompt: string;
  messages: AIConversationMessage[];
} => {
  const systemParts = [
    'You are participating in a benchmark for a Vietnamese study assistant. Answer naturally and helpfully.',
    ...evalCase.inputMessages
      .filter((message) => message.role === 'system')
      .map((message) => message.content),
  ];
  const messages = evalCase.inputMessages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    })) satisfies AIConversationMessage[];

  return {
    systemPrompt: systemParts.join('\n\n').trim(),
    messages:
      messages.length > 0
        ? messages
        : [
            {
              role: 'user',
              content: `${evalCase.name}\n\n${evalCase.description ?? 'Provide the best response for this evaluation case.'}`,
            },
          ],
  };
};

const scoreEvalOutput = (evalCase: EvalCase, output: string) => {
  const outputTokens = new Set(tokenize(output));
  const idealTokens = evalCase.idealResponse ? Array.from(new Set(tokenize(evalCase.idealResponse))) : [];
  const overlap =
    idealTokens.length === 0
      ? outputTokens.size > 0
        ? 0.65
        : 0
      : idealTokens.filter((token) => outputTokens.has(token)).length / idealTokens.length;
  const structureBonus =
    evalCase.category === 'generate_quiz'
      ? /(\?|A\.|B\.|C\.|D\.)/.test(output)
        ? 0.15
        : 0
      : evalCase.category === 'generate_flashcards'
        ? /(^[-*•]|\n[-*•]|\bterm\b|\bdefinition\b|\bq:\b|\ba:\b)/im.test(output)
          ? 0.12
          : 0
      : evalCase.category === 'summarize_lesson'
        ? /(^[-*•]|\n[-*•]|\n\d+\.)/m.test(output)
          ? 0.1
          : 0
        : evalCase.category === 'study_plan'
          ? /(\bngay\b|\btuan\b|day\s*\d+|week\s*\d+|^\d+\.)/im.test(output)
            ? 0.12
            : 0
          : evalCase.category === 'compare_concepts'
            ? /(giống|khác|so sánh|similar|different|whereas|while)/i.test(output)
              ? 0.08
              : 0
            : evalCase.category === 'give_example'
              ? /(ví dụ|example|for instance|class|public)/i.test(output)
                ? 0.08
                : 0
              : evalCase.category === 'correct_student_answer' || evalCase.category === 'grade_answer'
                ? /(đúng|sai|cần sửa|correct|incorrect|revise)/i.test(output)
                  ? 0.08
                  : 0
        : evalCase.category === 'source_grounded_answer'
          ? /(nguon|source|tai lieu|trich)/i.test(output)
            ? 0.08
            : 0
          : 0;
  const lengthFactor = Math.min(output.trim().length / 240, 1);
  const score = Number(Math.min(1, overlap * 0.7 + structureBonus + lengthFactor * 0.2).toFixed(2));

  return {
    score,
    notes:
      idealTokens.length > 0
        ? `Keyword overlap: ${Math.round(overlap * 100)}%. Structure bonus: ${structureBonus.toFixed(2)}.`
        : `No reference answer provided. Length factor: ${lengthFactor.toFixed(2)}.`,
  };
};

const resolveRuntimeProvider = (provider: string): ProviderKey => {
  switch (provider) {
    case 'internal_l3_tutor':
      return 'internal_l3_tutor';
    case 'local_lora':
      return 'local_lora';
    case 'gemini':
      return 'GEMINI';
    case 'openai':
    case 'fine_tuned_openai':
      return 'OPENAI';
    default:
      throw new AppError(
        400,
        'EVAL_PROVIDER_UNSUPPORTED',
        'The selected model version cannot be benchmarked with the current runtime adapters.',
      );
  }
};

const inferEvalLanguage = (evalCase: EvalCase) => {
  const combined = [
    evalCase.name,
    evalCase.description ?? '',
    evalCase.idealResponse ?? '',
    ...evalCase.inputMessages.map((message) => message.content),
  ].join('\n');

  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    combined,
  )
    ? 'vi'
    : 'en';
};

const toEvalChatMessages = (evalCase: EvalCase): ChatMessage[] => {
  const now = new Date().toISOString();
  const messages = evalCase.inputMessages
    .filter((message) => message.role !== 'system')
    .map((message, index) => ({
      id: `eval-message-${evalCase.id}-${index}`,
      sessionId: `eval-session-${evalCase.id}`,
      clientMessageId: `eval-client-${evalCase.id}-${index}`,
      parentClientMessageId: null,
      senderType: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
      status: 'sent',
      provider: null,
      model: null,
      providerRequestId: null,
      responseFinishReason: null,
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      confidenceScore: null,
      confidenceLevel: null,
      subjectLabel: null,
      topicLabel: null,
      levelLabel: null,
      fallbackUsed: false,
      retrievalSnapshot: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
    })) satisfies ChatMessage[];

  if (messages.some((message) => message.senderType === 'user')) {
    return messages;
  }

  return [
    {
      id: `eval-message-${evalCase.id}-user`,
      sessionId: `eval-session-${evalCase.id}`,
      clientMessageId: `eval-client-${evalCase.id}-user`,
      parentClientMessageId: null,
      senderType: 'user',
      content: `${evalCase.name}\n\n${evalCase.description ?? 'Provide the best response for this evaluation case.'}`,
      status: 'sent',
      provider: null,
      model: null,
      providerRequestId: null,
      responseFinishReason: null,
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      confidenceScore: null,
      confidenceLevel: null,
      subjectLabel: null,
      topicLabel: null,
      levelLabel: null,
      fallbackUsed: false,
      retrievalSnapshot: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export class EvalsService {
  constructor(
    private readonly repository: EvalsRepository,
    private readonly providersService: ProvidersService,
    private readonly modelRegistryService: ModelRegistryService,
    private readonly modelGatewayService: ModelGatewayService,
    private readonly internalL3TutorModelService?: InternalL3TutorModelService,
  ) {}

  async listCases(): Promise<EvalCase[]> {
    const items = await this.repository.listCases();
    return items.map(mapEvalCase);
  }

  async createCase(input: CreateEvalCaseInput): Promise<EvalCase> {
    const created = await this.repository.createCase({
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      category: input.category,
      inputMessages: input.inputMessages,
      idealResponse: input.idealResponse?.trim() ?? null,
      scoringNotes: input.scoringNotes?.trim() ?? null,
    });

    return mapEvalCase(created);
  }

  async updateCase(id: string, input: UpdateEvalCaseInput): Promise<EvalCase> {
    const existing = await this.repository.findCaseById(id);
    if (!existing) {
      throw new AppError(404, 'EVAL_CASE_NOT_FOUND', 'Evaluation case not found.');
    }

    const updated = await this.repository.updateCase(id, {
      name: input.name?.trim(),
      description: input.description === undefined ? undefined : input.description?.trim() ?? null,
      category: input.category,
      inputMessages: input.inputMessages,
      idealResponse: input.idealResponse === undefined ? undefined : input.idealResponse?.trim() ?? null,
      scoringNotes: input.scoringNotes === undefined ? undefined : input.scoringNotes?.trim() ?? null,
    });

    return mapEvalCase(updated);
  }

  async deleteCase(id: string) {
    const existing = await this.repository.findCaseById(id);
    if (!existing) {
      throw new AppError(404, 'EVAL_CASE_NOT_FOUND', 'Evaluation case not found.');
    }

    await this.repository.deleteCase(id);
  }

  async listRuns(): Promise<EvalRun[]> {
    const runs = await this.repository.listRuns();
    return runs.map(mapEvalRun);
  }

  async createRun(input: CreateEvalRunInput): Promise<EvalRun> {
    const evalCases = (await this.repository.findCasesByIds(input.evalCaseIds)).map(mapEvalCase);
    if (evalCases.length === 0) {
      throw new AppError(400, 'EVAL_CASES_EMPTY', 'At least one evaluation case is required to start a run.');
    }

    let provider: ProviderKey;
    let model: string;
    let modelVersionId: string | null = null;

    if (input.modelVersionId) {
      const version = await this.modelRegistryService.getVersionById(input.modelVersionId);
      provider = resolveRuntimeProvider(version.provider);
      model = version.fineTunedModel ?? version.baseModel;
      modelVersionId = version.id;
    } else if (input.provider === 'internal_l3_tutor' || input.provider === 'local_lora') {
      const activeVersion = (await this.modelRegistryService.listActiveVersions()).find(
        (version) => version.provider === input.provider,
      );
      if (!activeVersion && !input.model) {
        throw new AppError(
          400,
          'EVAL_MODEL_TARGET_REQUIRED',
          'A ready active model version or explicit model name is required for this benchmark target.',
        );
      }

      provider = input.provider;
      model = input.model ?? activeVersion?.fineTunedModel ?? activeVersion?.baseModel ?? '';
      modelVersionId = activeVersion?.id ?? null;
    } else {
      const providerState = await this.providersService.listProviders();
      provider = input.provider ?? providerState.defaultProvider;
      const descriptor = providerState.providers.find((item) => item.key === provider);
      if (!descriptor) {
        throw new AppError(503, 'EVAL_PROVIDER_UNAVAILABLE', 'Requested provider is not available.');
      }
      model = input.model ?? descriptor.model;
      modelVersionId = descriptor.modelVersionId ?? null;
    }

    const results = await Promise.all(evalCases.map(async (evalCase) => {
      try {
        let output: string;
        let latencyMs = 0;

        if (provider === 'internal_l3_tutor') {
          if (!this.internalL3TutorModelService) {
            throw new AppError(
              503,
              'EVAL_PROVIDER_UNSUPPORTED',
              'Internal L3 Tutor benchmarking is not configured on this server.',
            );
          }

          const response = await this.internalL3TutorModelService.generate({
            userId: `eval-user-${evalCase.id}`,
            sessionId: `eval-session-${evalCase.id}`,
            aiRuntimeMode: 'learning_engine_l3',
            language: inferEvalLanguage(evalCase),
            contextSummary: null,
            messages: toEvalChatMessages(evalCase),
            subjectHint: null,
            retrievalSnapshot: {
              queryExpansion: [],
              materials: [],
            },
            modelVersionId,
          });
          output = response.contentMarkdown;
          latencyMs = response.latencyMs ?? 0;
        } else {
          const prompt = buildEvalPrompt(evalCase);
          const response = await this.modelGatewayService.generateSingle({
            provider,
            model,
            modelVersionId,
            systemPrompt: prompt.systemPrompt,
            messages: prompt.messages,
            temperature: 0.2,
          });
          output = response.text;
          latencyMs = response.latencyMs ?? 0;
        }

        const scoring = scoreEvalOutput(evalCase, output);

        return {
          evalCaseId: evalCase.id,
          output,
          score: scoring.score,
          notes: `${scoring.notes} Latency: ${latencyMs}ms.`,
          latencyMs,
          failed: false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Benchmark execution failed.';
        return {
          evalCaseId: evalCase.id,
          output: '',
          score: 0,
          notes: message,
          latencyMs: 0,
          failed: true,
        };
      }
    }));

    const completedLatencies = results
      .map((result) => result.latencyMs)
      .filter((value) => typeof value === 'number' && value > 0);
    const averageLatencyMs =
      completedLatencies.length === 0
        ? 0
        : Math.round(
            completedLatencies.reduce((total, latency) => total + latency, 0) / completedLatencies.length,
          );
    const timeoutCount = results.filter((result) => /LOCAL_LORA_TIMEOUT/i.test(result.notes ?? '')).length;
    const errorCount = results.filter((result) => result.failed).length;
    const fallbackCount = 0;
    const benchmarkSummary = [
      `avgLatencyMs=${averageLatencyMs}`,
      `timeoutCount=${timeoutCount}`,
      `fallbackCount=${fallbackCount}`,
      `errorCount=${errorCount}`,
    ].join('; ');

    const run = await this.repository.createRun({
      provider,
      model,
      modelVersionId,
      averageScore: average(results.map((result) => result.score)),
      notes: [input.notes?.trim(), benchmarkSummary].filter(Boolean).join(' | ') || null,
      results,
    });

    return mapEvalRun(run);
  }
}
