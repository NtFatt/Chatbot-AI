import { createTopicProfile } from './l4-curated-examples-v3-shared.mjs';

export const V4_CATEGORIES = [
  'explain_concept',
  'give_example',
  'compare_concepts',
  'correct_student_answer',
  'generate_quiz',
  'generate_flashcards',
  'summarize_lesson',
  'study_plan',
  'source_grounded_answer',
  'fallback_transparency',
];

const CATEGORY_CODES = {
  explain_concept: 'ec',
  give_example: 'ge',
  compare_concepts: 'cc',
  correct_student_answer: 'cs',
  generate_quiz: 'gq',
  generate_flashcards: 'gf',
  summarize_lesson: 'sl',
  study_plan: 'sp',
  source_grounded_answer: 'sg',
  fallback_transparency: 'ft',
};

const FAILURE_MODE_MAP = {
  explain_concept: ['too_generic', 'no_common_mistake', 'no_practice_question'],
  give_example: ['weak_example', 'too_generic'],
  compare_concepts: ['wrong_format', 'missed_task'],
  correct_student_answer: ['poor_correction_feedback', 'too_short'],
  generate_quiz: ['incomplete_quiz', 'wrong_format'],
  generate_flashcards: ['incomplete_flashcards', 'wrong_format'],
  summarize_lesson: ['bad_summary', 'overlong_answer'],
  study_plan: ['missed_task', 'wrong_format'],
  source_grounded_answer: ['hallucinated_source', 'language_mismatch'],
  fallback_transparency: ['missed_task', 'too_generic'],
};

const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const ensureSentence = (value) => {
  const text = normalize(value);
  if (!text) {
    return '';
  }
  return /[.!?…]$/.test(text) ? text : `${text}.`;
};

const firstClause = (value, fallback) => {
  const text = normalize(value);
  if (!text) {
    return fallback;
  }

  const segments = text.split(/[.!?]/).map((item) => item.trim()).filter(Boolean);
  return segments[0] ?? fallback;
};

const getFailureModeForCategory = (category, seed) => {
  const modes = FAILURE_MODE_MAP[category] ?? ['unknown'];
  return modes[seed % modes.length];
};

const createTargetedProfile = (profile) => createTopicProfile(profile);

const buildPromptByCategory = (profile, category) => {
  switch (category) {
    case 'explain_concept':
      return `Giải thích ${profile.topic} thật ngắn cho người mới. Có ví dụ, lỗi hay gặp, và 1 câu tự luyện.`;
    case 'give_example':
      return `Cho ví dụ ngắn về ${profile.topic}. Nói luôn vì sao ví dụ đó đúng, nêu 1 lỗi dễ nhầm, và cho 1 câu tự luyện.`;
    case 'compare_concepts':
      return `So sánh ${profile.topic} với ${profile.compareWith} thật ngắn. Có điểm khác nhau chính, ví dụ, và 1 câu tự luyện.`;
    case 'correct_student_answer':
      return `Một bạn nói: "${profile.studentClaim}." Hãy sửa ngắn gọn, giải thích vì sao, rồi cho 1 câu tự luyện.`;
    case 'generate_quiz':
      return `Tạo đúng 2 câu quiz trắc nghiệm ngắn về ${profile.topic}. Mỗi câu có 4 lựa chọn A-D và đáp án.`;
    case 'generate_flashcards':
      return `Tạo đúng 3 flashcard ngắn để học ${profile.topic}. Mỗi flashcard phải có Hỏi và Đáp.`;
    case 'summarize_lesson':
      return `Tóm tắt thật ngắn bài ${profile.topic} thành đúng 3 ý chính.`;
    case 'study_plan':
      return `Lập kế hoạch học đúng 3 ngày để ôn ${profile.topic}. Mỗi ngày 1-2 việc ngắn.`;
    case 'source_grounded_answer':
      return [
        'Chỉ dựa vào đoạn sau để trả lời.',
        `Đoạn nguồn: "${profile.sourceSnippet}"`,
        `Câu hỏi: Theo đoạn trên, điều chính cần nhớ về ${profile.topic} là gì?`,
      ].join('\n');
    case 'fallback_transparency':
      return `Mình chưa gửi ${profile.fallbackNeed}, nhưng bạn hãy kết luận ngay lỗi hoặc đáp án liên quan đến ${profile.topic}.`;
    default:
      throw new Error(`Unsupported category: ${category}`);
  }
};

