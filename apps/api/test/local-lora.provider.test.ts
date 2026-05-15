import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { LocalLoraProvider } from '../src/integrations/ai/local-lora.provider';

const createRequest = (overrides: Partial<Parameters<LocalLoraProvider['generate']>[0]> = {}) => ({
  provider: 'local_lora' as const,
  model: 'local-lora-tutor-v1',
  systemPrompt: 'Be a helpful tutor.',
  messages: [{ role: 'user' as const, content: 'Giải thích OOP trong Java' }],
  timeoutMs: 25,
  temperature: 0.2,
  ...overrides,
});

describe('LocalLoraProvider', () => {
  const originalEnabled = env.LOCAL_LORA_ENABLED;
  const originalBaseUrl = env.LOCAL_LORA_BASE_URL;
  const originalModel = env.LOCAL_LORA_MODEL;
  const originalTimeout = env.LOCAL_LORA_TIMEOUT_MS;

  beforeEach(() => {
    env.LOCAL_LORA_ENABLED = true;
    env.LOCAL_LORA_BASE_URL = 'http://127.0.0.1:8008';
    env.LOCAL_LORA_MODEL = 'local-lora-tutor-v1';
    env.LOCAL_LORA_TIMEOUT_MS = 30_000;
  });

  afterEach(() => {
    env.LOCAL_LORA_ENABLED = originalEnabled;
    env.LOCAL_LORA_BASE_URL = originalBaseUrl;
    env.LOCAL_LORA_MODEL = originalModel;
    env.LOCAL_LORA_TIMEOUT_MS = originalTimeout;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('maps a successful local server response into the shared AI provider contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'OOP giúp tổ chức code quanh class và object.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 18,
          total_tokens: 30,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new LocalLoraProvider();
    const response = await provider.generate(createRequest());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8008/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'local-lora-tutor-v1',
      messages: [
        { role: 'system', content: 'Be a helpful tutor.' },
        { role: 'user', content: 'Giải thích OOP trong Java' },
      ],
      temperature: 0.2,
    });
    expect(JSON.stringify(init)).not.toContain('Authorization');
    expect(response).toMatchObject({
      text: 'OOP giúp tổ chức code quanh class và object.',
      finishReason: 'stop',
      usage: {
        inputTokens: 12,
        outputTokens: 18,
        totalTokens: 30,
      },
    });
  });

  it('classifies offline server failures without leaking prompt content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET local server offline')));

    const provider = new LocalLoraProvider();
    const request = createRequest();

    await expect(provider.generate(request)).rejects.toMatchObject({
      provider: 'local_lora',
      message: '[local_lora] ECONNRESET local server offline',
      descriptor: {
        retryable: true,
      },
    });
    try {
      await provider.generate(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain('Giải thích OOP trong Java');
    }
  });

  it('classifies request timeout as a retryable provider error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
            });
          }),
      ),
    );

    const provider = new LocalLoraProvider();
    const request = createRequest({ timeoutMs: 15 });
    const errorPromise = provider.generate(request).catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(20);

    await expect(errorPromise).resolves.toMatchObject({
      provider: 'local_lora',
      descriptor: {
        retryable: true,
      },
      message: '[local_lora] LOCAL_LORA_TIMEOUT after 15ms',
    });
  });

  it('rejects malformed local responses safely', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: {} }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new LocalLoraProvider();

    await expect(provider.generate(createRequest())).rejects.toMatchObject({
      provider: 'local_lora',
      descriptor: {
        retryable: false,
      },
      message: '[local_lora] Local inference server returned empty content',
    });
  });

  it('fails fast when the local provider is disabled', async () => {
    env.LOCAL_LORA_ENABLED = false;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new LocalLoraProvider();

    await expect(provider.generate(createRequest())).rejects.toMatchObject({
      provider: 'local_lora',
      descriptor: {
        retryable: false,
      },
      message: '[local_lora] LOCAL_LORA_ENABLED is false',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
