import { env } from '../apps/api/src/config/env';
import { prisma } from '../apps/api/src/config/prisma';
import { createApp } from '../apps/api/src/app';
import type { EvalRun } from '../packages/shared/src/types/evals';

const CASE_PREFIX = 'Phase 7 - ';

const parseRunSummary = (notes: string | null) => {
  const summary = {
    avgLatencyMs: 0,
    timeoutCount: 0,
    fallbackCount: 0,
    errorCount: 0,
  };

  const matches = notes?.match(/avgLatencyMs=(\d+); timeoutCount=(\d+); fallbackCount=(\d+); errorCount=(\d+)/i);
  if (!matches) {
    return summary;
  }

  return {
    avgLatencyMs: Number(matches[1] ?? 0),
    timeoutCount: Number(matches[2] ?? 0),
    fallbackCount: Number(matches[3] ?? 0),
    errorCount: Number(matches[4] ?? 0),
  };
};

const summarizePerCategory = (run: EvalRun) => {
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

async function main() {
  const { services } = createApp();
  await prisma.$connect();

  try {
    const evalCases = await prisma.evalCase.findMany({
      where: {
        name: {
          startsWith: CASE_PREFIX,
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    if (evalCases.length === 0) {
      throw new Error(`No eval cases found with prefix "${CASE_PREFIX}"`);
    }

    const evalCaseIds = evalCases.map((item) => item.id);
    const targets = [
      {
        label: 'internal_l3_tutor',
        enabled: true,
        input: {
          provider: 'internal_l3_tutor' as const,
          evalCaseIds,
          notes: 'Phase 7 benchmark',
        },
      },
      {
        label: 'local_lora',
        enabled: env.LOCAL_LORA_ENABLED,
        input: {
          provider: 'local_lora' as const,
          evalCaseIds,
          notes: 'Phase 7 benchmark',
        },
      },
      {
        label: 'GEMINI',
        enabled: env.GEMINI_ENABLED && Boolean(env.GEMINI_API_KEY),
        input: {
          provider: 'GEMINI' as const,
          model: env.GEMINI_MODEL,
          evalCaseIds,
          notes: 'Phase 7 benchmark',
        },
      },
    ];

    const runs = [];
    for (const target of targets.filter((item) => item.enabled)) {
      const run = await services.evalsService.createRun(target.input);
      runs.push({
        target: target.label,
        evalRunId: run.id,
        averageScore: run.averageScore,
        averageLatencyMs: parseRunSummary(run.notes).avgLatencyMs,
        timeoutCount: parseRunSummary(run.notes).timeoutCount,
        fallbackCount: parseRunSummary(run.notes).fallbackCount,
        errorCount: parseRunSummary(run.notes).errorCount,
        perCategoryScore: summarizePerCategory(run),
        notes: run.notes,
      });
    }

    console.log(
      JSON.stringify(
        {
          evalCaseCount: evalCases.length,
          evalCaseIds,
          runs,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
