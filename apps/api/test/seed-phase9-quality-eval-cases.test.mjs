import { describe, expect, it, vi } from 'vitest';

import {
  PHASE9_EVAL_CASES,
  seedPhase9QualityEvalCases,
} from '../../../scripts/seed-phase9-quality-eval-cases.mjs';

describe('seed-phase9-quality-eval-cases', () => {
  it('defines 30 eval cases with 3 cases per required category', () => {
    expect(PHASE9_EVAL_CASES).toHaveLength(30);

    const counts = PHASE9_EVAL_CASES.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    expect(Object.keys(counts)).toHaveLength(10);
    for (const count of Object.values(counts)) {
      expect(count).toBe(3);
    }
  });

  it('upserts eval cases deterministically', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: `id-${data.name}`, ...data }));
    const update = vi.fn();

    const results = await seedPhase9QualityEvalCases({
      evalCase: { findFirst, create, update },
    });

    expect(results).toHaveLength(30);
    expect(create).toHaveBeenCalledTimes(30);
    expect(update).not.toHaveBeenCalled();
  });
});
