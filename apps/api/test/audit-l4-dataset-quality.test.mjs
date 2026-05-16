import { describe, expect, it } from 'vitest';

import {
  auditExamples,
  formatAuditReport,
} from '../../../scripts/audit-l4-dataset-quality.mjs';

describe('audit-l4-dataset-quality', () => {
  it('detects duplicate prompts', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Same prompt' }], idealResponse: 'Trả lời A', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Same prompt' }], idealResponse: 'Trả lời B', learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples);
    expect(result.duplicates).toBe(1);
  });

  it('detects empty prompt and empty output', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: '' }], idealResponse: 'Có nội dung', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Có prompt' }], idealResponse: '', learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples);
    expect(result.emptyPrompts).toBe(1);
    expect(result.emptyOutputs).toBe(1);
  });

  it('detects fake citation patterns', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Hỏi gì đó' }], idealResponse: 'Theo (Smith et al. 2020), đây là đáp án.', learningMode: 'explain_concept', sourceId: 'a' },
    ];
    const result = auditExamples(examples);
    expect(result.fakeCitations).toBe(1);
  });

  it('detects missing Vietnamese characters', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'question' }], idealResponse: 'This is an English-only answer with no Vietnamese chars.', learningMode: 'explain_concept', sourceId: 'a' },
    ];
    const result = auditExamples(examples);
    expect(result.missingVietnamese).toBe(1);
  });

  it('detects too-short and too-long outputs', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'Ngắn' }], idealResponse: 'Ngắn quá', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'Dài' }], idealResponse: 'Đáp án rất dài. '.repeat(250), learningMode: 'explain_concept', sourceId: 'b' },
    ];
    const result = auditExamples(examples);
    expect(result.tooShort).toBe(1);
    expect(result.tooLong).toBe(1);
  });

  it('reports category distribution correctly', () => {
    const examples = [
      { status: 'approved', inputMessages: [{ content: 'A' }], idealResponse: 'Trả lời đầy đủ bằng tiếng Việt.', learningMode: 'explain_concept', sourceId: 'a' },
      { status: 'approved', inputMessages: [{ content: 'B' }], idealResponse: 'Trả lời khác nhau bằng tiếng Việt.', learningMode: 'give_example', sourceId: 'b' },
    ];
    const result = auditExamples(examples);
    expect(result.categoryCounts).toEqual({ explain_concept: 1, give_example: 1 });
    expect(result.missingCategories.length).toBeGreaterThan(0);
  });

  it('marks readyForTraining as demo when 100+ approved with no issues', () => {
    const examples = Array.from({ length: 100 }, (_, i) => ({
      status: 'approved',
      inputMessages: [{ content: `Câu hỏi số ${i}` }],
      idealResponse: `Trả lời đầy đủ cho câu hỏi số ${i} bằng tiếng Việt với nội dung hữu ích.`,
      learningMode: 'explain_concept',
      sourceId: `ex-${i}`,
    }));
    const result = auditExamples(examples);
    expect(result.readyForTraining).toBe('demo');
  });

  it('formats a concise report', () => {
    const result = auditExamples([
      { status: 'approved', inputMessages: [{ content: 'Test' }], idealResponse: 'Trả lời đầy đủ bằng tiếng Việt.', learningMode: 'explain_concept', sourceId: 'a' },
    ]);
    const report = formatAuditReport('Test Dataset', result);
    expect(report).toContain('Dataset: Test Dataset');
    expect(report).toContain('approved: 1');
    expect(report).toContain('duplicates: 0');
  });

  it('validates the real curated v2 dataset passes quality', async () => {
    const { buildCuratedTrainingExamples } = await import('../../../scripts/seed-l4-curated-training-data.mjs');
    const examples = buildCuratedTrainingExamples();
    const result = auditExamples(examples);
    expect(result.approved).toBe(100);
    expect(result.duplicates).toBe(0);
    expect(result.emptyPrompts).toBe(0);
    expect(result.emptyOutputs).toBe(0);
    expect(result.fakeCitations).toBe(0);
    expect(result.missingVietnamese).toBe(0);
    expect(result.missingCategories).toHaveLength(0);
    expect(result.readyForTraining).toBe('demo');
  });
});
