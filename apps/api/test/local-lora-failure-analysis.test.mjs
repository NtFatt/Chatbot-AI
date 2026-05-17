import { describe, expect, it } from 'vitest';

import {
  analyzeEvalFailures,
  detectFailureModes,
} from '../../../scripts/local-lora-failure-analysis.mjs';

describe('local-lora-failure-analysis', () => {
  it('classifies format and language failures for weak local outputs', () => {
    const failureModes = detectFailureModes({
      category: 'generate_quiz',
      prompt: 'Tạo 2 câu quiz trắc nghiệm ngắn về JOIN trong SQL.',
      idealResponse: 'Câu 1 ... Đáp án: B',
      output: '```sql\nSELECT * FROM a JOIN b ON a.id = b.id;\n```',
      latencyMs: 7500,
    });

    expect(failureModes).toContain('incomplete_quiz');
    expect(failureModes).toContain('missed_task');
  });

  it('summarizes category rankings and recommended fixes from paired runs', () => {
    const analysis = analyzeEvalFailures({
      localRun: {
        results: [
          {
            evalCaseId: 'c1',
            score: 0.1,
            notes: 'Latency: 7200ms.',
            output: 'OOP Java bằng ví dụ ngắn.',
            evalCase: {
              id: 'c1',
              name: 'Explain Concept',
              category: 'explain_concept',
              inputMessages: [{ role: 'user', content: 'Giải thích tính đóng gói trong Java.' }],
              idealResponse: 'Đóng gói là...',
              scoringNotes: null,
            },
          },
        ],
      },
      internalRun: {
        results: [
          {
            evalCaseId: 'c1',
            score: 0.6,
            output: '## Giải thích cốt lõi...',
          },
        ],
      },
      historicalV2Run: null,
    });

    expect(analysis.categoryRanking[0]?.category).toBe('explain_concept');
    expect(analysis.topWorstCases[0]?.failureModes.length).toBeGreaterThan(0);
    expect(analysis.recommendedFixes.length).toBeGreaterThan(0);
  });
});
