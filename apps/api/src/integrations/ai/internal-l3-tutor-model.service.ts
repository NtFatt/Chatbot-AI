import type {
  AIChatResult,
  AiRuntimeMode,
  AppLanguage,
  ChatMessage,
  RetrievalSnapshot,
} from '@chatbot-ai/shared';

import { env } from '../../config/env';
import type { UsageService } from '../../modules/usage/usage.service';
import { truncateText } from '../../utils/text';

const detectVietnamese = (value: string) =>
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    value,
  ) || /\b(giải thích|ví dụ|bài tập|định nghĩa|tại sao|như thế nào)\b/i.test(value);

const compactTopic = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/g, '')
    .slice(0, 160);

const extractLatestUserPrompt = (messages: ChatMessage[]) =>
  [...messages].reverse().find((message) => message.senderType === 'user')?.content.trim() ??
  'No question provided.';

const buildSourceDigest = (retrievalSnapshot?: RetrievalSnapshot | null) =>
  (retrievalSnapshot?.materials ?? []).slice(0, 2).map((material) => ({
    title: material.title,
    subject: material.subjectLabel,
    topic: material.topicLabel,
    snippet: truncateText(material.snippet, 180),
  }));

const buildVietnameseResponse = (input: {
  latestPrompt: string;
  retrievalSnapshot?: RetrievalSnapshot | null;
  contextSummary?: string | null;
  subjectHint?: string | null;
}) => {
  const sources = buildSourceDigest(input.retrievalSnapshot);
  const topic =
    input.retrievalSnapshot?.inferredTopic ??
    input.subjectHint ??
    compactTopic(input.latestPrompt) ??
    'chủ đề hiện tại';
  const subject = input.retrievalSnapshot?.inferredSubject ?? input.subjectHint ?? 'môn học hiện tại';
  const confidence = sources.length > 0 ? 'cao' : 'trung bình';
  const contextLine = input.contextSummary
    ? `Ngữ cảnh phiên học gần đây: ${truncateText(input.contextSummary, 180)}`
    : 'Ngữ cảnh phiên học: mình đang ưu tiên trả lời ngắn gọn, có cấu trúc, và sát mục tiêu học tập.';
  const sourceSection =
    sources.length > 0
      ? [
          '## Tài liệu đã tận dụng',
          ...sources.map(
            (source) =>
              `- **${source.title}**${source.subject ? ` (${source.subject}${source.topic ? ` / ${source.topic}` : ''})` : ''}: ${source.snippet}`,
          ),
          '',
        ].join('\n')
      : '';

  return {
    contentMarkdown: [
      '## Giải thích cốt lõi',
      `Chủ đề bạn đang hỏi là **${topic}** trong bối cảnh **${subject}**.`,
      'Cách hiểu an toàn là: nắm định nghĩa trước, hiểu cơ chế hoạt động sau, rồi mới áp dụng vào ví dụ hoặc bài tập.',
      contextLine,
      '',
      '## Ví dụ ngắn',
      `Nếu cần giải thích cho người mới học, hãy mô tả **${topic}** bằng một tình huống quen thuộc rồi chỉ ra vì sao cách đó giúp giải quyết vấn đề trong bài học.`,
      '',
      '## Điểm dễ nhầm',
      `Lỗi phổ biến là học thuộc định nghĩa của **${topic}** nhưng không kiểm tra điều kiện áp dụng, nên khi gặp bài tập biến thể sẽ rất dễ chọn sai hướng.`,
      '',
      '## Câu hỏi tự luyện',
      `Hãy thử tự trả lời: "Nếu mình phải giải thích **${topic}** trong 3 câu, mình sẽ nêu định nghĩa, ví dụ, và lưu ý nào?"`,
      '',
      '## Gợi ý hỏi tiếp',
      '- Muốn mình giải thích chậm hơn theo kiểu từng bước?',
      '- Muốn thêm một ví dụ Java/bài tập/quiz ngắn cho chủ đề này?',
      '- Muốn so sánh khái niệm này với một khái niệm gần giống để dễ phân biệt?',
      '',
      sourceSection.trim(),
      sourceSection ? '' : null,
      `> Độ chắc chắn: ${confidence}. Phản hồi này do **Internal L3 Tutor** của ứng dụng tạo ra từ tutor policy, ngữ cảnh phiên học, và tài liệu truy xuất khi có. Đây vẫn là Level 3, chưa phải Level 4 fine-tuned/local LLM.`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n'),
    confidenceScore: sources.length > 0 ? 0.82 : 0.64,
    confidenceLevel: sources.length > 0 ? ('high' as const) : ('medium' as const),
  };
};

const buildEnglishResponse = (input: {
  latestPrompt: string;
  retrievalSnapshot?: RetrievalSnapshot | null;
  contextSummary?: string | null;
  subjectHint?: string | null;
}) => {
  const sources = buildSourceDigest(input.retrievalSnapshot);
  const topic =
    input.retrievalSnapshot?.inferredTopic ??
    input.subjectHint ??
    compactTopic(input.latestPrompt) ??
    'the current topic';
  const subject = input.retrievalSnapshot?.inferredSubject ?? input.subjectHint ?? 'the current subject';
  const confidence = sources.length > 0 ? 'high' : 'medium';
  const contextLine = input.contextSummary
    ? `Recent session context: ${truncateText(input.contextSummary, 180)}`
    : 'Session context: the answer is being kept concise, structured, and study-oriented.';
  const sourceSection =
    sources.length > 0
      ? [
          '## Retrieved study context',
          ...sources.map(
            (source) =>
              `- **${source.title}**${source.subject ? ` (${source.subject}${source.topic ? ` / ${source.topic}` : ''})` : ''}: ${source.snippet}`,
          ),
          '',
        ].join('\n')
      : '';

  return {
    contentMarkdown: [
      '## Core explanation',
      `Your question is about **${topic}** in **${subject}**.`,
      'A safe study approach is: define it first, understand the mechanism second, then apply it to an example or exercise.',
      contextLine,
      '',
      '## Short example',
      `Explain **${topic}** as if you were teaching a beginner, then connect it to one concrete use case from class or homework.`,
      '',
      '## Common mistake',
      `A common mistake is memorizing the definition of **${topic}** without checking when it should be applied, which leads to wrong answers on variation problems.`,
      '',
      '## Practice question',
      `Try answering this in your own words: "If I had 3 sentences to explain **${topic}**, what definition, example, and caution would I include?"`,
      '',
      '## Follow-up options',
      '- Want a simpler step-by-step explanation?',
      '- Want one short Java/example/problem for this topic?',
      '- Want a comparison with a nearby concept so the distinction is clearer?',
      '',
      sourceSection.trim(),
      sourceSection ? '' : null,
      `> Confidence: ${confidence}. This reply was generated by the app's **Internal L3 Tutor** using tutor policy, session context, and retrieved materials when available. It is still Level 3, not a Level 4 fine-tuned or local-LLM runtime.`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n'),
    confidenceScore: sources.length > 0 ? 0.82 : 0.64,
    confidenceLevel: sources.length > 0 ? ('high' as const) : ('medium' as const),
  };
};

export interface InternalL3TutorGenerateInput {
  userId: string;
  sessionId: string;
  aiRuntimeMode: AiRuntimeMode;
  language: AppLanguage;
  contextSummary?: string | null;
  messages: ChatMessage[];
  subjectHint?: string | null;
  retrievalSnapshot?: RetrievalSnapshot | null;
  modelVersionId?: string | null;
}

export class InternalL3TutorModelService {
  constructor(private readonly usageService?: UsageService) {}

  async generate(input: InternalL3TutorGenerateInput): Promise<AIChatResult> {
    const startedAt = Date.now();
    const latestPrompt = extractLatestUserPrompt(input.messages);
    const shouldUseVietnamese =
      input.language !== 'en' || detectVietnamese(latestPrompt);
    const response = shouldUseVietnamese
      ? buildVietnameseResponse({
          latestPrompt,
          retrievalSnapshot: input.retrievalSnapshot,
          contextSummary: input.contextSummary,
          subjectHint: input.subjectHint,
        })
      : buildEnglishResponse({
          latestPrompt,
          retrievalSnapshot: input.retrievalSnapshot,
          contextSummary: input.contextSummary,
          subjectHint: input.subjectHint,
        });

    const result: AIChatResult = {
      provider: 'internal_l3_tutor',
      model: env.L3_INTERNAL_MODEL_NAME,
      modelVersionId: input.modelVersionId ?? null,
      aiRuntimeMode: input.aiRuntimeMode,
      learningEngineUsed: true,
      externalFallbackUsed: false,
      contentMarkdown: response.contentMarkdown,
      finishReason: 'stop',
      latencyMs: Math.max(1, Date.now() - startedAt),
      fallbackUsed: false,
      fallbackInfo: null,
      warnings: [],
      confidenceScore: response.confidenceScore,
      confidenceLevel: response.confidenceLevel,
      retrievalSnapshot: {
        ...(input.retrievalSnapshot ?? { queryExpansion: [], materials: [] }),
        aiRuntimeMode: input.aiRuntimeMode,
        executionProvider: 'internal_l3_tutor',
        executionModel: env.L3_INTERNAL_MODEL_NAME,
        learningEngineUsed: true,
        externalFallbackUsed: false,
        modelVersionId: input.modelVersionId ?? null,
      },
    };

    if (this.usageService) {
      await this.usageService.recordUsage({
        userId: input.userId,
        sessionId: input.sessionId,
        provider: 'internal_l3_tutor',
        model: env.L3_INTERNAL_MODEL_NAME,
        latencyMs: result.latencyMs,
        success: true,
        fallbackUsed: false,
      });
    }

    return result;
  }
}
