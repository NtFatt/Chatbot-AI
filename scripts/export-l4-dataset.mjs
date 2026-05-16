import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_SYSTEM_MESSAGE =
  'Bạn là trợ lý học tập AI. Bạn sẽ giúp học sinh với bài tập một cách chính xác và cẩn thận.';
export const MIN_APPROVED_EXAMPLES = 20;

export function printHelp() {
  console.log(`
Usage: node export-l4-dataset.mjs --dataset-id <id> [options]

Options:
  --dataset-id <id>        ID of the TrainingDataset
  --out <path>             Output path for training JSONL
  --validation-out <path>  Output path for validation JSONL
  --validation-ratio <r>   Ratio for validation split (0.0 to 1.0)
  --allow-small            Allow export even if < 20 examples
  `);
}

export function parseCliArgs(args) {
  let datasetId = '';
  let outPath = '';
  let validationOut = '';
  let validationRatio = 0.1;
  let allowSmall = false;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dataset-id') datasetId = args[++index] ?? '';
    else if (arg === '--out') outPath = args[++index] ?? '';
    else if (arg === '--validation-out') validationOut = args[++index] ?? '';
    else if (arg === '--validation-ratio') validationRatio = parseFloat(args[++index] ?? '');
    else if (arg === '--allow-small') allowSmall = true;
    else if (arg === '--help') help = true;
  }

  return {
    datasetId,
    outPath,
    validationOut,
    validationRatio,
    allowSmall,
    help,
  };
}

export const normalizeText = (value) =>
  typeof value === 'string' ? value.replace(/\u0000/g, '').trim() : '';

export const normalizeRole = (role) => {
  if (role === 'assistant' || role === 'model') {
    return 'assistant';
  }
  if (role === 'system') {
    return 'system';
  }
  return 'user';
};

export function convertExampleToHfChatRecord(example) {
  const normalizedMessages = Array.isArray(example.inputMessages)
    ? example.inputMessages
        .map((message) => ({
          role: normalizeRole(message?.role),
          content: normalizeText(message?.content),
        }))
        .filter((message) => message.content.length > 0)
    : [];

  const idealResponse = normalizeText(example.idealResponse);

  if (normalizedMessages.length === 0 || idealResponse.length === 0) {
    return null;
  }

  const messages = normalizedMessages.some((message) => message.role === 'system')
    ? normalizedMessages
    : [{ role: 'system', content: DEFAULT_SYSTEM_MESSAGE }, ...normalizedMessages];

  return {
    messages: [...messages, { role: 'assistant', content: idealResponse }],
  };
}

export function collectApprovedRecords(examples) {
  return examples
    .filter((example) => {
      if (typeof example.status !== 'string') {
        return true;
      }
      return example.status.toUpperCase() === 'APPROVED';
    })
    .map((example) => ({
      id: example.id,
      record: convertExampleToHfChatRecord(example),
    }))
    .filter((item) => item.record !== null)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => item.record);
}

export function enforceDatasetSize(exampleCount, allowSmall) {
  if (exampleCount < MIN_APPROVED_EXAMPLES && !allowSmall) {
    throw new Error(
      `Dataset only has ${exampleCount} exportable approved examples. Need at least ${MIN_APPROVED_EXAMPLES}, or pass --allow-small.`,
    );
  }
}

export function splitRecords(records, validationRatio = 0.1, includeValidation = false) {
  if (!includeValidation) {
    return {
      trainRecords: records,
      validationRecords: [],
    };
  }

  const validationCount = Math.floor(records.length * validationRatio);
  return {
    trainRecords: records.slice(validationCount),
    validationRecords: records.slice(0, validationCount),
  };
}

export function serializeRecordsToJsonl(records) {
  if (records.length === 0) {
    return '';
  }

  return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
}

export function writeJsonl(filePathValue, records) {
  fs.mkdirSync(path.dirname(filePathValue), { recursive: true });
  fs.writeFileSync(filePathValue, serializeRecordsToJsonl(records), 'utf8');
  return records.length;
}

export async function runExport(argv = process.argv.slice(2), prisma = new PrismaClient()) {
  const options = parseCliArgs(argv);

  if (options.help) {
    printHelp();
    return { code: 0, exportedTrainCount: 0, exportedValidationCount: 0 };
  }

  if (!options.datasetId || !options.outPath) {
    throw new Error('--dataset-id and --out are required.');
  }

  const examples = await prisma.trainingExample.findMany({
    where: { datasetId: options.datasetId, status: 'approved' },
    orderBy: { createdAt: 'asc' },
  });

  const exportableRecords = collectApprovedRecords(examples);
  enforceDatasetSize(exportableRecords.length, options.allowSmall);

  if (exportableRecords.length < 100) {
    console.warn(
      `Warning: Dataset has ${exportableRecords.length} exportable approved examples. < 100 might not yield good results.`,
    );
  }

  const { trainRecords, validationRecords } = splitRecords(
    exportableRecords,
    options.validationRatio,
    Boolean(options.validationOut),
  );

  const exportedTrainCount = writeJsonl(options.outPath, trainRecords);
  console.log(`Exported ${exportedTrainCount} training examples to ${options.outPath}`);

  let exportedValidationCount = 0;
  if (options.validationOut) {
    exportedValidationCount = writeJsonl(options.validationOut, validationRecords);
    console.log(
      `Exported ${exportedValidationCount} validation examples to ${options.validationOut}`,
    );
  }

  return {
    code: 0,
    exportedTrainCount,
    exportedValidationCount,
  };
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    await runExport(process.argv.slice(2), prisma);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    printHelp();
    await prisma.$disconnect();
    process.exit(1);
  }
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await runFromCli();
}
