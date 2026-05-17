export const FAILURE_MODE_TAXONOMY = [
  'too_short',
  'too_generic',
  'wrong_format',
  'missed_task',
  'weak_example',
  'no_common_mistake',
  'no_practice_question',
  'hallucinated_source',
  'overlong_answer',
  'language_mismatch',
  'incomplete_quiz',
  'incomplete_flashcards',
  'bad_summary',
  'poor_correction_feedback',
  'latency_heavy_prompt',
  'unknown',
];

const VIETNAMESE_CHAR_PATTERN =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const VIETNAMESE_WORD_PATTERN =
  /\b(vi du|ví dụ|giai thich|giải thích|bai tap|bài tập|ngay|ngày|cau|câu|dap an|đáp án|so sanh|so sánh)\b/i;
const PROVIDER_WORD_PATTERN = /\b(gemini|openai|api ai lon|api ai lớn)\b/i;
const FAKE_SOURCE_PATTERN = /\b(doi|arxiv|isbn|theo wikipedia|smith et al\.|nguyen et al\.)\b/i;

const normalizeText = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeLower = (value) => normalizeText(value).toLowerCase();

const tokenize = (value) =>
  normalizeLower(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

export const parseLatencyMs = (notes) => {
  const match = String(notes ?? '').match(/Latency:\s*(\d+)ms/i);
  return match ? Number(match[1]) : 0;
};

const detectVietnamese = (value) => VIETNAMESE_CHAR_PATTERN.test(value) || VIETNAMESE_WORD_PATTERN.test(value);

const countQuestionLikeLines = (output) =>
  String(output ?? '')
    .split(/\r?\n/)
    .filter((line) => /\?/.test(line) || /^\s*(cau|câu)\s*\d+/i.test(line)).length;

const countBulletLines = (output) =>
  String(output ?? '')
    .split(/\r?\n/)
    .filter((line) => /^\s*([-*•]|\d+\.)\s+/.test(line)).length;

const hasExampleMarker = (output) => /\b(ví dụ|vi du|minh hoa|minh họa|example)\b/i.test(output);

const hasPracticeMarker = (output) =>
  /\b(tu luyen|tự luyện|thu tra loi|thử trả lời|cau hoi tu luyen|câu hỏi tự luyện|bài tập nhanh|bai tap nhanh)\b/i.test(
    output,
  ) || /\?/.test(output);

const hasCommonMistakeMarker = (output) =>
  /\b(de nham|dễ nhầm|loi hay gap|lỗi hay gặp|diem can tranh|điểm cần tránh|lỗi thường gặp)\b/i.test(output);

const computeKeywordOverlap = (expected, output) => {
  const expectedTokens = unique(tokenize(expected));
  if (expectedTokens.length === 0) {
    return 0;
  }
  const outputTokens = new Set(tokenize(output));
  return expectedTokens.filter((token) => outputTokens.has(token)).length / expectedTokens.length;
};

const computePromptEchoRatio = (prompt, output) => {
  const promptTokens = unique(tokenize(prompt));
  const outputTokens = unique(tokenize(output));
  if (outputTokens.length === 0 || promptTokens.length === 0) {
    return 0;
  }

  const echoCount = outputTokens.filter((token) => promptTokens.includes(token)).length;
  return echoCount / outputTokens.length;
};

export const detectFailureModes = ({
  category,
  prompt,
  idealResponse,
  output,
  latencyMs = 0,
  maxExpectedChars = 520,
}) => {
  const normalizedPrompt = normalizeText(prompt);
  const normalizedOutput = normalizeText(output);
  const normalizedIdeal = normalizeText(idealResponse);
  const lowerOutput = normalizeLower(output);
  const lowerPrompt = normalizeLower(prompt);
  const keywordOverlap = computeKeywordOverlap(normalizedIdeal, normalizedOutput);
  const echoRatio = computePromptEchoRatio(normalizedPrompt, normalizedOutput);
  const failureModes = [];

  if (!normalizedOutput) {
    return ['missed_task', 'too_short'];
  }

  if (normalizedOutput.length < 80) {
    failureModes.push('too_short');
  }

  if (normalizedOutput.length > maxExpectedChars) {
    failureModes.push('overlong_answer');
  }

  if (!detectVietnamese(normalizedOutput) || /\b(is a|means|the |this )\b/i.test(normalizedOutput)) {
    failureModes.push('language_mismatch');
  }

  if (PROVIDER_WORD_PATTERN.test(normalizedOutput)) {
    failureModes.push('too_generic');
  }

  if (FAKE_SOURCE_PATTERN.test(normalizedOutput)) {
    failureModes.push('hallucinated_source');
  }

  if (latencyMs >= 9000 || /�/.test(output)) {
    failureModes.push('latency_heavy_prompt');
  }

  if (keywordOverlap < 0.12 || echoRatio > 0.7 || lowerOutput.startsWith(lowerPrompt.slice(0, 24))) {
    failureModes.push('missed_task');
  }

  if (keywordOverlap < 0.18 && !hasExampleMarker(normalizedOutput) && echoRatio > 0.45) {
    failureModes.push('too_generic');
  }

  switch (category) {
    case 'explain_concept':
    case 'give_example':
      if (!hasExampleMarker(normalizedOutput)) {
        failureModes.push('weak_example');
      }
      if (!hasPracticeMarker(normalizedOutput)) {
        failureModes.push('no_practice_question');
      }
      if (!hasCommonMistakeMarker(normalizedOutput)) {
        failureModes.push('no_common_mistake');
      }
      break;
    case 'compare_concepts':
      if (!/\b(so sánh|khác|giống|còn|trong khi|whereas|while)\b/i.test(normalizedOutput)) {
        failureModes.push('wrong_format');
      }
      if (!hasPracticeMarker(normalizedOutput)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'correct_student_answer':
      if (!/\b(chưa đúng|sai|cần sửa|đúng hơn|nên sửa)\b/i.test(normalizedOutput)) {
        failureModes.push('poor_correction_feedback');
      }
      if (!hasPracticeMarker(normalizedOutput)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'generate_quiz':
      if (countQuestionLikeLines(normalizedOutput) < 2 || !/\b(A\.|B\.|C\.|D\.)/.test(normalizedOutput)) {
        failureModes.push('incomplete_quiz');
      }
      if (!/\b(dap an|đáp án|answer)\b/i.test(normalizedOutput)) {
        failureModes.push('wrong_format');
      }
      break;
    case 'generate_flashcards':
      if (countBulletLines(normalizedOutput) < 3 || !/\b(hoi|hỏi|dap|đáp|q:|a:)\b/i.test(normalizedOutput)) {
        failureModes.push('incomplete_flashcards');
      }
      break;
    case 'summarize_lesson':
      if (countBulletLines(normalizedOutput) < 2) {
        failureModes.push('bad_summary');
      }
      break;
    case 'study_plan':
      if (!/\b(ngày 1|ngay 1|ngày 2|ngay 2|ngày 3|ngay 3)\b/i.test(normalizedOutput)) {
        failureModes.push('wrong_format');
      }
      if (!hasPracticeMarker(normalizedOutput)) {
        failureModes.push('no_practice_question');
      }
      break;
    case 'source_grounded_answer':
      if (!/\b(theo đoạn|theo doan|chi dua vao|chỉ dựa vào|từ nguồn|tu nguon)\b/i.test(normalizedOutput)) {
        failureModes.push('hallucinated_source');
      }
      break;
    case 'fallback_transparency':
      if (!/\b(chưa thể|chua the|chưa đủ|chua du|bạn chưa gửi|ban chua gui|hãy gửi|hay gui)\b/i.test(normalizedOutput)) {
        failureModes.push('missed_task');
      }
      break;
    default:
      break;
  }

  const uniqueFailureModes = unique(failureModes);
  return uniqueFailureModes.length > 0 ? uniqueFailureModes : ['unknown'];
};

const summarizeCategoryScores = (items) => {
  const buckets = new Map();

  for (const item of items) {
    const bucket = buckets.get(item.category) ?? [];
    bucket.push(item.score ?? 0);
    buckets.set(item.category, bucket);
  }

  return Array.from(buckets.entries())
    .map(([category, scores]) => ({
      category,
      averageScore: Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)),
      caseCount: scores.length,
    }))
    .sort((left, right) => left.averageScore - right.averageScore || left.category.localeCompare(right.category));
};

export const analyzeEvalFailures = ({
  localRun,
  internalRun,
  historicalV2Run = null,
}) => {
  const internalByCaseId = new Map((internalRun?.results ?? []).map((result) => [result.evalCaseId, result]));
  const v2ByCaseId = new Map((historicalV2Run?.results ?? []).map((result) => [result.evalCaseId, result]));
  const analyzedCases = (localRun?.results ?? []).map((result) => {
    const localOutput = result.output ?? '';
    const prompt = (result.evalCase?.inputMessages ?? [])
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join('\n');
    const latencyMs = parseLatencyMs(result.notes);
    const failureModes = detectFailureModes({
      category: result.evalCase?.category ?? 'unknown',
      prompt,
      idealResponse: result.evalCase?.idealResponse ?? '',
      output: localOutput,
      latencyMs,
    });

    return {
      evalCaseId: result.evalCaseId,
      name: result.evalCase?.name ?? result.evalCaseName ?? result.evalCaseId,
      category: result.evalCase?.category ?? result.category,
      prompt,
      idealResponse: result.evalCase?.idealResponse ?? '',
      scoringNotes: result.evalCase?.scoringNotes ?? '',
      localScore: result.score ?? 0,
      localLatencyMs: latencyMs,
      localOutput,
      internalScore: internalByCaseId.get(result.evalCaseId)?.score ?? null,
      internalOutput: internalByCaseId.get(result.evalCaseId)?.output ?? null,
      v2Score: v2ByCaseId.get(result.evalCaseId)?.score ?? null,
      v2Output: v2ByCaseId.get(result.evalCaseId)?.output ?? null,
      failureModes,
    };
  });

  const failureModeCounts = analyzedCases.reduce((acc, item) => {
    for (const mode of item.failureModes) {
      acc[mode] = (acc[mode] ?? 0) + 1;
    }
    return acc;
  }, {});

  const categoryRanking = summarizeCategoryScores(
    analyzedCases.map((item) => ({
      category: item.category,
      score: item.localScore,
    })),
  );

  const topWorstCases = [...analyzedCases]
    .sort((left, right) => left.localScore - right.localScore || right.localLatencyMs - left.localLatencyMs)
    .slice(0, 10);

  const recommendedFixs = [];

  if ((failureModeCounts.language_mismatch ?? 0) > 0) {
    recommendedFixs.push('Tighten the local system prompt to force Vietnamese output and penalize English fallback phrasing.');
  }
  if ((failureModeCounts.wrong_format ?? 0) + (failureModeCounts.incomplete_quiz ?? 0) + (failureModeCounts.incomplete_flashcards ?? 0) > 0) {
    recommendedFixs.push('Add task-specific output templates for quiz, flashcard, study-plan, and summary prompts.');
  }
  if ((failureModeCounts.missed_task ?? 0) + (failureModeCounts.too_generic ?? 0) > 0) {
    recommendedFixs.push('Shorten the local prompt and trim older context more aggressively to reduce prompt echo and generic restatement.');
  }
  if ((failureModeCounts.no_practice_question ?? 0) + (failureModeCounts.no_common_mistake ?? 0) > 0) {
    recommendedFixs.push('Target v4 examples on the missing tutor behaviors: common mistake callouts and one short practice question.');
  }
  if ((failureModeCounts.hallucinated_source ?? 0) > 0) {
    recommendedFixs.push('Add source-grounded templates that only restate provided snippets and explicitly forbid invented references.');
  }
  if ((failureModeCounts.latency_heavy_prompt ?? 0) > 0) {
    recommendedFixs.push('Keep local prompts shorter and cap retrieval/context blocks because long inputs correlate with truncated or corrupted output.');
  }

  return {
    analyzedCases,
    categoryRanking,
    topWorstCases,
    failureModeCounts,
    recommendedFixes: recommendedFixs,
  };
};
