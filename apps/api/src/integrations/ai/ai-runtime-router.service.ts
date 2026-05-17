import type {
  AIChatResult,
  AiRuntimeMode,
  AppLanguage,
  ChatMessage,
  ModelVersion,
  ProviderKey,
  RetrievalSnapshot,
} from '@chatbot-ai/shared';
import { buildStudySystemPrompt } from '@chatbot-ai/shared';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { ModelRegistryService } from '../../modules/model-registry/model-registry.service';
import { truncateText } from '../../utils/text';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { InternalL3TutorModelService } from './internal-l3-tutor-model.service';
import { detectLocalLoraTaskCategory } from './local-lora.provider';
import { buildLocalStudyFallback } from './local-study-fallback';
import { ModelGatewayService } from './model-gateway.service';
import { sanitizeAIResponse, isRenderableAIResponse } from './response-sanitizer';
import type { AIConversationMessage } from './ai.types';

export interface RuntimeGenerateInput {
  userId: string;
  sessionId: string;
  aiRuntimeMode: AiRuntimeMode;
  requestedProvider?: ProviderKey;
  sessionProvider: ProviderKey;
  language: AppLanguage;
  contextSummary?: string | null;
  messages: ChatMessage[];
  subjectHint?: string | null;
  retrievalPromptContext?: string | null;
  retrievalSnapshot?: RetrievalSnapshot | null;
  onChunk?: (chunk: string, provider: ProviderKey, model: string) => void;
}

const mapModelVersionProviderToRuntimeProvider = (
  provider: ModelVersion['provider'],
): ProviderKey | null => {
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
      return null;
  }
};

const inferLocalTaskCategoryFromMessages = (messages: AIConversationMessage[]) => {
  const latestUserPrompt = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  return detectLocalLoraTaskCategory(latestUserPrompt);
};

export class AiRuntimeRouterService {
  constructor(
    private readonly aiOrchestrator: AIOrchestratorService,
    private readonly modelGateway: ModelGatewayService,
    private readonly modelRegistryService: ModelRegistryService,
    private readonly internalL3Tutor: InternalL3TutorModelService,
  ) {}

  async generate(input: RuntimeGenerateInput): Promise<AIChatResult> {
    if (input.aiRuntimeMode === 'learning_engine_l3') {
      return this.generateViaLearningEngine(input);
    }

    return this.aiOrchestrator.generate(input);
  }

  private compactMessages(input: {
    contextSummary?: string | null;
    messages: ChatMessage[];
    maxMessages?: number;
    maxPromptChars?: number;
    contextSummaryMaxChars?: number;
    messageMaxChars?: number;
  }): AIConversationMessage[] {
    const selected = input.messages
      .filter((message) => message.senderType !== 'system' && message.status !== 'failed')
      .slice(-(input.maxMessages ?? env.AI_MAX_CONTEXT_MESSAGES))
      .map((message) => ({
        role: message.senderType === 'assistant' ? 'assistant' : 'user',
        content: truncateText(message.content, input.messageMaxChars ?? message.content.length),
      })) satisfies AIConversationMessage[];

    if (input.contextSummary) {
      selected.unshift({
        role: 'assistant',
        content: `Conversation summary:\n${truncateText(input.contextSummary, input.contextSummaryMaxChars ?? 500)}`,
      });
    }

    while (
      selected.reduce((total, message) => total + message.content.length, 0) >
        (input.maxPromptChars ?? env.AI_MAX_PROMPT_CHARS) &&
      selected.length > 4
    ) {
      selected.shift();
    }

    return selected;
  }

