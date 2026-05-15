import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiRuntimeMode, AIChatResult, ModelVersion } from '@chatbot-ai/shared';

import { env } from '../src/config/env';
import { AiRuntimeRouterService } from '../src/integrations/ai/ai-runtime-router.service';
import type { AIOrchestratorService } from '../src/integrations/ai/ai-orchestrator.service';
import type { InternalL3TutorModelService } from '../src/integrations/ai/internal-l3-tutor-model.service';
import type { ModelGatewayService } from '../src/integrations/ai/model-gateway.service';
import type { ModelRegistryService } from '../src/modules/model-registry/model-registry.service';

const createMockOrchestrator = () => ({
  generate: vi.fn(),
});

const createMockModelGateway = () => ({
  generateSingle: vi.fn(),
});

const createMockModelRegistry = () => ({
  getActiveLearningEngineModel: vi.fn(),
});

const createMockInternalTutor = () => ({
  generate: vi.fn(),
});

const createBaseInput = (overrides: Partial<Parameters<AiRuntimeRouterService['generate']>[0]> = {}) => ({
  userId: 'user-1',
  sessionId: 'session-1',
  aiRuntimeMode: 'external_api' as AiRuntimeMode,
  sessionProvider: 'GEMINI' as const,
  language: 'vi' as const,
  contextSummary: null,
  messages: [],
  retrievalSnapshot: {
    queryExpansion: [],
    materials: [],
  },
  ...overrides,
});

const createMockAiResult = (overrides: Partial<AIChatResult> = {}): AIChatResult => ({
  provider: 'internal_l3_tutor',
  model: 'internal-l3-tutor-v1',
  modelVersionId: null,
  aiRuntimeMode: 'learning_engine_l3',
  learningEngineUsed: true,
  externalFallbackUsed: false,
  contentMarkdown: 'Hello from internal L3',
  finishReason: 'stop',
  usage: undefined,
  latencyMs: 24,
  fallbackUsed: false,
  fallbackInfo: null,
  warnings: [],
  retrievalSnapshot: {
    queryExpansion: [],
    materials: [],
    aiRuntimeMode: 'learning_engine_l3',
    executionProvider: 'internal_l3_tutor',
    executionModel: 'internal-l3-tutor-v1',
    learningEngineUsed: true,
    externalFallbackUsed: false,
  },
  ...overrides,
});

const createActiveModel = (overrides: Partial<ModelVersion> = {}): ModelVersion => ({
  id: 'mv-1',
  name: 'Internal L3 Tutor',
  provider: 'internal_l3_tutor',
  baseModel: 'internal-l3-tutor-v1',
  fineTunedModel: null,
  status: 'ready',
  isActive: true,
  metadata: { runtimeMode: 'learning_engine_l3' },
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  ...overrides,
});

