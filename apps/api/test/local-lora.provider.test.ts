import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import {
  buildLocalLoraSystemPrompt,
  detectLocalLoraTaskCategory,
  LocalLoraProvider,
  trimMessagesForLocalLora,
} from '../src/integrations/ai/local-lora.provider';

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
  const originalMaxNewTokens = env.LOCAL_LORA_MAX_NEW_TOKENS;
  const originalTemperature = env.LOCAL_LORA_TEMPERATURE;
  const originalTopP = env.LOCAL_LORA_TOP_P;
  const originalContextMaxChars = env.LOCAL_LORA_CONTEXT_MAX_CHARS;

  beforeEach(() => {
    env.LOCAL_LORA_ENABLED = true;
    env.LOCAL_LORA_BASE_URL = 'http://127.0.0.1:8008';
    env.LOCAL_LORA_MODEL = 'local-lora-tutor-v1';
    env.LOCAL_LORA_TIMEOUT_MS = 30_000;
    env.LOCAL_LORA_MAX_NEW_TOKENS = 80;
    env.LOCAL_LORA_TEMPERATURE = 0.2;
    env.LOCAL_LORA_TOP_P = 0.9;
    env.LOCAL_LORA_CONTEXT_MAX_CHARS = 6000;
  });

  afterEach(() => {
    env.LOCAL_LORA_ENABLED = originalEnabled;
    env.LOCAL_LORA_BASE_URL = originalBaseUrl;
    env.LOCAL_LORA_MODEL = originalModel;
    env.LOCAL_LORA_TIMEOUT_MS = originalTimeout;
    env.LOCAL_LORA_MAX_NEW_TOKENS = originalMaxNewTokens;
    env.LOCAL_LORA_TEMPERATURE = originalTemperature;
    env.LOCAL_LORA_TOP_P = originalTopP;
    env.LOCAL_LORA_CONTEXT_MAX_CHARS = originalContextMaxChars;
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
    const response = await provider.generate(createRequest({ taskCategory: 'explain_concept' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const payload = JSON.parse(String(init?.body));

    expect(payload).toEqual(
      expect.objectContaining({
        model: 'local-lora-tutor-v1',
        temperature: 0.2,
        max_new_tokens: 80,
        top_p: 0.9,
      }),
    );
    expect(payload.messages[0]).toEqual(
      expect.objectContaining({
        role: 'system',
      }),
    );
    expect(payload.messages[0].content).toContain('gia su AI ngan gon');
    expect(payload.messages[0].content).toContain('4 bullet ngan');
    expect(payload.messages[0].content).not.toContain('OpenAI');
    expect(payload.messages[0].content).not.toContain('Gemini');
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

  it('builds a short local-specific prompt without external-provider wording', () => {
    const prompt = buildLocalLoraSystemPrompt({
      taskCategory: 'generate_quiz',
      latestUserMessage: 'Tạo 2 câu quiz trắc nghiệm ngắn về JOIN trong SQL.',
      systemPrompt: 'Be a helpful tutor.\nRETRIEVAL CONTEXT:\nJOIN links tables.',
    });

    expect(prompt).toContain('gia su AI ngan gon');
    expect(prompt).toContain('Tao dung 2 cau quiz');
    expect(prompt).toContain('JOIN links tables');
    expect(prompt).not.toContain('OpenAI');
    expect(prompt).not.toContain('Gemini');
    expect(prompt.length).toBeLessThan(900);
  });

  it('detects a known task category from the latest prompt', () => {
    expect(detectLocalLoraTaskCategory('Tạo 3 flashcard ngắn để học stack.')).toBe('generate_flashcards');
    expect(detectLocalLoraTaskCategory('Chỉ dựa vào đoạn sau để trả lời.')).toBe('source_grounded_answer');
  });

  it('trims oversized context before sending it to the local server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Đã nhận prompt đã cắt gọn.' }, finish_reason: 'stop' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new LocalLoraProvider();
    await provider.generate(
      createRequest({
        taskCategory: 'study_plan',
        systemPrompt: 'System '.repeat(80),
        messages: [
          { role: 'assistant', content: 'Conversation summary:\n' + 'Tóm tắt '.repeat(60) },
          { role: 'user', content: 'Nội dung rất dài '.repeat(120) },
        ],
        contextMaxChars: 240,
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const payload = JSON.parse(String(init?.body));
    const combinedLength = payload.messages.reduce(
      (total: number, message: { content: string }) => total + message.content.length,
      0,
    );

    expect(combinedLength).toBeLessThanOrEqual(240);
    expect(JSON.stringify(payload.messages)).toContain('...');
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

  it('uses env defaults when the caller does not pass generation controls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Short answer' }, finish_reason: 'stop' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new LocalLoraProvider();
    await provider.generate(createRequest({ temperature: undefined, topP: undefined, maxNewTokens: undefined }));

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({
        temperature: 0.2,
        max_new_tokens: 80,
        top_p: 0.9,
      }),
    );
  });

  it('prioritizes the latest user message when trimming local context', () => {
    const messages = trimMessagesForLocalLora(
      buildLocalLoraSystemPrompt({
        taskCategory: 'compare_concepts',
        latestUserMessage: 'So sánh GET và POST',
      }),
      [
        { role: 'assistant', content: 'Conversation summary:\n' + 'Tóm tắt '.repeat(40) },
        { role: 'user', content: 'Tin nhắn cũ '.repeat(40) },
        { role: 'assistant', content: 'Phản hồi cũ '.repeat(30) },
        { role: 'user', content: 'So sánh GET và POST thật ngắn, dễ hiểu.' },
      ],
      260,
    );

    expect(messages[messages.length - 1]?.content).toContain('So sánh GET và POST');
  });
});
