import type { EvalRun } from '../packages/shared/src/types/evals';

export const HISTORICAL_COMPARISON = {
  localLoraV1AverageScore: 0.03,
  localLoraV2AverageScore: 0.21,
};

export const parseArgs = (argv: string[]) => {
  const options = {
    casePrefix: '',
    localModelVersionIds: [] as string[],
    skipExternal: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--case-prefix') {
      options.casePrefix = argv[++index] ?? '';
    } else if (argv[index] === '--local-model-version-ids') {
      options.localModelVersionIds = (argv[++index] ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (argv[index] === '--skip-external') {
      options.skipExternal = true;
    }
  }

  return options;
};

export const parseRunSummary = (notes: string | null) => {
  const summary = {
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    timeoutCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    failureModes: {} as Record<string, number>,
  };

  const matches = notes?.match(
    /avgLatencyMs=(\d+); p50LatencyMs=(\d+); p95LatencyMs=(\d+); timeoutCount=(\d+); fallbackCount=(\d+); errorCount=(\d+)(?:; failureModes=([^|]+))?/i,
  );
  if (!matches) {
    return summary;
  }

  const failureModes = Object.fromEntries(
    String(matches[7] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== 'none')
      .map((item) => {
        const [failureMode, count] = item.split(':');
        return [failureMode, Number(count ?? 0)];
      }),
  );

  return {
    avgLatencyMs: Number(matches[1] ?? 0),
    p50LatencyMs: Number(matches[2] ?? 0),
    p95LatencyMs: Number(matches[3] ?? 0),
    timeoutCount: Number(matches[4] ?? 0),
    fallbackCount: Number(matches[5] ?? 0),
    errorCount: Number(matches[6] ?? 0),
    failureModes,
  };
};

export const summarizePerCategory = (run: EvalRun) => {
  const buckets = new Map<string, number[]>();

  for (const result of run.results) {
    const values = buckets.get(result.category) ?? [];
    values.push(result.score);
    buckets.set(result.category, values);
  }

  return Object.fromEntries(
    Array.from(buckets.entries()).map(([category, scores]) => [
      category,
      Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2)),
    ]),
  );
};
