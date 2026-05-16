import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_CATEGORIES = [
  'explain_concept',
  'give_example',
  'compare_concepts',
  'correct_student_answer',
  'generate_quiz',
  'generate_flashcards',
  'summarize_lesson',
  'study_plan',
  'source_grounded_answer',
  'fallback_transparency',
];

const VIETNAMESE_PATTERN =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const FAKE_CITATION_PATTERNS = [
  /\bdoi\.org\b/i,
  /\barxiv\b/i,
  /\bisbn\b/i,
  /smith et al\./i,
  /nguyen et al\./i,
  /(^|\s)\[\d+\](?=\s|$)/,
];

const DEFAULT_LIMITS = {
  tooShortChars: 60,
  tooLongChars: 900,
};

const normalizeText = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizePrompt = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .map((message) => normalizeText(message?.content))
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const resolveDatasetVersion = (dataset) => {
  if (!dataset) {
    return 'unknown';
  }

  if (dataset.version >= 3 || /(?:^|\s)v3(?:\s|$)/i.test(dataset.name ?? '')) {
    return 'v3';
  }
  if (dataset.version === 2 || /(?:^|\s)v2(?:\s|$)/i.test(dataset.name ?? '')) {
    return 'v2';
  }

  const sourceIds = (dataset.examples ?? []).map((example) => example.sourceId ?? '').join(' ');
  if (/dev-curated-v3-/i.test(sourceIds)) {
    return 'v3';
  }
  if (/dev-curated-v2-/i.test(sourceIds)) {
    return 'v2';
  }
  return 'unknown';
};

const detectRepeatedBoilerplate = (outputs) => {
  const firstLineCounts = new Map();
  for (const output of outputs) {
    const firstLine = normalizeText(output.split(/\r?\n/)[0] ?? '');
    if (firstLine.length === 0) {
      continue;
    }
    firstLineCounts.set(firstLine, (firstLineCounts.get(firstLine) ?? 0) + 1);
  }

  let repeatedBoilerplate = 0;
  for (const output of outputs) {
    const firstLine = normalizeText(output.split(/\r?\n/)[0] ?? '');
    if (!firstLine) {
      continue;
    }
    const count = firstLineCounts.get(firstLine) ?? 0;
    if (count >= 5) {
      repeatedBoilerplate += 1;
    }
  }

  return repeatedBoilerplate;
};

export function auditExamples(examples, options = {}) {
  const version = String(options.version || 'unknown').toLowerCase();
  const limits = {
    tooShortChars: options.tooShortChars ?? DEFAULT_LIMITS.tooShortChars,
    tooLongChars: options.tooLongChars ?? DEFAULT_LIMITS.tooLongChars,
  };
  const issues = [];
  const seenPrompts = new Set();
  const categoryCounts = {};

  let approved = 0;
  let duplicates = 0;
  let emptyPrompt = 0;
  let emptyOutput = 0;
  let tooShort = 0;
  let tooLong = 0;
  let missingVietnamese = 0;
  let fakeCitations = 0;
  const outputs = [];

  for (const example of examples) {
    if (String(example.status ?? '').toLowerCase() === 'approved') {
      approved += 1;
    }

    const prompt = normalizePrompt(example.inputMessages);
    const rawOutput = typeof example.idealResponse === 'string' ? example.idealResponse.trim() : '';
    const output = normalizeText(example.idealResponse);
    const category = example.learningMode || example.topic || 'unknown';

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    outputs.push(rawOutput);

    if (!prompt) {
      emptyPrompt += 1;
      issues.push(`Empty prompt: sourceId=${example.sourceId ?? 'unknown'}`);
    }
    if (!output) {
      emptyOutput += 1;
      issues.push(`Empty output: sourceId=${example.sourceId ?? 'unknown'}`);
    }

    if (prompt) {
      if (seenPrompts.has(prompt)) {
        duplicates += 1;
        issues.push(`Duplicate prompt: "${prompt.slice(0, 80)}"`);
      } else {
        seenPrompts.add(prompt);
      }
    }

    if (output && output.length < limits.tooShortChars) {
      tooShort += 1;
      issues.push(`Too short output (${output.length} chars): sourceId=${example.sourceId ?? 'unknown'}`);
    }
    if (output && output.length > limits.tooLongChars) {
      tooLong += 1;
      issues.push(`Too long output (${output.length} chars): sourceId=${example.sourceId ?? 'unknown'}`);
    }
    if (output && !VIETNAMESE_PATTERN.test(output)) {
      missingVietnamese += 1;
      issues.push(`Missing Vietnamese: sourceId=${example.sourceId ?? 'unknown'}`);
    }
    if (output && FAKE_CITATION_PATTERNS.some((pattern) => pattern.test(output))) {
      fakeCitations += 1;
      issues.push(`Fake citation pattern: sourceId=${example.sourceId ?? 'unknown'}`);
    }
  }

  const repeatedBoilerplate = detectRepeatedBoilerplate(outputs);
  if (repeatedBoilerplate > 0) {
    issues.push(`Repeated boilerplate lines detected in ${repeatedBoilerplate} outputs.`);
  }

  const missingCategories = EXPECTED_CATEGORIES.filter((category) => !categoryCounts[category]);
  const v3CategoryShortfalls = Object.entries(categoryCounts)
    .filter(([category, count]) => EXPECTED_CATEGORIES.includes(category) && version === 'v3' && count < 30)
    .map(([category, count]) => ({ category, count }));
  const v3MissingExpected = version === 'v3'
    ? EXPECTED_CATEGORIES.filter((category) => (categoryCounts[category] ?? 0) < 30).map((category) => ({
        category,
        count: categoryCounts[category] ?? 0,
      }))
    : [];

  const blockingIssueCount =
    duplicates +
    emptyPrompt +
    emptyOutput +
    tooShort +
    tooLong +
    missingVietnamese +
    fakeCitations +
    repeatedBoilerplate;
  const valid = Math.max(0, approved - blockingIssueCount);

  let readyForTraining = 'pipeline_only';
  if (
    version === 'v3' &&
    approved >= 300 &&
    valid >= 300 &&
    missingCategories.length === 0 &&
    v3MissingExpected.length === 0
  ) {
    readyForTraining = 'stronger_demo';
  } else if (approved >= 100 && valid >= 100 && missingCategories.length === 0 && blockingIssueCount === 0) {
    readyForTraining = 'demo_ready';
  } else if (approved < 20 || valid < 20) {
    readyForTraining = 'not_ready';
  }

  return {
    version,
    total: examples.length,
    approved,
    valid,
    duplicates,
    emptyPrompt,
    emptyOutput,
    tooShort,
    tooLong,
    missingVietnamese,
    fakeCitations,
    repeatedBoilerplate,
    categoryCounts,
    missingCategories,
    v3CategoryShortfalls,
    v3MissingExpected,
    readyForTraining,
    productionClaim: 'no',
    issues,
  };
}

