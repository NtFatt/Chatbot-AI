import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { AppError } from '../src/utils/errors';
import { ModelGatewayService } from '../src/integrations/ai/model-gateway.service';

const createProvidersService = () => ({
  listProviders: vi.fn(),
});

const createProviderHealthService = () => ({
  canAttempt: vi.fn(),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn(),
});

const createUsageService = () => ({
  recordUsage: vi.fn().mockResolvedValue(undefined),
  recordIncident: vi.fn().mockResolvedValue(undefined),
});

describe('ModelGatewayService', () => {
  const originalLocalLoraEnabled = env.LOCAL_LORA_ENABLED;
  const originalLocalLoraModel = env.LOCAL_LORA_MODEL;
  const originalLocalLoraTimeoutMs = env.LOCAL_LORA_TIMEOUT_MS;

  beforeEach(() => {
    env.LOCAL_LORA_ENABLED = true;
    env.LOCAL_LORA_MODEL = 'local-lora-tutor-v1';
    env.LOCAL_LORA_TIMEOUT_MS = 15_000;
  });

  afterEach(() => {
    env.LOCAL_LORA_ENABLED = originalLocalLoraEnabled;
    env.LOCAL_LORA_MODEL = originalLocalLoraModel;
    env.LOCAL_LORA_TIMEOUT_MS = originalLocalLoraTimeoutMs;
  });

  it('routes local_lora through the gateway and preserves provider metadata', async () => {
    const providersService = createProvidersService();
    const providerHealthService = createProviderHealthService();
    const usageService = createUsageService();
    const localLoraClient = {
      generate: vi.fn().mockResolvedValue({
        text: 'Local LoRA answer',
        finishReason: 'stop',
        latencyMs: 220,
        providerRequestId: 'local-req-1',
        usage: {
          inputTokens: 16,
          outputTokens: 22,
          totalTokens: 38,
        },
      }),
    };

    providerHealthService.canAttempt.mockReturnValue({ allowed: true, cooldownRemainingMs: 0 });

    const gateway = new ModelGatewayService(
      providersService as never,
      { local_lora: localLoraClient } as never,
      providerHealthService as never,
      usageService as never,
    );

    const response = await gateway.generateSingle({
      provider: 'local_lora',
      modelVersionId: 'model-version-local',
      userId: 'user-1',
      sessionId: 'session-1',
      messageId: 'message-1',
      systemPrompt: 'Tutor system prompt',
      messages: [{ role: 'user', content: 'Giải thích OOP' }],
    });

    expect(localLoraClient.generate).toHaveBeenCalledWith({
      provider: 'local_lora',
      model: 'local-lora-tutor-v1',
      systemPrompt: 'Tutor system prompt',
      messages: [{ role: 'user', content: 'Giải thích OOP' }],
      timeoutMs: 15_000,
      temperature: undefined,
    });
    expect(providerHealthService.recordSuccess).toHaveBeenCalledWith('local_lora');
    expect(providersService.listProviders).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      provider: 'local_lora',
      model: 'local-lora-tutor-v1',
      modelVersionId: 'model-version-local',
      providerRequestId: 'local-req-1',
      text: 'Local LoRA answer',
      finishReason: 'stop',
    });
  });

  it('turns local_lora provider failures into MODEL_GATEWAY_GENERATION_FAILED', async () => {
    const providersService = createProvidersService();
    const providerHealthService = createProviderHealthService();
    const usageService = createUsageService();
    const localLoraClient = {
      generate: vi.fn().mockRejectedValue(new Error('ETIMEDOUT local lora server')),
    };

    providerHealthService.canAttempt.mockReturnValue({ allowed: true, cooldownRemainingMs: 0 });

    const gateway = new ModelGatewayService(
      providersService as never,
      { local_lora: localLoraClient } as never,
      providerHealthService as never,
      usageService as never,
    );

    let error: unknown;
    try {
      await gateway.generateSingle({
        provider: 'local_lora',
        modelVersionId: 'model-version-local',
        userId: 'user-1',
        sessionId: 'session-1',
        messageId: 'message-1',
        systemPrompt: 'Tutor system prompt',
        messages: [{ role: 'user', content: 'Giải thích OOP' }],
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 502,
      code: 'MODEL_GATEWAY_GENERATION_FAILED',
      message: 'ETIMEDOUT local lora server',
    });
    expect(providerHealthService.recordFailure).toHaveBeenCalledWith({
      provider: 'local_lora',
      code: 'ETIMEDOUT_LOCAL_LORA_SERVER',
      message: 'ETIMEDOUT local lora server',
      retryable: true,
    });
    expect(usageService.recordIncident).toHaveBeenCalledTimes(1);
    expect(usageService.recordUsage).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      messageId: 'message-1',
      provider: 'local_lora',
      model: 'local-lora-tutor-v1',
      latencyMs: 0,
      success: false,
      fallbackUsed: false,
    });
  });
});
