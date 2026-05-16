import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_CATEGORIES = [
  'explain_concept', 'give_example', 'compare_concepts', 'correct_student_answer',
  'generate_quiz', 'generate_flashcards', 'summarize_lesson', 'study_plan',
  'source_grounded_answer', 'fallback_transparency',
];

const FAKE_CITATION_PATTERNS = [
  /\(Smith et al\./i, /\(Nguyen et al\./i,
  /(?<![a-zA-Z0-9_\])])\[1\]/, /(?<![a-zA-Z0-9_\])])\[2\]/, /(?<![a-zA-Z0-9_\])])\[3\]/,
  /doi\.org/i, /arXiv/i, /ISBN/i, /\bpp\.\s*\d+/i,
];

const VIETNAMESE_PATTERN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function auditExamples(examples) {
  const issues = [];
  const prompts = new Set();
  let duplicates = 0;
  let emptyPrompts = 0;
  let emptyOutputs = 0;
  let tooShort = 0;
  let tooLong = 0;
  let missingVietnamese = 0;
  let fakeCitations = 0;
  const categoryCounts = {};

  for (const ex of examples) {
    const msgs = Array.isArray(ex.inputMessages) ? ex.inputMessages : [];
    const prompt = msgs.map((m) => m?.content || '').join(' ').trim();
    const output = (typeof ex.idealResponse === 'string' ? ex.idealResponse : '').trim();
    const cat = ex.learningMode || ex.topic || 'unknown';

    // Category count
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Duplicate prompts
    if (prompts.has(prompt)) {
      duplicates++;
      issues.push(`Duplicate prompt: "${prompt.slice(0, 60)}..."`);
    }
    prompts.add(prompt);

    // Empty checks
    if (!prompt) { emptyPrompts++; issues.push(`Empty prompt: sourceId=${ex.sourceId}`); }
    if (!output) { emptyOutputs++; issues.push(`Empty output: sourceId=${ex.sourceId}`); }

    // Length checks
    if (output && output.length < 30) { tooShort++; issues.push(`Too short output (${output.length} chars): sourceId=${ex.sourceId}`); }
    if (output && output.length > 3000) { tooLong++; issues.push(`Too long output (${output.length} chars): sourceId=${ex.sourceId}`); }

    // Vietnamese check
    if (output && !VIETNAMESE_PATTERN.test(output)) { missingVietnamese++; issues.push(`Missing Vietnamese: sourceId=${ex.sourceId}`); }

    // Fake citation check
    for (const pattern of FAKE_CITATION_PATTERNS) {
      if (pattern.test(output)) { fakeCitations++; issues.push(`Fake citation pattern in: sourceId=${ex.sourceId}`); break; }
    }
  }

  // Category imbalance check
  const missingCategories = EXPECTED_CATEGORIES.filter((c) => !categoryCounts[c]);
  const imbalanced = Object.values(categoryCounts).some((c) => c < 5);

  const approved = examples.filter((e) => e.status === 'approved').length;
  const valid = approved - duplicates - emptyPrompts - emptyOutputs;
  const readyForTraining = approved >= 100 && duplicates === 0 && emptyOutputs === 0 ? 'demo' : 'not_ready';

  return {
    total: examples.length,
    approved,
    valid: Math.max(0, valid),
    duplicates,
    emptyPrompts,
    emptyOutputs,
    tooShort,
    tooLong,
    missingVietnamese,
    fakeCitations,
    categoryCounts,
    missingCategories,
    categoryImbalanced: imbalanced,
    readyForTraining,
    issues,
    recommendedNextTarget: approved < 100 ? 100 : approved < 300 ? 300 : 500,
  };
}

export function formatAuditReport(datasetName, result) {
  const lines = [
    `Dataset: ${datasetName}`,
    `approved: ${result.approved}`,
    `valid: ${result.valid}`,
    `duplicates: ${result.duplicates}`,
    `emptyPrompts: ${result.emptyPrompts}`,
    `emptyOutputs: ${result.emptyOutputs}`,
    `tooShort: ${result.tooShort}`,
    `tooLong: ${result.tooLong}`,
    `missingVietnamese: ${result.missingVietnamese}`,
    `fakeCitations: ${result.fakeCitations}`,
    `categoryCoverage: ${result.missingCategories.length === 0 ? 'ok' : 'missing: ' + result.missingCategories.join(', ')}`,
    `categoryImbalanced: ${result.categoryImbalanced ? 'yes' : 'no'}`,
    `readyForTraining: ${result.readyForTraining}`,
    `recommendedNextTarget: ${result.recommendedNextTarget}`,
  ];
  if (Object.keys(result.categoryCounts).length > 0) {
    lines.push('--- Category Counts ---');
    for (const [cat, count] of Object.entries(result.categoryCounts).sort()) {
      lines.push(`  ${cat}: ${count}`);
    }
  }
  return lines.join('\n');
}

export async function runQualityAudit(prisma = new PrismaClient(), datasetName = null) {
  const where = datasetName ? { name: datasetName } : {};
  const datasets = await prisma.trainingDataset.findMany({
    where,
    include: {
      examples: {
        select: {
          id: true, sourceId: true, status: true, inputMessages: true,
          idealResponse: true, learningMode: true, topic: true, userLevel: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (datasets.length === 0) {
    console.log('No datasets found.');
    return { code: 1 };
  }

  let exitCode = 0;
  for (const ds of datasets) {
    const result = auditExamples(ds.examples);
    console.log(formatAuditReport(ds.name, result));
    console.log('');
    if (result.readyForTraining === 'not_ready') exitCode = 1;
  }
  return { code: exitCode };
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    const datasetName = process.argv.includes('--dataset')
      ? process.argv[process.argv.indexOf('--dataset') + 1]
      : null;
    const result = await runQualityAudit(prisma, datasetName);
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