describe('AiRuntimeRouterService', () => {
  let orchestrator: ReturnType<typeof createMockOrchestrator>;
  let modelGateway: ReturnType<typeof createMockModelGateway>;
  let modelRegistry: ReturnType<typeof createMockModelRegistry>;
  let internalTutor: ReturnType<typeof createMockInternalTutor>;
  let router: AiRuntimeRouterService;
  const originalExternalFallbackFlag = env.L3_ALLOW_EXTERNAL_FALLBACK;

  beforeEach(() => {
    env.L3_ALLOW_EXTERNAL_FALLBACK = false;
    orchestrator = createMockOrchestrator();
    modelGateway = createMockModelGateway();
    modelRegistry = createMockModelRegistry();
    internalTutor = createMockInternalTutor();
    router = new AiRuntimeRouterService(
      orchestrator as unknown as AIOrchestratorService,
      modelGateway as unknown as ModelGatewayService,
      modelRegistry as unknown as ModelRegistryService,
      internalTutor as unknown as InternalL3TutorModelService,
    );
  });

  afterEach(() => {
    env.L3_ALLOW_EXTERNAL_FALLBACK = originalExternalFallbackFlag;
  });

  it('delegates external_api mode directly to the orchestrator', async () => {
    const expected = createMockAiResult({
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      aiRuntimeMode: undefined,
      learningEngineUsed: undefined,
      externalFallbackUsed: undefined,
    });
    orchestrator.generate.mockResolvedValueOnce(expected);

    const input = createBaseInput({ aiRuntimeMode: 'external_api' });
    const result = await router.generate(input);

    expect(orchestrator.generate).toHaveBeenCalledWith(input);
    expect(modelRegistry.getActiveLearningEngineModel).not.toHaveBeenCalled();
    expect(result.provider).toBe('GEMINI');
  });

  it('uses internal_l3_tutor when no active L3 model override exists', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(null);
    internalTutor.generate.mockResolvedValueOnce(createMockAiResult());

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelRegistry.getActiveLearningEngineModel).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).toHaveBeenCalledTimes(1);
    expect(modelGateway.generateSingle).not.toHaveBeenCalled();
    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result.provider).toBe('internal_l3_tutor');
    expect(result.model).toBe('internal-l3-tutor-v1');
  });

  it('uses the model gateway first when an active ready external L3 model exists', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(
      createActiveModel({
        id: 'mv-openai',
        name: 'L3 OpenAI Override',
        provider: 'fine_tuned_openai',
        baseModel: 'gpt-5.4-mini',
        fineTunedModel: 'ft:gpt-5.4-mini:l3',
      }),
    );
    modelGateway.generateSingle.mockResolvedValueOnce({
      provider: 'OPENAI',
      model: 'ft:gpt-5.4-mini:l3',
      modelVersionId: 'mv-openai',
      providerRequestId: 'req-gateway-1',
      text: 'Gateway response',
      finishReason: 'stop',
      latencyMs: 180,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    });

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelGateway.generateSingle).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).not.toHaveBeenCalled();
    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result.provider).toBe('OPENAI');
    expect(result.modelVersionId).toBe('mv-openai');
  });

  it('routes active ready local_lora models through the gateway before falling back to the internal tutor', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(
      createActiveModel({
        id: 'mv-local-lora',
        name: 'Local LoRA Tutor',
        provider: 'local_lora',
        baseModel: 'local-lora-tutor-v1',
      }),
    );
    modelGateway.generateSingle.mockResolvedValueOnce({
      provider: 'local_lora',
      model: 'local-lora-tutor-v1',
      modelVersionId: 'mv-local-lora',
      providerRequestId: 'req-local-lora-1',
      text: 'Local LoRA response',
      finishReason: 'stop',
      latencyMs: 140,
      usage: { inputTokens: 9, outputTokens: 14, totalTokens: 23 },
    });

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelGateway.generateSingle).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).not.toHaveBeenCalled();
    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      provider: 'local_lora',
      model: 'local-lora-tutor-v1',
      modelVersionId: 'mv-local-lora',
      aiRuntimeMode: 'learning_engine_l3',
      learningEngineUsed: true,
      externalFallbackUsed: false,
      fallbackUsed: false,
    });
  });

  it('falls back to internal_l3_tutor when the gateway path fails', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(
      createActiveModel({
        id: 'mv-openai',
        provider: 'fine_tuned_openai',
        baseModel: 'gpt-5.4-mini',
      }),
    );
    modelGateway.generateSingle.mockRejectedValueOnce(new Error('MODEL_GATEWAY_DOWN'));
    internalTutor.generate.mockResolvedValueOnce(createMockAiResult());

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelGateway.generateSingle).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).toHaveBeenCalledTimes(1);
    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result.provider).toBe('internal_l3_tutor');
  });

  it('falls back from local_lora to internal_l3_tutor without touching external providers by default', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(
      createActiveModel({
        id: 'mv-local-lora',
        provider: 'local_lora',
        baseModel: 'local-lora-tutor-v1',
      }),
    );
    modelGateway.generateSingle.mockRejectedValueOnce(new Error('LOCAL_LORA_OFFLINE'));
    internalTutor.generate.mockResolvedValueOnce(createMockAiResult());

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelGateway.generateSingle).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).toHaveBeenCalledTimes(1);
    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result.provider).toBe('internal_l3_tutor');
    expect(result.externalFallbackUsed).toBe(false);
  });

  it('uses the safe local fallback when the internal tutor fails and external fallback is disabled', async () => {
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(createActiveModel());
    internalTutor.generate.mockRejectedValueOnce(new Error('INTERNAL_L3_FAILURE'));

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(orchestrator.generate).not.toHaveBeenCalled();
    expect(result.provider).toBe('internal_l3_tutor');
    expect(result.fallbackUsed).toBe(true);
    expect(result.model).toBe('local-study-fallback');
  });

  it('allows a local_lora route to reach external fallback only when the env flag is enabled', async () => {
    env.L3_ALLOW_EXTERNAL_FALLBACK = true;
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(
      createActiveModel({
        id: 'mv-local-lora',
        provider: 'local_lora',
        baseModel: 'local-lora-tutor-v1',
      }),
    );
    modelGateway.generateSingle.mockRejectedValueOnce(new Error('LOCAL_LORA_OFFLINE'));
    internalTutor.generate.mockRejectedValueOnce(new Error('INTERNAL_L3_FAILURE'));
    orchestrator.generate.mockResolvedValueOnce(
      createMockAiResult({
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        externalFallbackUsed: false,
      }),
    );

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(modelGateway.generateSingle).toHaveBeenCalledTimes(1);
    expect(internalTutor.generate).toHaveBeenCalledTimes(1);
    expect(orchestrator.generate).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('GEMINI');
    expect(result.externalFallbackUsed).toBe(true);
  });

  it('allows explicit external fallback only when L3_ALLOW_EXTERNAL_FALLBACK=true', async () => {
    env.L3_ALLOW_EXTERNAL_FALLBACK = true;
    modelRegistry.getActiveLearningEngineModel.mockResolvedValueOnce(createActiveModel());
    internalTutor.generate.mockRejectedValueOnce(new Error('INTERNAL_L3_FAILURE'));
    orchestrator.generate.mockResolvedValueOnce(
      createMockAiResult({
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        externalFallbackUsed: false,
      }),
    );

    const result = await router.generate(createBaseInput({ aiRuntimeMode: 'learning_engine_l3' }));

    expect(orchestrator.generate).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('GEMINI');
    expect(result.aiRuntimeMode).toBe('learning_engine_l3');
    expect(result.learningEngineUsed).toBe(true);
    expect(result.externalFallbackUsed).toBe(true);
  });
});
