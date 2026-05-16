import { describe, expect, it } from 'vitest';

import {
  HISTORICAL_COMPARISON,
  parseArgs,
  parseRunSummary,
  summarizePerCategory,
} from '../../../scripts/run-phase7-benchmark.helpers';

describe('run-phase7-benchmark script helpers', () => {
  it('parses benchmark summary notes with p50 and p95 latency fields', () => {
    expect(
      parseRunSummary(
        'Phase 8 benchmark | avgLatencyMs=24000; p50LatencyMs=22000; p95LatencyMs=31000; timeoutCount=0; fallbackCount=1; errorCount=2',
      ),
    ).toEqual({
      avgLatencyMs: 24000,
      p50LatencyMs: 22000,
      p95LatencyMs: 31000,
      timeoutCount: 0,
      fallbackCount: 1,
      errorCount: 2,
    });
  });

  it('keeps historical v1 and v2 comparisons available for reporting', () => {
    expect(HISTORICAL_COMPARISON).toEqual({
      localLoraV1AverageScore: 0.03,
      localLoraV2AverageScore: 0.21,
    });
  });

  it('groups per-category averages deterministically', () => {
    const summary = summarizePerCategory({
      id: 'run-1',
      provider: 'local_lora',
      model: 'local-lora-tutor-v3',
      modelVersionId: null,
      averageScore: 0.5,
      notes: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      results: [
        {
          id: 'r1',
          runId: 'run-1',
          evalCaseId: 'c1',
          evalCaseName: 'Case 1',
          category: 'explain_concept',
          output: 'A',
          score: 0.6,
          notes: null,
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'r2',
          runId: 'run-1',
          evalCaseId: 'c2',
          evalCaseName: 'Case 2',
          category: 'explain_concept',
          output: 'B',
          score: 0.8,
          notes: null,
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'r3',
          runId: 'run-1',
          evalCaseId: 'c3',
          evalCaseName: 'Case 3',
          category: 'study_plan',
          output: 'C',
          score: 0.4,
          notes: null,
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    });

    expect(summary).toEqual({
      explain_concept: 0.7,
      study_plan: 0.4,
    });
  });

  it('accepts an explicit case prefix argument', () => {
    expect(parseArgs(['--case-prefix', 'Phase 8 - '])).toEqual({
      casePrefix: 'Phase 8 - ',
    });
  });
});