  private async callViaGateway(
    input: RuntimeGenerateInput,
    activeModel: ModelVersion,
  ): Promise<AIChatResult> {
    const runtimeProvider = mapModelVersionProviderToRuntimeProvider(activeModel.provider);
    if (!runtimeProvider || runtimeProvider === 'internal_l3_tutor') {
      throw new Error('MODEL_VERSION_RUNTIME_UNSUPPORTED');
    }

    if (runtimeProvider === 'local_lora') {
      // Direct call to gateway without formatting as external API
      // ModelGatewayService will use local_lora client which implements generate()
    }

    const compactedMessages =
      runtimeProvider === 'local_lora'
        ? this.compactMessages({
            contextSummary: input.contextSummary,
            messages: input.messages,
            maxMessages: 3,
            maxPromptChars: 1_800,
            contextSummaryMaxChars: 180,
            messageMaxChars: 420,
          })
        : this.compactMessages({
            contextSummary: input.contextSummary,
            messages: input.messages,
          });

    const response = await this.modelGateway.generateSingle({
      provider: runtimeProvider,
      model: activeModel.fineTunedModel ?? activeModel.baseModel,
      modelVersionId: activeModel.id,
      userId: input.userId,
      sessionId: input.sessionId,
      systemPrompt: buildStudySystemPrompt({
        language: input.language,
        subjectHint: input.subjectHint ?? input.retrievalSnapshot?.inferredSubject ?? null,
        retrievalContext: input.retrievalPromptContext ?? null,
      }),
      messages: compactedMessages,
      taskCategory: runtimeProvider === 'local_lora' ? inferLocalTaskCategoryFromMessages(compactedMessages) : undefined,
    });

    const sanitized = sanitizeAIResponse(response.text);
    if (!isRenderableAIResponse(sanitized)) {
      throw new Error('EMPTY_L3_GATEWAY_RESPONSE');
    }

    return {
      provider: response.provider,
      model: response.model,
      modelVersionId: activeModel.id,
      aiRuntimeMode: 'learning_engine_l3',
      learningEngineUsed: true,
      externalFallbackUsed: false,
      providerRequestId: response.providerRequestId,
      contentMarkdown: sanitized,
      finishReason: response.finishReason,
      usage: response.usage,
      latencyMs: response.latencyMs,
      fallbackUsed: false,
      fallbackInfo: null,
      warnings: [],
      retrievalSnapshot: {
        ...(input.retrievalSnapshot ?? { queryExpansion: [], materials: [] }),
        aiRuntimeMode: 'learning_engine_l3',
        executionProvider: response.provider,
        executionModel: response.model,
        learningEngineUsed: true,
        externalFallbackUsed: false,
        modelVersionId: activeModel.id,
      },
    };
  }

  private async generateViaInternalTutor(
    input: RuntimeGenerateInput,
    activeModel?: ModelVersion | null,
  ) {
    return this.internalL3Tutor.generate({
      userId: input.userId,
      sessionId: input.sessionId,
      aiRuntimeMode: 'learning_engine_l3',
      language: input.language,
      contextSummary: input.contextSummary,
      messages: input.messages,
      subjectHint: input.subjectHint,
      retrievalSnapshot: input.retrievalSnapshot,
      modelVersionId:
        activeModel?.provider === 'internal_l3_tutor'
          ? activeModel.id
          : null,
    });
  }

  private buildInternalSafeFallback(
    input: RuntimeGenerateInput,
    reason: 'provider_unavailable' | 'internal_model_unavailable',
  ) {
    return buildLocalStudyFallback({
      provider: 'internal_l3_tutor',
      model: reason === 'internal_model_unavailable' ? 'local-study-fallback' : env.L3_INTERNAL_MODEL_NAME,
      language: input.language,
      messages: input.messages,
      requestedProvider: input.requestedProvider,
      reason,
      warnings: ['Internal L3 Tutor fell back to the safe local study path.'],
      fallbackInfo: null,
      retrievalSnapshot: input.retrievalSnapshot,
      aiRuntimeMode: 'learning_engine_l3',
      learningEngineUsed: true,
      externalFallbackUsed: false,
    });
  }

  private async generateViaLearningEngine(input: RuntimeGenerateInput): Promise<AIChatResult> {
    const activeModel = await this.modelRegistryService.getActiveLearningEngineModel();

    if (activeModel && activeModel.provider !== 'internal_l3_tutor') {
      try {
        return await this.callViaGateway(input, activeModel);
      } catch (error) {
        logger.warn(
          {
            err: error,
            modelVersionId: activeModel.id,
            provider: activeModel.provider,
          },
          'Learning Engine gateway path failed; continuing with Internal L3 Tutor',
        );
      }
    }

    try {
      return await this.generateViaInternalTutor(input, activeModel);
    } catch (error) {
      logger.warn(
        { err: error, allowExternalFallback: env.L3_ALLOW_EXTERNAL_FALLBACK },
        'Internal L3 Tutor failed',
      );
    }

    if (env.L3_ALLOW_EXTERNAL_FALLBACK) {
      try {
        const externalResult = await this.aiOrchestrator.generate(input);
        return {
          ...externalResult,
          aiRuntimeMode: 'learning_engine_l3',
          learningEngineUsed: true,
          externalFallbackUsed: true,
          retrievalSnapshot: {
            ...(externalResult.retrievalSnapshot ?? input.retrievalSnapshot ?? {
              queryExpansion: [],
              materials: [],
            }),
            aiRuntimeMode: 'learning_engine_l3',
            executionProvider: externalResult.provider,
            executionModel: externalResult.model,
            learningEngineUsed: true,
            externalFallbackUsed: true,
            modelVersionId: externalResult.modelVersionId ?? null,
          },
        };
      } catch (error) {
        logger.warn({ err: error }, 'External fallback for Internal L3 Tutor failed');
      }
    }

    return this.buildInternalSafeFallback(input, 'internal_model_unavailable');
  }
}
