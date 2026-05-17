import type { EvalCase, ProviderKey } from '@chatbot-ai/shared';

export type EvalFailureMode =
  | 'too_short'
  | 'too_generic'
  | 'wrong_format'
  | 'missed_task'
  | 'weak_example'
  | 'no_common_mistake'
  | 'no_practice_question'
  | 'hallucinated_source'
  | 'overlong_answer'
  | 'language_mismatch'
  | 'incomplete_quiz'
  | 'incomplete_flashcards'
  | 'bad_summary'
  | 'poor_correction_feedback'
  | 'latency_heavy_prompt'
  | 'unknown';

export interface EvalScoringMetadata {
  difficulty?: string;
  targetOutputShape?: string;
  maxResponseChars?: number;
  expectedKeyPoints?: string[];
  avoid?: string[];
}

const VIETNAMESE_CHAR_PATTERN =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗơờớợởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const VIETNAMESE_WORD_PATTERN =
  /\b(vi du|ví dụ|giai thich|giải thích|bai tap|bài tập|ngay|ngày|cau|câu|dap an|đáp án|so sanh|so sánh)\b/i;
const FAKE_SOURCE_PATTERN = /\b(doi|arxiv|isbn|theo wikipedia|smith et al\.|nguyen et al\.)\b/i;

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeLower = (value: string) => normalizeText(value).toLowerCase();

const tokenize = (value: string) =>
  normalizeLower(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);

const unique = <T>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const detectVietnamese = (value: string) =>
  VIETNAMESE_CHAR_PATTERN.test(value) || VIETNAMESE_WORD_PATTERN.test(value);

const hasExampleMarker = (output: string) => /\b(ví dụ|vi du|minh họa|minh hoa|example)\b/i.test(output);

const hasPracticeMarker = (output: string) =>
  /\b(tự luyện|tu luyen|thử trả lời|thu tra loi|câu hỏi tự luyện|cau hoi tu luyen|bài tập nhanh|bai tap nhanh)\b/i.test(
    output,
  ) || /\?/.test(output);

const hasCommonMistakeMarker = (output: string) =>
  /\b(dễ nhầm|de nham|lỗi hay gặp|loi hay gap|điểm cần tránh|diem can tranh)\b/i.test(output);

const countBulletLines = (output: string) =>
  output.split(/\r?\n/).filter((line) => /^\s*([-*•]|\d+\.)\s+/.test(line)).length;

const countQuestionLikeLines = (output: string) =>
  output.split(/\r?\n/).filter((line) => /\?/.test(line) || /^\s*(câu|cau)\s*\d+/i.test(line)).length;

const computeKeywordOverlap = (expected: string, output: string) => {
  const expectedTokens = unique(tokenize(expected));
  if (expectedTokens.length === 0) {
    return 0;
  }

  const outputTokens = new Set(tokenize(output));
  return expectedTokens.filter((token) => outputTokens.has(token)).length / expectedTokens.length;
};

const computePromptEchoRatio = (prompt: string, output: string) => {
  const promptTokens = unique(tokenize(prompt));
  const outputTokens = unique(tokenize(output));
  if (outputTokens.length === 0 || promptTokens.length === 0) {
    return 0;
  }

  const echoCount = outputTokens.filter((token) => promptTokens.includes(token)).length;
  return echoCount / outputTokens.length;
};

const getUserPrompt = (evalCase: EvalCase) =>
  evalCase.inputMessages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n');

