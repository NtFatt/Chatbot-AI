export const V3_CATEGORIES = [
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

const EXPLAIN_OPENERS = [
  'Nói ngắn gọn,',
  'Hiểu nhanh thì',
  'Ý chính là',
  'Cốt lõi của khái niệm này là',
];
const EXAMPLE_LABELS = ['Ví dụ nhanh', 'Minh họa ngắn', 'Ví dụ dễ nhớ'];
const MISTAKE_LABELS = ['Dễ nhầm', 'Lỗi hay gặp', 'Điểm cần tránh'];
const PRACTICE_LABELS = ['Tự luyện', 'Thử trả lời', 'Bài tập nhanh'];
const SOURCE_OPENERS = ['Theo đoạn đã cho,', 'Chỉ dựa vào phần bạn gửi,', 'Từ nguồn bạn cung cấp,'];
const FALLBACK_OPENERS = [
  'Mình chưa thể kết luận chắc vì',
  'Chưa đủ dữ kiện để trả lời chính xác vì',
  'Nếu đoán ngay lúc này thì sẽ thiếu an toàn vì',
];

const choice = (items, seed) => items[seed % items.length];

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

export const createTopicProfile = (profile) => ({
  ...profile,
  definition: ensureSentence(profile.definition),
  example: ensureSentence(profile.example),
  compareSummary: ensureSentence(profile.compareSummary),
  correction: ensureSentence(profile.correction),
  practiceQuestion: ensureSentence(profile.practiceQuestion),
  sourceSnippet: normalize(profile.sourceSnippet),
  sourceAnswer: ensureSentence(profile.sourceAnswer),
  fallbackTip: ensureSentence(profile.fallbackTip ?? profile.correction),
  fallbackNeed: normalize(profile.fallbackNeed || 'đề bài hoặc đoạn code gốc'),
  studentClaim: normalize(profile.studentClaim),
  compareWith: normalize(profile.compareWith),
});

const buildExplainOutput = (profile, seed) =>
  [
    `${choice(EXPLAIN_OPENERS, seed)} ${profile.definition.charAt(0).toLowerCase()}${profile.definition.slice(1)}`,
    `${choice(EXAMPLE_LABELS, seed)}: ${profile.example}`,
    `${choice(MISTAKE_LABELS, seed)}: ${ensureSentence(profile.studentClaim)}`,
    `${choice(PRACTICE_LABELS, seed)}: ${profile.practiceQuestion}`,
  ].join('\n');

const buildExampleOutput = (profile, seed) =>
  [
    `${choice(EXAMPLE_LABELS, seed)}: ${profile.example}`,
    `Điểm đúng của ví dụ: ${firstClause(profile.definition, profile.topic)}.`,
    `${choice(MISTAKE_LABELS, seed)}: ${profile.studentClaim}.`,
    `${choice(PRACTICE_LABELS, seed)}: ${profile.practiceQuestion}`,
  ].join('\n');

const buildCompareOutput = (profile, seed) =>
  [
    `${profile.topic} và ${profile.compareWith} không giống nhau.`,
    `${profile.compareSummary}`,
    `${choice(EXAMPLE_LABELS, seed)}: ${profile.example}`,
    `${choice(PRACTICE_LABELS, seed)}: ${profile.practiceQuestion}`,
  ].join('\n');

const buildCorrectionOutput = (profile, seed) =>
  [
    `Câu đó chưa đúng. ${profile.correction}`,
    `${choice(EXAMPLE_LABELS, seed)}: ${profile.example}`,
    `${choice(PRACTICE_LABELS, seed)}: ${profile.practiceQuestion}`,
  ].join('\n');

const buildQuizOutput = (profile) =>
  [
    `Câu 1: Phát biểu nào đúng nhất về ${profile.topic}?`,
    `A. ${profile.studentClaim}.`,
    `B. ${firstClause(profile.definition, profile.topic)}.`,
    `C. ${profile.compareWith} luôn thay thế hoàn toàn cho ${profile.topic}.`,
    `D. Chỉ cần nhớ tên khái niệm, không cần ví dụ.`,
    'Đáp án: B',
    `Câu 2: Trong tình huống nào nên nghĩ đến ${profile.topic}?`,
    `A. Khi muốn bỏ qua hoàn toàn quy tắc của bài.`,
    `B. ${firstClause(profile.example, 'Khi ví dụ phù hợp với khái niệm')}.`,
    `C. Khi dữ liệu chưa rõ mà vẫn đoán kết quả.`,
    `D. Khi chỉ muốn chép đáp án mà không hiểu logic.`,
    'Đáp án: B',
  ].join('\n');

const buildFlashcardOutput = (profile, seed) =>
  [
    `- Thẻ 1 | Hỏi: ${profile.topic} là gì? | Đáp: ${firstClause(profile.definition, profile.topic)}.`,
    `- Thẻ 2 | Hỏi: Ví dụ ngắn? | Đáp: ${firstClause(profile.example, profile.topic)}.`,
    `- Thẻ 3 | Hỏi: ${choice(MISTAKE_LABELS, seed)}? | Đáp: ${ensureSentence(profile.studentClaim)}`,
  ].join('\n');

const buildSummaryOutput = (profile, seed) =>
  [
    `- Ý 1: ${firstClause(profile.definition, profile.topic)}.`,
    `- Ý 2: ${firstClause(profile.example, profile.topic)}.`,
    `- Ý 3: ${choice(MISTAKE_LABELS, seed)} là ${profile.studentClaim}.`,
  ].join('\n');

const buildStudyPlanOutput = (profile, seed) =>
  [
    `Ngày 1: đọc lại định nghĩa và tự nói lại bằng lời của mình: ${firstClause(profile.definition, profile.topic)}.`,
    `Ngày 2: xem ví dụ này rồi sửa lại theo ý hiểu của bạn: ${firstClause(profile.example, profile.topic)}.`,
    `Ngày 3: ôn phần dễ nhầm "${profile.studentClaim}" và tự làm câu này: ${profile.practiceQuestion}`,
    `Mẹo nhớ: phân biệt ${profile.topic} với ${profile.compareWith}.`,
  ].join('\n');

const buildSourceOutput = (profile, seed) =>
  [
    `${choice(SOURCE_OPENERS, seed)} ${profile.sourceAnswer.charAt(0).toLowerCase()}${profile.sourceAnswer.slice(1)}`,
    'Mình không thêm chi tiết ngoài phần nguồn đã xuất hiện trong câu hỏi.',
  ].join('\n');

const buildFallbackOutput = (profile, seed) =>
  [
    `${choice(FALLBACK_OPENERS, seed)} bạn chưa gửi ${profile.fallbackNeed}.`,
    `Bước tiếp theo phù hợp: gửi ${profile.fallbackNeed} hoặc nêu rõ bạn muốn mình kiểm tra phần nào.`,
    `Gợi ý chung về ${profile.topic}: ${profile.fallbackTip}`,
    `${choice(PRACTICE_LABELS, seed)}: ${profile.practiceQuestion}`,
  ].join('\n');

const buildPromptByCategory = (profile, category) => {
  switch (category) {
    case 'explain_concept':
      return `Giải thích ${profile.topic} cho người mới bằng ví dụ ngắn.`;
    case 'give_example':
      return `Cho mình một ví dụ ngắn về ${profile.topic} và nói vì sao ví dụ đó đúng.`;
    case 'compare_concepts':
      return `So sánh ${profile.topic} với ${profile.compareWith} thật ngắn, dễ hiểu.`;
    case 'correct_student_answer':
      return `Một bạn nói: "${profile.studentClaim}." Hãy sửa ngắn gọn.`;
    case 'generate_quiz':
      return `Tạo 2 câu quiz trắc nghiệm ngắn về ${profile.topic}.`;
    case 'generate_flashcards':
      return `Tạo 3 flashcard ngắn để học ${profile.topic}.`;
    case 'summarize_lesson':
      return `Tóm tắt thật ngắn bài học về ${profile.topic} thành vài ý chính.`;
    case 'study_plan':
      return `Lập kế hoạch học 3 ngày để ôn ${profile.topic} cho người ${profile.difficulty}.`;
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

const buildOutputByCategory = (profile, category, seed) => {
  switch (category) {
    case 'explain_concept':
      return buildExplainOutput(profile, seed);
    case 'give_example':
      return buildExampleOutput(profile, seed);
    case 'compare_concepts':
      return buildCompareOutput(profile, seed);
    case 'correct_student_answer':
      return buildCorrectionOutput(profile, seed);
    case 'generate_quiz':
      return buildQuizOutput(profile);
    case 'generate_flashcards':
      return buildFlashcardOutput(profile, seed);
    case 'summarize_lesson':
      return buildSummaryOutput(profile, seed);
    case 'study_plan':
      return buildStudyPlanOutput(profile, seed);
    case 'source_grounded_answer':
      return buildSourceOutput(profile, seed);
    case 'fallback_transparency':
      return buildFallbackOutput(profile, seed);
    default:
      throw new Error(`Unsupported category: ${category}`);
  }
};

export const buildExamplesFromProfiles = (profiles) =>
  profiles.flatMap((profile, profileIndex) =>
    V3_CATEGORIES.map((category, categoryIndex) => ({
      id: `v3-${CATEGORY_CODES[category]}-${profile.id}`,
      category,
      prompt: buildPromptByCategory(profile, category),
      output: buildOutputByCategory(profile, category, profileIndex + categoryIndex),
      difficulty: profile.difficulty,
      subject: profile.subject,
      status: 'approved',
      source: 'synthetic-curated-dev',
      version: 'v3',
    })),
  );
