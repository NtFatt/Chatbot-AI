import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { analyzeEvalFailures } from './local-lora-failure-analysis.mjs';

const prisma = new PrismaClient();

const parseArgs = (argv) => {
  const options = {
    model: '',
    runId: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--model') {
      options.model = argv[++index] ?? '';
    } else if (arg === '--run-id') {
      options.runId = argv[++index] ?? '';
    }
  }

  return options;
};

const loadRunById = async (runId) =>
  prisma.evalRun.findUnique({
    where: { id: runId },
    include: {
      results: {
        include: {
          evalCase: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

const loadLatestLocalRun = async (model) =>
  prisma.evalRun.findFirst({
    where: {
      provider: 'local_lora',
      ...(model ? { model } : {}),
    },
    include: {
      results: {
        include: {
          evalCase: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

const matchRunByCaseIds = async (provider, caseIds, excludeModel = '') => {
  const runs = await prisma.evalRun.findMany({
    where: {
      provider,
      ...(excludeModel ? { model: { not: excludeModel } } : {}),
    },
    include: {
      results: {
        include: {
          evalCase: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  const expected = [...caseIds].sort().join(',');
  return (
    runs.find((run) => run.results.map((result) => result.evalCaseId).sort().join(',') === expected) ?? null
  );
};

const summarizeFailureModes = (counts) =>
  Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([mode, count]) => `${mode}: ${count}`);

const formatCase = (item) => [
  `- ${item.name}`,
  `  category: ${item.category}`,
  `  score: ${item.localScore}`,
  `  latencyMs: ${item.localLatencyMs}`,
  `  failureModes: ${item.failureModes.join(', ')}`,
  `  prompt: ${item.prompt}`,
  `  expected: ${item.idealResponse}`,
  `  local_lora: ${item.localOutput}`,
  `  internal_l3_tutor: ${item.internalOutput ?? 'unavailable'}`,
].join('\n');

export async function runFailureAnalysis(options = {}) {
  const localRun = options.runId ? await loadRunById(options.runId) : await loadLatestLocalRun(options.model);
  if (!localRun) {
    throw new Error(`No local_lora eval run found${options.model ? ` for model ${options.model}` : ''}.`);
  }

  const caseIds = localRun.results.map((result) => result.evalCaseId);
  const internalRun = await matchRunByCaseIds('internal_l3_tutor', caseIds);
  const historicalV2Run = await matchRunByCaseIds('local_lora', caseIds, localRun.model);
  const analysis = analyzeEvalFailures({
    localRun,
    internalRun,
    historicalV2Run: historicalV2Run?.model === 'local-lora-tutor-v2' ? historicalV2Run : null,
  });

  const lines = [
    `Analyzed local run: ${localRun.id}`,
    `model: ${localRun.model}`,
    `averageScore: ${localRun.averageScore ?? 0}`,
    `internalComparisonRun: ${internalRun?.id ?? 'unavailable'}`,
    `historicalV2Run: ${historicalV2Run?.model === 'local-lora-tutor-v2' ? historicalV2Run.id : 'unavailable'}`,
    '',
    'Category ranking:',
    ...analysis.categoryRanking.map(
      (item, index) => `${index + 1}. ${item.category} | averageScore=${item.averageScore} | cases=${item.caseCount}`,
    ),
    '',
    'Top failure modes:',
    ...summarizeFailureModes(analysis.failureModeCounts).map((line) => `- ${line}`),
    '',
    'Top 10 worst cases:',
    ...analysis.topWorstCases.map((item) => formatCase(item)),
    '',
    'Recommended fixes:',
    ...analysis.recommendedFixes.map((item) => `- ${item}`),
  ];

  console.log(lines.join('\n'));
  return {
    localRunId: localRun.id,
    internalRunId: internalRun?.id ?? null,
    historicalV2RunId: historicalV2Run?.id ?? null,
    ...analysis,
  };
}

const runFromCli = async () => {
  try {
    await runFailureAnalysis(parseArgs(process.argv.slice(2)));
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
