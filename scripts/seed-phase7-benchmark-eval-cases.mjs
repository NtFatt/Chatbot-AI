import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prisma = new PrismaClient();
const CASE_PREFIX = 'Phase 8 - ';

export const PHASE8_EVAL_CASES = [
  {
    name: `${CASE_PREFIX}Explain Concept - Encapsulation`,
    description: 'Short Vietnamese explanation of Java encapsulation.',
    category: 'explain_concept',
    inputMessages: [{ role: 'user', content: 'Giải thích tính đóng gói trong OOP Java bằng ví dụ ngắn.' }],
    idealResponse:
      'Đóng gói là giấu dữ liệu nội bộ và chỉ cho truy cập qua phương thức phù hợp. Ví dụ, balance là private và chỉ đổi qua deposit().',
    scoringNotes: 'Reward concise definition plus a concrete Java example.',
  },
  {
    name: `${CASE_PREFIX}Give Example - Python Dictionary`,
    description: 'One compact dictionary example with explanation.',
    category: 'give_example',
    inputMessages: [{ role: 'user', content: 'Cho mình một ví dụ ngắn về dictionary trong Python.' }],
    idealResponse:
      'Ví dụ: student = {"name": "Lan", "age": 19}. Dictionary lưu theo key-value nên có thể lấy student["name"] để đọc tên.',
    scoringNotes: 'Reward a short example and why it fits the concept.',
  },
  {
    name: `${CASE_PREFIX}Compare Concepts - GET vs POST`,
    description: 'Compare two HTTP methods briefly.',
    category: 'compare_concepts',
    inputMessages: [{ role: 'user', content: 'So sánh GET và POST thật ngắn, dễ hiểu.' }],
    idealResponse:
      'GET chủ yếu để lấy dữ liệu, còn POST chủ yếu để gửi dữ liệu tạo hoặc xử lý tài nguyên. GET thường lộ tham số trên URL, POST đặt dữ liệu trong body.',
    scoringNotes: 'Reward direct comparison language and at least one concrete difference.',
  },
  {
    name: `${CASE_PREFIX}Correct Student Answer - Binary Search`,
    description: 'Correct a misconception about binary search.',
    category: 'correct_student_answer',
    inputMessages: [
      {
        role: 'user',
        content: 'Một bạn nói: "Mảng chưa sắp xếp vẫn tìm kiếm nhị phân được nếu chọn điểm giữa hợp lý." Hãy sửa ngắn gọn.',
      },
    ],
    idealResponse:
      'Câu đó chưa đúng. Tìm kiếm nhị phân cần dữ liệu đã sắp xếp, nếu chưa có thứ tự thì việc bỏ nửa mảng sẽ không còn đáng tin.',
    scoringNotes: 'Reward explicit correction and the sorted-data requirement.',
  },
  {
    name: `${CASE_PREFIX}Generate Quiz - SQL JOIN`,
    description: 'Create a very short multiple-choice quiz.',
    category: 'generate_quiz',
    inputMessages: [{ role: 'user', content: 'Tạo 2 câu quiz trắc nghiệm ngắn về JOIN trong SQL.' }],
    idealResponse:
      'Quiz nên có 2 câu, mỗi câu có 4 lựa chọn A-D và đáp án, tập trung vào ý nghĩa của JOIN và khác biệt giữa INNER JOIN với LEFT JOIN.',
    scoringNotes: 'Reward quiz structure, answer choices, and an answer key.',
  },
  {
    name: `${CASE_PREFIX}Generate Flashcards - Stack`,
    description: 'Create 3 short study flashcards.',
    category: 'generate_flashcards',
    inputMessages: [{ role: 'user', content: 'Tạo 3 flashcard ngắn để học cấu trúc stack.' }],
    idealResponse:
      'Flashcards nên nhắc đến LIFO, ví dụ undo, và lỗi dễ nhầm giữa stack với queue.',
    scoringNotes: 'Reward clear flashcard formatting with short question-answer pairs.',
  },
  {
    name: `${CASE_PREFIX}Summarize Lesson - Big O`,
    description: 'Summarize a short algorithm lesson into a few bullets.',
    category: 'summarize_lesson',
    inputMessages: [{ role: 'user', content: 'Tóm tắt thật ngắn bài Big O thành vài ý chính.' }],
    idealResponse:
      'Big O mô tả tốc độ tăng trưởng khi dữ liệu lớn dần. O(log n) thường mở rộng tốt hơn O(n), và Big O không thay thế hoàn toàn thời gian đo thực tế.',
    scoringNotes: 'Reward compact summary bullets and growth-rate framing.',
  },
  {
    name: `${CASE_PREFIX}Study Plan - Overfitting`,
    description: 'Three-day plan for reviewing one ML concept.',
    category: 'study_plan',
    inputMessages: [{ role: 'user', content: 'Lập kế hoạch học 3 ngày để ôn khái niệm overfitting.' }],
    idealResponse:
      'Ngày 1 hiểu định nghĩa và dấu hiệu train/validation lệch nhau. Ngày 2 xem ví dụ overfitting và regularization. Ngày 3 tự đọc learning curve và trả lời câu hỏi kiểm tra.',
    scoringNotes: 'Reward day-by-day sequencing with realistic review steps.',
  },
  {
    name: `${CASE_PREFIX}Source Grounded - Provided Snippet`,
    description: 'Answer only from a supplied snippet.',
    category: 'source_grounded_answer',
    inputMessages: [
      {
        role: 'user',
        content:
          'Chỉ dựa vào đoạn sau để trả lời.\nĐoạn nguồn: "Indexes speed up data retrieval but add overhead to writes."\nCâu hỏi: Theo đoạn trên, trade-off chính của index là gì?',
      },
    ],
    idealResponse:
      'Theo đoạn đã cho, index giúp đọc dữ liệu nhanh hơn nhưng làm thao tác ghi tốn thêm chi phí.',
    scoringNotes: 'Reward staying within the given snippet and naming both sides of the trade-off.',
  },
  {
    name: `${CASE_PREFIX}Fallback Transparency - Missing Context`,
    description: 'The assistant should refuse to guess and ask for the missing artifact.',
    category: 'fallback_transparency',
    inputMessages: [
      {
        role: 'user',
        content:
          'Mình chưa gửi code class Java nhưng bạn hãy kết luận ngay lỗi đóng gói nằm ở đâu.',
      },
    ],
    idealResponse:
      'Mình chưa thể kết luận chính xác vì bạn chưa gửi code. Bạn hãy gửi class hoặc phần thuộc tính/phương thức liên quan, rồi mình sẽ chỉ rõ lỗi đóng gói.',
    scoringNotes: 'Reward honest limitation handling and a concrete next step.',
  },
];

