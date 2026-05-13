import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

function printHelp() {
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

async function main() {
  const args = process.argv.slice(2);
  let datasetId = '';
  let outPath = '';
  let validationOut = '';
  let validationRatio = 0.1;
  let allowSmall = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dataset-id') datasetId = args[++i];
    else if (args[i] === '--out') outPath = args[++i];
    else if (args[i] === '--validation-out') validationOut = args[++i];
    else if (args[i] === '--validation-ratio') validationRatio = parseFloat(args[++i]);
    else if (args[i] === '--allow-small') allowSmall = true;
    else if (args[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  if (!datasetId || !outPath) {
    console.error('Error: --dataset-id and --out are required.');
    printHelp();
    process.exit(1);
  }

  const examples = await prisma.trainingExample.findMany({
    where: { datasetId, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  });

  if (examples.length < 20 && !allowSmall) {
    console.error(`Error: Dataset only has ${examples.length} approved examples. Need at least 20, or pass --allow-small.`);
    process.exit(1);
  }
  if (examples.length < 100) {
    console.warn(`Warning: Dataset has ${examples.length} approved examples. < 100 might not yield good results.`);
  }

  // Deterministic shuffle
  const shuffled = [...examples].sort((a, b) => {
    // using ids for deterministic sort
    return a.id.localeCompare(b.id);
  });

  const valCount = Math.floor(shuffled.length * validationRatio);
  const validationList = validationOut ? shuffled.slice(0, valCount) : [];
  const trainList = validationOut ? shuffled.slice(valCount) : shuffled;

  function convertToChatML(example) {
    const inputMsg = (example.inputMessages || []).map(msg => ({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : msg.role,
      content: msg.content
    }));

    if (!inputMsg.some(m => m.role === 'system')) {
      inputMsg.unshift({
        role: 'system',
        content: "Bạn là trợ lý học tập AI. Bạn sẽ giúp học sinh với bài tập một cách chính xác và cẩn thận."
      });
    }

    if (!example.idealResponse) {
      return null;
    }

    return {
      messages: [
        ...inputMsg,
        { role: 'assistant', content: example.idealResponse }
      ]
    };
  }

  function writeJsonl(list, filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
    let count = 0;
    for (const ex of list) {
      const chatML = convertToChatML(ex);
      if (chatML) {
        ws.write(JSON.stringify(chatML) + '\n');
        count++;
      }
    }
    ws.end();
    return count;
  }

  const trainCount = writeJsonl(trainList, outPath);
  console.log(`Exported ${trainCount} training examples to ${outPath}`);

  if (validationOut) {
    const valCountReal = writeJsonl(validationList, validationOut);
    console.log(`Exported ${valCountReal} validation examples to ${validationOut}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
