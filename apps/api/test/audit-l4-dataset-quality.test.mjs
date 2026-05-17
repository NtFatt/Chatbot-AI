import { describe, expect, it } from 'vitest';

import {
  auditExamples,
  formatAuditReport,
} from '../../../scripts/audit-l4-dataset-quality.mjs';

describe('audit-l4-dataset-quality', () => {
  it('detects duplicate prompts', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Same prompt' }], idealResponse: 'Trả lời A bằng tiếng Việt đầy đủ.', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Same prompt' }], idealResponse: 'Trả lời B bằng tiếng Việt đầy đủ.', learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.duplicates).toBe(1);
  });

  it('detects empty prompt and empty output', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: '' }], idealResponse: 'Có nội dung tiếng Việt hợp lệ và đủ dài.', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Có prompt' }], idealResponse: '', learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.emptyPrompt).toBe(1);
    expect(result.emptyOutput).toBe(1);
  });

  it('detects fake citation patterns', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Hỏi gì đó' }], idealResponse: 'Theo Smith et al. thì đây là đáp án tiếng Việt đủ dài.', learningMode: 'explain_concept', sourceId: 'a' },
    ];
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.fakeCitations).toBe(1);
  });

  it('detects missing Vietnamese characters', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'question' }], idealResponse: 'This is an English only answer with enough length to trigger the language rule.', learningMode: 'explain_concept', sourceId: 'a' },
    ];
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.missingVietnamese).toBe(1);
  });

  it('detects too-short and too-long outputs', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Ngắn' }], idealResponse: 'Ngắn quá.', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Dài' }], idealResponse: 'Đáp án rất dài bằng tiếng Việt. '.repeat(80), learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.tooShort).toBe(1);
    expect(result.tooLong).toBe(1);
  });

  it('detects repeated boilerplate lines', () => {
    const repeated = 'Câu mở đầu giống hệt nhau và không thay đổi.';
    const examples = Array.from({ length: 5 }, (_, index) => ({
      status: 'approved',
      inputMessages: [{ content: `Câu hỏi ${index}` }],
      idealResponse: `${repeated}\nNhưng phần sau vẫn đủ dài và có tiếng Việt để không dính lỗi khác ${index}.`,
      learningMode: 'explain_concept',
      sourceId: `rep-${index}`,
    }));
    const result = auditExamples(examples, { version: 'v2' });
    expect(result.repeatedBoilerplate).toBe(5);
  });

  it('reports category distribution correctly for v3 thresholds', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'A' }], idealResponse: 'Trả lời đầy đủ bằng tiếng Việt cho ví dụ A và có thêm chi tiết.', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'B' }], idealResponse: 'Trả lời khác nhau bằng tiếng Việt cho ví dụ B và có thêm chi tiết.', learningMode: 'give_example', sourceId: 'b' },
    ];
    const result = auditExamples(examples, { version: 'v3' });
    expect(result.categoryCounts).toEqual({ explain_concept: 1, give_example: 1 });
    expect(result.v3MissingExpected.length).toBeGreaterThan(0);
  });

  it('marks readyForTraining as stronger_demo when 300 clean approved examples exist', () => {
    const categories = [
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
    const examples = categories.flatMap((category) =>
      Array.from({ length: 30 }, (_, index) => ({
        status: 'approved',
        inputMessages: [{ content: `Câu hỏi ${category} ${index}` }],
        idealResponse: `Đây là câu trả lời bằng tiếng Việt đủ dài cho ${category} số ${index}, có nội dung rõ ràng và hữu ích cho việc học.`,
        learningMode: category,
        sourceId: `${category}-${index}`,
      })),
    );
    const result = auditExamples(examples, { version: 'v3' });
    expect(result.readyForTraining).toBe('stronger_demo');
    expect(result.productionClaim).toBe('no');
  });

  it('marks readyForTraining as targeted_demo when the real v4 dataset is clean', async () => {
    const { buildCuratedTrainingExamples } = await import('../../../scripts/seed-l4-curated-training-data.mjs');
    const examples = buildCuratedTrainingExamples({ version: 'v4' });
    const result = auditExamples(examples, { version: 'v4' });

    expect(result.approved).toBe(180);
    expect(result.repeatedBoilerplate).toBe(0);
    expect(result.missingFailureModes).toHaveLength(0);
    expect(result.readyForTraining).toBe('targeted_demo');
    expect(result.failureModeCounts.too_generic).toBeGreaterThan(0);
  });

  it('formats a concise report', () => {
    const result = auditExamples(
      [
        { status: 'approved', inputMessages: [{ content: 'Test' }], idealResponse: 'Trả lời đầy đủ bằng tiếng Việt cho bài test này và có đủ độ dài.', learningMode: 'explain_concept', sourceId: 'a' },
      ],
      { version: 'v2' },
    );
    const report = formatAuditReport('Test Dataset', result);
    expect(report).toContain('Dataset: Test Dataset');
    expect(report).toContain('approved: 1');
    expect(report).toContain('duplicates: 0');
  });

  it('validates the real curated v3 dataset passes quality', async () => {
    const { buildCuratedTrainingExamples } = await import('../../../scripts/seed-l4-curated-training-data.mjs');
    const examples = buildCuratedTrainingExamples({ version: 'v3' });
    const result = auditExamples(examples, { version: 'v3' });
    expect(result.approved).toBe(300);
    expect(result.duplicates).toBe(0);
    expect(result.emptyPrompt).toBe(0);
    expect(result.emptyOutput).toBe(0);
    expect(result.fakeCitations).toBe(0);
    expect(result.missingVietnamese).toBe(0);
    expect(result.repeatedBoilerplate).toBe(0);
    expect(result.v3MissingExpected).toHaveLength(0);
    expect(result.readyForTraining).toBe('stronger_demo');
  });
});
