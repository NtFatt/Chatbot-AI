import { env } from '../../config/env';
import type { UsageService } from '../../modules/usage/usage.service';
import type { AIProvider, AIProviderRequest, AIProviderResponse, LocalLoraTaskCategory } from './ai.types';
import { classifyProviderError } from './provider-runtime';

interface LocalLoraMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LocalLoraCompletionChoice {
  message?: {
    content?: string;
  };
  finish_reason?: string;
}

interface LocalLoraUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface LocalLoraCompletionResponse {
  choices?: LocalLoraCompletionChoice[];
  usage?: LocalLoraUsage;
}

const LOCAL_LORA_CATEGORY_INSTRUCTIONS: Record<LocalLoraTaskCategory, string> = {
  explain_concept: 'Mau tra loi: 4 bullet ngan gom dinh nghia, vi du, de nham, tu luyen.',
  give_example: 'Mau tra loi: 4 bullet gom vi du cu the, vi sao dung, de nham, tu luyen.',
  compare_concepts: 'Mau tra loi: 4 bullet gom diem khac nhau, khi dung, vi du, tu luyen.',
  correct_student_answer: 'Mau tra loi: 4 bullet gom ket luan dung/sai, ly do, vi du, tu luyen.',
  generate_quiz: 'Tao dung 2 cau quiz. Moi cau co A-D va 1 dong Dap an.',
  generate_flashcards: 'Tao dung 3 flashcard dang "- Hoi: ... | Dap: ...".',
  summarize_lesson: 'Tom tat dung 3 bullet ngan, khong mo rong them.',
  study_plan: 'Lap ke hoach dung 3 ngay: Ngay 1, Ngay 2, Ngay 3. Moi ngay 1-2 viec ngan.',
  source_grounded_answer: 'Chi duoc dung thong tin co trong nguon duoc cung cap. Neu thieu du kien, noi ro.',
  fallback_transparency: 'Khong doan. Noi thieu gi, can gui them gi, va buoc tiep theo.',
};

const VIETNAMESE_CHAR_PATTERN =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

const clampWithEllipsis = (value: string, maxChars: number) => {
  if (value.length <= maxChars) {
    return value;
  }

  if (maxChars <= 32) {
    return value.slice(0, maxChars);
  }

  const head = Math.ceil(maxChars * 0.55);
  const tail = Math.max(0, maxChars - head - 7);
  return `${value.slice(0, head)}\n...\n${value.slice(value.length - tail)}`;
};

const detectVietnamese = (value: string) =>
  VIETNAMESE_CHAR_PATTERN.test(value) || /\b(giải thích|ví dụ|bài tập|trắc nghiệm|tóm tắt|lập kế hoạch)\b/i.test(value);

