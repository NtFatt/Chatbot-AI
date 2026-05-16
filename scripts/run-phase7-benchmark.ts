import { env } from '../apps/api/src/config/env';
import { prisma } from '../apps/api/src/config/prisma';
import { createApp } from '../apps/api/src/app';
import {
  HISTORICAL_COMPARISON,
  parseArgs,
  parseRunSummary,
  summarizePerCategory,
} from './run-phase7-benchmark.helpers';

const resolveCasePrefix = async (preferredPrefix?: string) => {
  if (preferredPrefix) {
    return preferredPrefix;
  }

  const prefixes = ['Phase 8 - ', 'Phase 7 - '];
  for (const prefix of prefixes) {
    const count = await prisma.evalCase.count({
      where: {
        name: {
          startsWith: prefix,
        },
      },
    });
    if (count > 0) {
      return prefix;
    }
  }

  return 'Phase 8 - ';
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const casePrefix = await resolveCasePrefix(options.casePrefix);
  const { services } = createApp();
  await prisma.$connect();

  try {
    const evalCases = await prisma.evalCase.findMany({
      where: {
        name: {
          startsWith: casePrefix,
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    if (evalCases.length === 0) {
      throw new Error(`No eval cases found with prefix "${casePrefix}"`);
    }

    const evalCaseIds = evalCases.map((item) => item.id);
    const targets = [
      {
        label: 'internal_l3_tutor',
        enabled: true,
        input: {
          provider: 'internal_l3_tutor' as const,
          evalCaseIds,
          notes: `${casePrefix.trim()} benchmark`,
        },
      },
      {
        label: 'local_lora',
        enabled: env.LOCAL_LORA_ENABLED,
        input: {
          provider: 'local_lora' as const,
          evalCaseIds,
          notes: `${casePrefix.trim()} benchmark`,
        },
      },
      {
        label: 'OPENAI',
        enabled: env.OPENAI_ENABLED && Boolean(env.OPENAI_API_KEY),
        input: {
          provider: 'OPENAI' as const,
          model: env.OPENAI_MODEL,
          evalCaseIds,
          notes: `${casePrefix.trim()} benchmark`,
        },
      },
      {
        label: 'GEMINI',
        enabled: env.GEMINI_ENABLED && Boolean(env.GEMINI_API_KEY),
        input: {
          provider: 'GEMINI' as const,
          model: env.GEMINI_MODEL,
          evalCaseIds,
          notes: `${casePrefix.trim()} benchmark`,
        },
      },
    ];

    const runs = [];
    for (const target of targets.filter((item) => item.enabled)) {
      const run = await services.evalsService.createRun(target.input);
      const summary = parseRunSummary(run.notes);
      runs.push({
        target: target.label,
        evalRunId: run.id,
        model: run.model,
        averageScore: run.averageScore,
        perCategoryScore: summarizePerCategory(run),
        averageLatencyMs: summary.avgLatencyMs,
        p50LatencyMs: summary.p50LatencyMs,
        p95LatencyMs: summary.p95LatencyMs,
        timeoutCount: summary.timeoutCount,
        fallbackCount: summary.fallbackCount,
        errorCount: summary.errorCount,
        notes: run.notes,
      });
    }

    const currentLocalLoraRun = runs.find((run) => run.target === 'local_lora');
    const internalRun = runs.find((run) => run.target === 'internal_l3_tutor');

    console.log(
      JSON.stringify(
        {
          evalCasePrefix: casePrefix,
          evalCaseCount: evalCases.length,
          evalCaseIds,
          historicalComparison: {
            ...HISTORICAL_COMPARISON,
            internalL3TutorCurrentAverageScore: internalRun?.averageScore ?? null,
            localLoraCurrentAverageScore: currentLocalLoraRun?.averageScore ?? null,
            localLoraDeltaVsV2:
              currentLocalLoraRun?.averageScore == null
                ? null
                : Number((currentLocalLoraRun.averageScore - HISTORICAL_COMPARISON.localLoraV2AverageScore).toFixed(2)),
          },
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
