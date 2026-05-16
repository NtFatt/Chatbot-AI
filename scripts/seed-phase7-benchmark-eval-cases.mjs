import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prisma = new PrismaClient();

export const PHASE7_EVAL_CASES = [
  {
    name: 'Phase 7 - Explain Concept - OOP Basics',
    description: 'Short beginner-friendly explanation of OOP in Java.',
    category: 'explain_concept',
    inputMessages: [{ role: 'user', content: 'Giải thích OOP trong Java bằng ví dụ ngắn.' }],
    idealResponse:
      'OOP là cách tổ chức chương trình quanh class và object. Ví dụ, class Dog có thuộc tính name và phương thức bark().',
    scoringNotes: 'Reward concise concept explanation plus a simple Java-flavored example.',
  },
  {
    name: 'Phase 7 - Give Example - Java Interface',
    description: 'Ask for one compact example of an interface in Java.',
    category: 'give_example',
    inputMessages: [{ role: 'user', content: 'Cho mình một ví dụ ngắn về interface trong Java.' }],
    idealResponse:
      'Ví dụ: interface Printable { void print(); } và class Report implements Printable { public void print() { System.out.println("In báo cáo"); } }.',
    scoringNotes: 'Reward a concrete Java example instead of a pure definition.',
  },
  {
    name: 'Phase 7 - Compare Concepts - Interface vs Abstract Class',
    description: 'Compare two related Java concepts briefly and clearly.',
    category: 'compare_concepts',
    inputMessages: [{ role: 'user', content: 'So sánh interface và abstract class trong Java thật ngắn.' }],
    idealResponse:
      'Interface mô tả hợp đồng hành vi; abstract class là lớp cơ sở có thể chứa cả logic chung và trạng thái. Interface linh hoạt hơn cho nhiều kiểu cài đặt.',
    scoringNotes: 'Reward direct comparison language and at least one concrete difference.',
  },
  {
    name: 'Phase 7 - Correct Student Answer - Inheritance',
    description: 'Correct a short student misconception about inheritance.',
    category: 'correct_student_answer',
    inputMessages: [
      {
        role: 'user',
        content:
          'Một bạn nói: "Kế thừa trong Java nghĩa là object con sao chép toàn bộ code của object cha." Hãy sửa ngắn gọn.',
      },
    ],
    idealResponse:
      'Câu đó chưa đúng. Kế thừa là class con nhận lại thuộc tính và phương thức từ class cha, không phải object con sao chép toàn bộ code.',
    scoringNotes: 'Reward explicit correction and the right class-based explanation.',
  },
  {
    name: 'Phase 7 - Generate Quiz - Constructors',
    description: 'Produce a short multiple-choice quiz about constructors.',
    category: 'generate_quiz',
    inputMessages: [{ role: 'user', content: 'Tạo 2 câu quiz trắc nghiệm ngắn về constructor trong Java.' }],
    idealResponse:
      'Câu 1 hỏi constructor dùng để làm gì, câu 2 hỏi khi nào constructor mặc định xuất hiện; mỗi câu có 4 lựa chọn và đáp án.',
    scoringNotes: 'Reward quiz structure with answer choices and an answer key.',
  },
  {
    name: 'Phase 7 - Generate Flashcards - Encapsulation',
    description: 'Create quick flashcards for a Java OOP concept.',
    category: 'generate_flashcards',
    inputMessages: [{ role: 'user', content: 'Tạo 3 flashcard ngắn để học tính đóng gói trong Java.' }],
    idealResponse:
      'Flashcard should pair a short term or question with a concise answer about encapsulation, private fields, and getters/setters.',
    scoringNotes: 'Reward clear flashcard formatting with compact term/definition pairs.',
  },
  {
    name: 'Phase 7 - Summarize Lesson - Collections',
    description: 'Summarize a short Java lesson into bullet points.',
    category: 'summarize_lesson',
    inputMessages: [
      {
        role: 'user',
        content:
          'Tóm tắt thật ngắn bài học về List, Set và Map trong Java thành vài ý chính.',
      },
    ],
    idealResponse:
      'List giữ thứ tự và cho phép trùng; Set không cho phần tử trùng; Map lưu dữ liệu theo cặp key-value.',
    scoringNotes: 'Reward bullet-style lesson summary with core distinctions.',
  },
  {
    name: 'Phase 7 - Study Plan - Java OOP Review',
    description: 'Generate a short study plan for revising Java OOP.',
    category: 'study_plan',
    inputMessages: [
      {
        role: 'user',
        content:
          'Lập kế hoạch học 3 ngày để ôn OOP Java cho người mới, mỗi ngày vài ý thật ngắn.',
      },
    ],
    idealResponse:
      'Day 1 review class/object and encapsulation, Day 2 inheritance and polymorphism, Day 3 interface, abstract class, and practice quiz.',
    scoringNotes: 'Reward day-by-day structure with realistic sequencing.',
  },
];

export async function seedPhase7BenchmarkEvalCases(client = prisma) {
  const results = [];

  for (const evalCase of PHASE7_EVAL_CASES) {
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

  console.log(JSON.stringify({ total: results.length, items: results }, null, 2));
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