export const parseEvalScoringMetadata = (evalCase: EvalCase): EvalScoringMetadata | null => {
  if (!evalCase.scoringNotes) {
    return null;
  }

  try {
    const parsed = JSON.parse(evalCase.scoringNotes) as EvalScoringMetadata;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const detectEvalFailureModes = (input: {
  evalCase: EvalCase;
  output: string;
  latencyMs: number;
}): EvalFailureMode[] => {
  const metadata = parseEvalScoringMetadata(input.evalCase);
  const prompt = getUserPrompt(input.evalCase);
  const expected = normalizeText(input.evalCase.idealResponse ?? '');
  const output = normalizeText(input.output);
  const lowerOutput = normalizeLower(input.output);
  const lowerPrompt = normalizeLower(prompt);
  const keywordOverlap = computeKeywordOverlap(expected, output);
  const echoRatio = computePromptEchoRatio(prompt, output);
  const failureModes: EvalFailureMode[] = [];

  if (!output) {
    return ['missed_task', 'too_short'];
  }

  if (output.length < 80) {
    failureModes.push('too_short');
  }

  if (output.length > (metadata?.maxResponseChars ?? 520)) {
    failureModes.push('overlong_answer');
  }

  if (!detectVietnamese(output) || /\b(is a|means|the |this )\b/i.test(output)) {
    failureModes.push('language_mismatch');
  }

  if (FAKE_SOURCE_PATTERN.test(output)) {
    failureModes.push('hallucinated_source');
  }

  if (input.latencyMs >= 9000 || /�/.test(input.output)) {
    failureModes.push('latency_heavy_prompt');
  }

  if (keywordOverlap < 0.12 || echoRatio > 0.7 || lowerOutput.startsWith(lowerPrompt.slice(0, 24))) {
    failureModes.push('missed_task');
  }

  if (keywordOverlap < 0.18 && !hasExampleMarker(output) && echoRatio > 0.45) {
    failureModes.push('too_generic');
  }

  switch (input.evalCase.category) {
    case 'explain_concept':
    case 'give_example':
      if (!hasExampleMarker(output)) {
        failureModes.push('weak_example');
      }
      if (!hasPracticeMarker(output)) {
        failureModes.push('no_practice_question');
      }
      if (!hasCommonMistakeMarker(output)) {
        failureModes.push('no_common_mistake');
      }
      break;
    case 'compare_concepts':
      if (!/\b(so sánh|khác|giống|còn|trong khi|whereas|while)\b/i.test(output)) {
        failureModes.push('wrong_format');
      }
      if (!hasPracticeMarker(output)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'correct_student_answer':
      if (!/\b(chưa đúng|chua dung|sai|cần sửa|can sua|đúng hơn|dung hon)\b/i.test(output)) {
        failureModes.push('poor_correction_feedback');
      }
      if (!hasPracticeMarker(output)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'generate_quiz':
      if (countQuestionLikeLines(output) < 2 || !/\b(A\.|B\.|C\.|D\.)/.test(output)) {
        failureModes.push('incomplete_quiz');
      }
      if (!/\b(dap an|đáp án|answer)\b/i.test(output)) {
        failureModes.push('wrong_format');
      }
      break;
    case 'generate_flashcards':
      if (countBulletLines(output) < 3 || !/\b(hỏi|hoi|đáp|dap|q:|a:)\b/i.test(output)) {
        failureModes.push('incomplete_flashcards');
      }
      break;
    case 'summarize_lesson':
      if (countBulletLines(output) < 2) {
        failureModes.push('bad_summary');
      }
      break;
    case 'study_plan':
      if (!/\b(ngày 1|ngay 1|ngày 2|ngay 2|ngày 3|ngay 3)\b/i.test(output)) {
        failureModes.push('wrong_format');
      }
      if (!hasPracticeMarker(output)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'source_grounded_answer':
      if (!/\b(theo đoạn|theo doan|chỉ dựa vào|chi dua vao|từ nguồn|tu nguon)\b/i.test(output)) {
        failureModes.push('hallucinated_source');
      }
      break;
    case 'fallback_transparency':
      if (!/\b(chưa thể|chua the|chưa đủ|chua du|bạn chưa gửi|ban chua gui|hãy gửi|hay gui)\b/i.test(output)) {
        failureModes.push('missed_task');
      }
      break;
    default:
      break;
  }

  const uniqueFailureModes = unique(failureModes) as EvalFailureMode[];
  return uniqueFailureModes.length > 0 ? uniqueFailureModes : ['unknown'];
};

const categoryCompletionScore = (evalCase: EvalCase, output: string) => {
  switch (evalCase.category) {
    case 'explain_concept':
      return Number(
        (
          (/\b(là|la)\b/i.test(output) ? 0.12 : 0) +
          (hasExampleMarker(output) ? 0.1 : 0) +
          (hasCommonMistakeMarker(output) ? 0.06 : 0) +
          (hasPracticeMarker(output) ? 0.06 : 0)
        ).toFixed(2),
      );
    case 'give_example':
      return Number(
        (
          (hasExampleMarker(output) ? 0.12 : 0) +
          (/\b(vì sao|vi sao|hợp lý|hop ly|đúng vì|dung vi)\b/i.test(output) ? 0.1 : 0) +
          (hasCommonMistakeMarker(output) ? 0.05 : 0) +
          (hasPracticeMarker(output) ? 0.05 : 0)
        ).toFixed(2),
      );
    case 'compare_concepts':
      return Number(
        (
          (/\b(so sánh|khác|giống|còn|trong khi)\b/i.test(output) ? 0.14 : 0) +
          (hasExampleMarker(output) ? 0.07 : 0) +
          (hasPracticeMarker(output) ? 0.05 : 0)
        ).toFixed(2),
      );
    case 'correct_student_answer':
      return Number(
        (
          (/\b(chưa đúng|sai|cần sửa|đúng hơn)\b/i.test(output) ? 0.14 : 0) +
          (/\b(vì|do|bởi vì)\b/i.test(output) ? 0.08 : 0) +
          (hasPracticeMarker(output) ? 0.05 : 0)
        ).toFixed(2),
      );
    case 'generate_quiz':
      return Number(
        (
          (countQuestionLikeLines(output) >= 2 ? 0.14 : 0) +
          (/\b(A\.|B\.|C\.|D\.)/.test(output) ? 0.1 : 0) +
          (/\b(dap an|đáp án|answer)\b/i.test(output) ? 0.08 : 0)
        ).toFixed(2),
      );
    case 'generate_flashcards':
      return Number(
        (
          (countBulletLines(output) >= 3 ? 0.14 : 0) +
          (/\b(hỏi|hoi|đáp|dap|q:|a:)\b/i.test(output) ? 0.12 : 0) +
          (hasExampleMarker(output) ? 0.04 : 0)
        ).toFixed(2),
      );
    case 'summarize_lesson':
      return Number(
        (
          (countBulletLines(output) >= 2 ? 0.14 : 0) +
          (output.length <= 360 ? 0.08 : 0) +
          (hasPracticeMarker(output) ? 0.03 : 0)
        ).toFixed(2),
      );
    case 'study_plan':
      return Number(
        (
          (/\b(ngày 1|ngay 1|ngày 2|ngay 2|ngày 3|ngay 3)\b/i.test(output) ? 0.16 : 0) +
          (hasPracticeMarker(output) ? 0.06 : 0) +
          (/\b(ôn|xem|đọc|làm|tự giải thích)\b/i.test(output) ? 0.05 : 0)
        ).toFixed(2),
      );
    case 'source_grounded_answer':
      return Number(
        (
          (/\b(theo đoạn|theo doan|chỉ dựa vào|chi dua vao|từ nguồn|tu nguon)\b/i.test(output) ? 0.16 : 0) +
          (!FAKE_SOURCE_PATTERN.test(output) ? 0.06 : 0) +
          (output.length <= 260 ? 0.05 : 0)
        ).toFixed(2),
      );
    case 'fallback_transparency':
      return Number(
        (
          (/\b(chưa thể|chua the|chưa đủ|chua du)\b/i.test(output) ? 0.14 : 0) +
          (/\b(gửi|gui|code|stack trace|query plan)\b/i.test(output) ? 0.08 : 0) +
          (hasPracticeMarker(output) ? 0.03 : 0)
        ).toFixed(2),
      );
    default:
      return 0;
  }
};

const buildPenalty = (failureModes: EvalFailureMode[], provider: ProviderKey, output: string) => {
  let penalty = 0;

  penalty += failureModes.includes('missed_task') ? 0.18 : 0;
  penalty += failureModes.includes('language_mismatch') ? 0.12 : 0;
  penalty += failureModes.includes('wrong_format') ? 0.1 : 0;
  penalty += failureModes.includes('hallucinated_source') ? 0.12 : 0;
  penalty += failureModes.includes('overlong_answer') ? 0.06 : 0;
  penalty += failureModes.includes('too_short') ? 0.05 : 0;

  if (provider === 'local_lora' && /\b(gemini|openai|api ai lon|api ai lớn)\b/i.test(output)) {
    penalty += 0.12;
  }

  return penalty;
};

export const scoreEvalOutput = (
  evalCase: EvalCase,
  output: string,
  latencyMs: number,
  provider: ProviderKey,
) => {
  const metadata = parseEvalScoringMetadata(evalCase);
  const normalizedOutput = normalizeText(output);
  const normalizedExpected = normalizeText(evalCase.idealResponse ?? '');
  const overlap = computeKeywordOverlap(normalizedExpected, normalizedOutput);
  const failureModes = detectEvalFailureModes({
    evalCase,
    output,
    latencyMs,
  });
  const completionScore = categoryCompletionScore(evalCase, normalizedOutput);
  const languageScore = detectVietnamese(normalizedOutput) ? 0.1 : 0;
  const concisionScore = normalizedOutput.length <= (metadata?.maxResponseChars ?? 520) ? 0.08 : 0.03;
  const overlapScore = overlap * 0.28;
  const penalty = buildPenalty(failureModes, provider, normalizedOutput);
  const score = Number(clamp(overlapScore + completionScore + languageScore + concisionScore - penalty).toFixed(2));

  return {
    score,
    failureModes,
    notes: `keywordOverlap=${Math.round(overlap * 100)}%; completion=${completionScore.toFixed(2)}; failureModes=${failureModes.join(',') || 'unknown'}.`,
  };
};

export const summarizeFailureModes = (items: Array<{ failureModes: EvalFailureMode[] }>) =>
  items.reduce<Record<string, number>>((acc, item) => {
    for (const failureMode of item.failureModes) {
      acc[failureMode] = (acc[failureMode] ?? 0) + 1;
    }
    return acc;
  }, {});