const extractLatestUserMessage = (messages: AIProviderRequest['messages']) =>
  [...messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';

export const detectLocalLoraTaskCategory = (value: string): LocalLoraTaskCategory | null => {
  const prompt = value.toLowerCase();

  if (/(chỉ dựa vào|chi dua vao|đoạn nguồn|doan nguon|theo đoạn|theo doan)/i.test(prompt)) {
    return 'source_grounded_answer';
  }
  if (/(mình chưa gửi|minh chua gui|hãy kết luận ngay|hay ket luan ngay|thiếu|thieu)/i.test(prompt)) {
    return 'fallback_transparency';
  }
  if (/(quiz|trắc nghiệm|trac nghiem)/i.test(prompt)) {
    return 'generate_quiz';
  }
  if (/flashcard/i.test(prompt)) {
    return 'generate_flashcards';
  }
  if (/(lập kế hoạch|lap ke hoach|3 ngày|3 ngay)/i.test(prompt)) {
    return 'study_plan';
  }
  if (/(tóm tắt|tom tat)/i.test(prompt)) {
    return 'summarize_lesson';
  }
  if (/(so sánh|so sanh|compare)/i.test(prompt)) {
    return 'compare_concepts';
  }
  if (/(hãy sửa|hay sua|một bạn nói|mot ban noi|câu đó|cau do)/i.test(prompt)) {
    return 'correct_student_answer';
  }
  if (/(ví dụ|vi du|example)/i.test(prompt)) {
    return 'give_example';
  }
  if (/(giải thích|giai thich|là gì|la gi)/i.test(prompt)) {
    return 'explain_concept';
  }

  return null;
};

const extractRetrievalHint = (systemPrompt: string | undefined) => {
  const source = String(systemPrompt ?? '');
  const marker = 'RETRIEVAL CONTEXT:';
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  return clampWithEllipsis(source.slice(markerIndex + marker.length).trim(), 500);
};

export const buildLocalLoraSystemPrompt = (options: {
  taskCategory?: LocalLoraTaskCategory | null;
  systemPrompt?: string;
  latestUserMessage: string;
}) => {
  const taskCategory = options.taskCategory ?? detectLocalLoraTaskCategory(options.latestUserMessage);
  const retrievalHint = extractRetrievalHint(options.systemPrompt);
  const wantsEnglish =
    !detectVietnamese(options.latestUserMessage) && /\b(please|explain|example|compare|summarize)\b/i.test(options.latestUserMessage);
  const lines = [
    'Ban la gia su AI ngan gon cho sinh vien.',
    wantsEnglish
      ? 'Tra loi bang tieng Anh ngan gon vi nguoi dung dang hoi bang tieng Anh.'
      : 'Tra loi bang tieng Viet ngan gon, tu nhien. Chi doi ngon ngu neu nguoi dung yeu cau ro.',
    'Dung 3-5 bullet hoac muc ngan. Neu phu hop, them 1 vi du ngan va 1 cau tu luyen.',
    'Khong bịa nguon. Khong nhac nha cung cap ben ngoai.',
    taskCategory ? LOCAL_LORA_CATEGORY_INSTRUCTIONS[taskCategory] : 'Uu tien tra loi dung yeu cau chinh cua cau hoi moi nhat.',
  ];

  if (retrievalHint) {
    lines.push(`Neu can, chi su dung ngu canh rut gon sau day:\n${retrievalHint}`);
  }

  return lines.join('\n');
};

const prioritizeMessagesForLocalLora = (messages: AIProviderRequest['messages']) => {
  const normalized = messages
    .map((message, index) => ({
      ...message,
      content: message.content.trim(),
      index,
    }))
    .filter((message) => message.content.length > 0);

  const latestUser = [...normalized].reverse().find((message) => message.role === 'user');
  const latestAssistant = [...normalized].reverse().find((message) => message.role === 'assistant');
  const summaryMessage = normalized.find((message) => /^conversation summary:/i.test(message.content));
  const others = normalized.filter(
    (message) => message !== latestUser && message !== latestAssistant && message !== summaryMessage,
  );

  return [summaryMessage, ...others.slice(-1), latestAssistant, latestUser].filter(
    (message): message is (typeof normalized)[number] => Boolean(message),
  );
};

export const trimMessagesForLocalLora = (
  systemPrompt: string | undefined,
  messages: AIProviderRequest['messages'],
  contextMaxChars: number,
) => {
  const trimmed: LocalLoraMessage[] = [];
  let remaining = contextMaxChars;

  if (systemPrompt) {
    const normalizedSystemPrompt = systemPrompt.trim();
    if (normalizedSystemPrompt) {
      const systemBudget = Math.min(remaining, Math.min(900, Math.max(180, Math.floor(contextMaxChars * 0.35))));
      const cappedSystemPrompt = clampWithEllipsis(normalizedSystemPrompt, systemBudget);
      trimmed.push({ role: 'system', content: cappedSystemPrompt });
      remaining = Math.max(0, remaining - cappedSystemPrompt.length);
    }
  }

  const reversedMessages = [...prioritizeMessagesForLocalLora(messages)].reverse();
  const keptMessages: LocalLoraMessage[] = [];
  for (const message of reversedMessages) {
    if (remaining <= 0) {
      break;
    }

    const normalizedContent = message.content.trim();
    if (!normalizedContent) {
      continue;
    }

    const messageBudget =
      message.role === 'user'
        ? Math.min(remaining, Math.min(1400, normalizedContent.length))
        : Math.min(remaining, Math.min(700, normalizedContent.length));
    const cappedContent = clampWithEllipsis(normalizedContent, messageBudget);
    keptMessages.push({
      role: message.role,
      content: cappedContent,
    });
    remaining = Math.max(0, remaining - cappedContent.length);
  }

  return [...trimmed, ...keptMessages.reverse()];
};

export class LocalLoraProvider implements AIProvider {
  readonly key = 'local_lora';

  constructor(private readonly usageService?: UsageService) {}

  async generate(
    request: AIProviderRequest,
    _callbacks?: { onChunk?: (chunk: string) => void },
  ): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? env.LOCAL_LORA_TIMEOUT_MS;

    if (!env.LOCAL_LORA_ENABLED) {
      const errorDescriptor = classifyProviderError(new Error('LOCAL_LORA_ENABLED is false'));
      throw Object.assign(new Error(`[local_lora] ${errorDescriptor.message}`), {
        provider: 'local_lora',
        descriptor: errorDescriptor,
      });
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const latestUserMessage = extractLatestUserMessage(request.messages);
      const formattedMessages = trimMessagesForLocalLora(
        buildLocalLoraSystemPrompt({
          taskCategory: request.taskCategory ?? detectLocalLoraTaskCategory(latestUserMessage),
          systemPrompt: request.systemPrompt,
          latestUserMessage,
        }),
        request.messages,
        request.contextMaxChars ?? env.LOCAL_LORA_CONTEXT_MAX_CHARS,
      );

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const maxNewTokens = request.maxNewTokens ?? env.LOCAL_LORA_MAX_NEW_TOKENS;
      const temperature = request.temperature ?? env.LOCAL_LORA_TEMPERATURE;
      const topP = request.topP ?? env.LOCAL_LORA_TOP_P;

      const response = await fetch(`${env.LOCAL_LORA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || env.LOCAL_LORA_MODEL,
          messages: formattedMessages,
          temperature,
          max_new_tokens: maxNewTokens,
          top_p: topP,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        throw new Error(`Local inference server error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as LocalLoraCompletionResponse;
      const firstChoice = data.choices?.[0];
      const generatedText = firstChoice?.message?.content ?? '';

      if (!generatedText) {
        throw new Error('Local inference server returned empty content');
      }

      return {
        text: generatedText,
        finishReason:
          firstChoice?.finish_reason === 'stop' ||
          firstChoice?.finish_reason === 'length' ||
          firstChoice?.finish_reason === 'error'
            ? firstChoice.finish_reason
            : 'stop',
        latencyMs: Math.max(1, Date.now() - startedAt),
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
      };
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error && error.name === 'AbortError'
          ? new Error(`LOCAL_LORA_TIMEOUT after ${timeoutMs}ms`)
          : error;
      const errorDescriptor = classifyProviderError(normalizedError);
      throw Object.assign(new Error(`[local_lora] ${errorDescriptor.message}`), {
        provider: 'local_lora',
        descriptor: errorDescriptor,
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