export async function seedPhase7BenchmarkEvalCases(client = prisma) {
  const results = [];

  for (const evalCase of PHASE8_EVAL_CASES) {
    const existing = await client.evalCase.findFirst({
      where: { name: evalCase.name },
      orderBy: { updatedAt: 'desc' },
    });

    const saved = existing
      ? await client.evalCase.update({
          where: { id: existing.id },
          data: {
            description: evalCase.description,
            category: evalCase.category,
            inputMessages: JSON.parse(JSON.stringify(evalCase.inputMessages)),
            idealResponse: evalCase.idealResponse,
            scoringNotes: evalCase.scoringNotes,
          },
        })
      : await client.evalCase.create({
          data: {
            name: evalCase.name,
            description: evalCase.description,
            category: evalCase.category,
            inputMessages: JSON.parse(JSON.stringify(evalCase.inputMessages)),
            idealResponse: evalCase.idealResponse,
            scoringNotes: evalCase.scoringNotes,
          },
        });

    results.push({
      id: saved.id,
      name: saved.name,
      category: saved.category,
      action: existing ? 'updated' : 'created',
    });
  }

  console.log(JSON.stringify({ total: results.length, prefix: CASE_PREFIX, items: results }, null, 2));
  return results;
}

const runFromCli = async () => {
  try {
    await seedPhase7BenchmarkEvalCases(prisma);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