const buildOutputByCategory = (profile, category) => {
  switch (category) {
    case 'explain_concept':
      return [
        `- ${profile.definition}`,
        `- Ví dụ: ${profile.example}`,
        `- Dễ nhầm: ${ensureSentence(profile.studentClaim)}`,
        `- Tự luyện: ${profile.practiceQuestion}`,
      ].join('\n');
    case 'give_example':
      return [
        `- Ví dụ: ${profile.example}`,
        `- Vì sao đúng: ${firstClause(profile.definition, profile.topic)}.`,
        `- Dễ nhầm: ${ensureSentence(profile.studentClaim)}`,
        `- Tự luyện: ${profile.practiceQuestion}`,
      ].join('\n');
    case 'compare_concepts':
      return [
        `- ${profile.topic} khác ${profile.compareWith} ở điểm chính: ${firstClause(profile.compareSummary, profile.definition)}.`,
        `- Ví dụ: ${profile.example}`,
        `- Dễ nhầm: ${ensureSentence(profile.studentClaim)}`,
        `- Tự luyện: ${profile.practiceQuestion}`,
      ].join('\n');
    case 'correct_student_answer':
      return [
        `- Nhận định về ${profile.topic} này chưa đúng.`,
        `- Vì sao: ${profile.correction}`,
        `- Ví dụ nhanh: ${profile.example}`,
        `- Tự luyện: ${profile.practiceQuestion}`,
      ].join('\n');
    case 'generate_quiz':
      return [
        `Câu 1: Phát biểu nào đúng nhất về ${profile.topic}?`,
        `A. ${profile.studentClaim}.`,
        `B. ${firstClause(profile.definition, profile.topic)}.`,
        `C. ${profile.compareWith} luôn thay thế hoàn toàn cho ${profile.topic}.`,
        'D. Chỉ cần nhớ tên khái niệm, không cần hiểu cách dùng.',
        'Đáp án: B',
        '',
        `Câu 2: Tình huống nào hợp với ${profile.topic}?`,
        'A. Đoán kết quả dù chưa đủ dữ kiện.',
        `B. ${firstClause(profile.example, 'Một tình huống khớp với khái niệm')}.`,
        'C. Bỏ qua mọi ràng buộc của đề bài.',
        'D. Chỉ học thuộc định nghĩa mà không luyện ví dụ.',
        'Đáp án: B',
      ].join('\n');
    case 'generate_flashcards':
      return [
        `- Hỏi: ${profile.topic} là gì? | Đáp: ${firstClause(profile.definition, profile.topic)}.`,
        `- Hỏi: Ví dụ ngắn về ${profile.topic}? | Đáp: ${firstClause(profile.example, profile.topic)}.`,
        `- Hỏi: Dễ nhầm gì về ${profile.topic}? | Đáp: ${ensureSentence(profile.studentClaim)}`,
      ].join('\n');
    case 'summarize_lesson':
      return [
        `- ${firstClause(profile.definition, profile.topic)}.`,
        `- ${firstClause(profile.example, profile.topic)}.`,
        `- Dễ nhầm: ${profile.studentClaim}.`,
      ].join('\n');
    case 'study_plan':
      return [
        `Ngày 1: đọc lại định nghĩa và tự nói lại bằng lời của mình: ${firstClause(profile.definition, profile.topic)}.`,
        `Ngày 2: xem ví dụ rồi tự sửa lại theo ý hiểu: ${firstClause(profile.example, profile.topic)}.`,
        `Ngày 3: ôn phần dễ nhầm "${profile.studentClaim}" và tự trả lời câu này: ${profile.practiceQuestion}`,
      ].join('\n');
    case 'source_grounded_answer':
      return [
        `- Theo đoạn đã cho, ${profile.sourceAnswer.charAt(0).toLowerCase()}${profile.sourceAnswer.slice(1)}`,
        '- Mình không thêm chi tiết ngoài phần nguồn đã xuất hiện trong câu hỏi.',
      ].join('\n');
    case 'fallback_transparency':
      return [
        `- Mình chưa thể kết luận vì bạn chưa gửi ${profile.fallbackNeed}.`,
        `- Bạn hãy gửi ${profile.fallbackNeed} hoặc nêu rõ bạn muốn mình kiểm tra phần nào.`,
        `- Gợi ý chung: ${profile.fallbackTip}`,
      ].join('\n');
    default:
      throw new Error(`Unsupported category: ${category}`);
  }
};

export const buildTargetedExamplesFromProfiles = (profiles) =>
  profiles
    .map(createTargetedProfile)
    .flatMap((profile, profileIndex) =>
      V4_CATEGORIES.map((category) => ({
        id: `v4-${CATEGORY_CODES[category]}-${profile.id}`,
        category,
        prompt: buildPromptByCategory(profile, category),
        output: buildOutputByCategory(profile, category),
        difficulty: profile.difficulty,
        subject: profile.subject,
        status: 'approved',
        source: 'synthetic-targeted-dev',
        version: 'v4',
        targetedFailureMode: getFailureModeForCategory(category, profileIndex),
        targetCategory: category,
        derivedFromEvalCaseId: null,
        qualityIntent: 'concise-vietnamese-structured-tutor-output',
      })),
    );