export function formatAuditReport(datasetName, result) {
  const categoryCoverage =
    result.version === 'v3'
      ? result.v3MissingExpected.length === 0
        ? 'ok'
        : `under_target: ${result.v3MissingExpected.map((item) => `${item.category}=${item.count}`).join(', ')}`
      : result.missingCategories.length === 0
        ? 'ok'
        : `missing: ${result.missingCategories.join(', ')}`;

  const lines = [
    `Dataset: ${datasetName}`,
    `approved: ${result.approved}`,
    `valid: ${result.valid}`,
    `duplicates: ${result.duplicates}`,
    `emptyPrompt: ${result.emptyPrompt}`,
    `emptyOutput: ${result.emptyOutput}`,
    `tooShort: ${result.tooShort}`,
    `tooLong: ${result.tooLong}`,
    `missingVietnamese: ${result.missingVietnamese}`,
    `fakeCitations: ${result.fakeCitations}`,
    `repeatedBoilerplate: ${result.repeatedBoilerplate}`,
    `categoryCoverage: ${categoryCoverage}`,
    `readyForTraining: ${result.readyForTraining}`,
    `productionClaim: ${result.productionClaim}`,
  ];

  if (Object.keys(result.categoryCounts).length > 0) {
    lines.push('--- Category Counts ---');
    for (const [category, count] of Object.entries(result.categoryCounts).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      lines.push(`  ${category}: ${count}`);
    }
  }

  return lines.join('\n');
}

const parseArgs = (argv) => {
  const options = {
    datasetId: '',
    datasetName: '',
    version: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dataset-id') {
      options.datasetId = argv[++index] || '';
    } else if (arg === '--dataset-name' || arg === '--dataset') {
      options.datasetName = argv[++index] || '';
    } else if (arg === '--version') {
      options.version = argv[++index] || '';
    }
  }

  return options;
};

export async function runQualityAudit(prisma = new PrismaClient(), options = {}) {
  const datasets = await prisma.trainingDataset.findMany({
    where: {
      ...(options.datasetId ? { id: options.datasetId } : {}),
      ...(options.datasetName ? { name: options.datasetName } : {}),
    },
    include: {
      examples: {
        select: {
          id: true,
          sourceId: true,
          status: true,
          inputMessages: true,
          idealResponse: true,
          learningMode: true,
          topic: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  const versionFilter = options.version ? String(options.version).toLowerCase() : '';
  const filteredDatasets =
    versionFilter.length === 0
      ? datasets
      : datasets.filter((dataset) => resolveDatasetVersion(dataset) === versionFilter);

  if (filteredDatasets.length === 0) {
    console.log('No matching datasets found.');
    return { code: 1, datasets: [] };
  }

  let exitCode = 0;
  const results = [];

  for (const dataset of filteredDatasets) {
    const resolvedVersion = versionFilter || resolveDatasetVersion(dataset);
    const result = auditExamples(dataset.examples, { version: resolvedVersion });
    console.log(formatAuditReport(dataset.name, result));
    console.log('');

    const versionGateFailed =
      resolvedVersion === 'v3' &&
      (result.approved < 300 || result.v3MissingExpected.length > 0 || result.readyForTraining !== 'stronger_demo');
    const generalGateFailed = result.readyForTraining === 'not_ready' || result.issues.length > 0;
    if (versionGateFailed || generalGateFailed) {
      exitCode = 1;
    }

    results.push({
      datasetId: dataset.id,
      datasetName: dataset.name,
      version: resolvedVersion,
      result,
    });
  }

  return { code: exitCode, datasets: results };
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runQualityAudit(prisma, options);
    await prisma.$disconnect();
    process.exit(result.code);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
