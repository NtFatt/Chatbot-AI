import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  MIN_APPROVED_EXAMPLES,
  convertExampleToHfChatRecord,
} from './export-l4-dataset.mjs';

export const MIN_RECOMMENDED_EXAMPLES = 100;

const normalizeStatus = (status) =>
  typeof status === 'string' ? status.toLowerCase() : 'draft';

const emptyInputCountForExample = (example) => {
  const messages = Array.isArray(example.inputMessages) ? example.inputMessages : [];
  const validMessages = messages.filter(
    (message) =>
      typeof message?.content === 'string' &&
      message.content.replace(/\u0000/g, '').trim().length > 0,
  );

  return validMessages.length === 0 ? 1 : 0;
};

const emptyIdealCountForExample = (example) =>
  typeof example.idealResponse === 'string' && example.idealResponse.replace(/\u0000/g, '').trim().length > 0
    ? 0
    : 1;

export const summarizeDataset = (dataset) => {
  const counts = {
    draft: 0,
    approved: 0,
    rejected: 0,
  };
  let emptyInput = 0;
  let emptyIdeal = 0;
  let validForExport = 0;

  for (const example of dataset.examples ?? []) {
    const status = normalizeStatus(example.status);
    if (status === 'approved' || status === 'rejected' || status === 'draft') {
      counts[status] += 1;
    }

    emptyInput += emptyInputCountForExample(example);
    emptyIdeal += emptyIdealCountForExample(example);

    if (status === 'approved' && convertExampleToHfChatRecord(example)) {
      validForExport += 1;
    }
  }

  return {
    id: dataset.id,
    name: dataset.name,
    totalExamples: dataset.examples?.length ?? 0,
    approved: counts.approved,
    rejected: counts.rejected,
    pending: counts.draft,
    emptyInput,
    emptyIdeal,
    validForExport,
    recommendedForTraining: validForExport >= MIN_APPROVED_EXAMPLES,
  };
};

export const selectRecommendedDataset = (summaries) =>
  [...summaries]
    .sort((left, right) => {
      if (right.validForExport !== left.validForExport) {
        return right.validForExport - left.validForExport;
      }
      return left.name.localeCompare(right.name);
    })
    .find((summary) => summary.validForExport > 0) ?? null;

export const formatSummaryBlock = (summary, recommendedId) => {
  const lines = [
    `Dataset: ${summary.name}`,
    `id: ${summary.id}`,
    `approved: ${summary.approved}`,
    `rejected: ${summary.rejected}`,
    `pending: ${summary.pending}`,
    `validForExport: ${summary.validForExport}`,
    `emptyInput: ${summary.emptyInput}`,
    `emptyIdealResponse: ${summary.emptyIdeal}`,
    `recommendedForTraining: ${summary.id === recommendedId ? 'yes' : 'no'}`,
  ];

  if (summary.validForExport < MIN_APPROVED_EXAMPLES) {
    lines.push(`warning: approved exportable examples below hard minimum (${MIN_APPROVED_EXAMPLES})`);
  } else if (summary.validForExport < MIN_RECOMMENDED_EXAMPLES) {
    lines.push(`warning: approved exportable examples below recommended demo threshold (${MIN_RECOMMENDED_EXAMPLES})`);
  }

  return lines.join('\n');
};

export async function runAudit(prisma = new PrismaClient()) {
  const datasets = await prisma.trainingDataset.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      examples: {
        select: {
          id: true,
          status: true,
          inputMessages: true,
          idealResponse: true,
        },
      },
    },
  });

  const summaries = datasets.map(summarizeDataset);
  const recommended = selectRecommendedDataset(summaries);

  if (summaries.length === 0) {
    console.log('No training datasets found.');
    console.log(`BLOCKED: need at least ${MIN_APPROVED_EXAMPLES} approved exportable examples for real adapter training.`);
    return {
      code: 1,
      summaries,
      recommendedDatasetId: null,
    };
  }

  for (const summary of summaries) {
    console.log(formatSummaryBlock(summary, recommended?.id ?? null));
    console.log('');
  }

  if (recommended) {
    console.log(`Recommended dataset id: ${recommended.id}`);
  } else {
    console.log('Recommended dataset id: none');
  }

  const code = !recommended || recommended.validForExport < MIN_APPROVED_EXAMPLES ? 1 : 0;
  return {
    code,
    summaries,
    recommendedDatasetId: recommended?.id ?? null,
  };
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    const result = await runAudit(prisma);
    await prisma.$disconnect();
    process.exit(result.code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
