import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envCandidates = [
  path.join(projectRoot, 'apps', 'api', '.env'),
  path.join(projectRoot, 'apps', 'api', '.env.example'),
];

const readEnvFile = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return {};
  }

  return fs
    .readFileSync(targetPath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      acc[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      return acc;
    }, {});
};

const loadEnvDefaults = () => {
  for (const envPath of envCandidates) {
    const values = readEnvFile(envPath);
    for (const [key, value] of Object.entries(values)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
};

loadEnvDefaults();

export const LOCAL_LORA_RUNTIME_GROUP = ['local_lora', 'local_ollama'];
export const DEFAULT_LOCAL_LORA_MODEL = process.env.LOCAL_LORA_MODEL ?? 'local-lora-tutor-v1';

export const deriveLocalLoraDisplayName = (modelName = DEFAULT_LOCAL_LORA_MODEL) => {
  const normalized = modelName.trim();
  const versionMatch = normalized.match(/(?:^|[-_])v(\d+)$/i);

  if (versionMatch) {
    return `Local LoRA Tutor v${versionMatch[1]}`;
  }

  const words = normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return words.length > 0 ? words.join(' ') : 'Local LoRA Tutor';
};

export const buildAdapterPathForModel = (modelName = DEFAULT_LOCAL_LORA_MODEL) =>
  path.join('ml', 'adapters', modelName);

export const buildTrainingMetadataPathForAdapter = (adapterPath) =>
  path.join(adapterPath, 'training-metadata.json');

export const parseCliArgs = (args = process.argv.slice(2)) => {
  const options = {
    real: false,
    model: DEFAULT_LOCAL_LORA_MODEL,
    adapterPath: '',
    trainingMetadataPath: '',
    datasetId: null,
    datasetName: null,
    trainingExampleCount: null,
    validationExampleCount: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--real') {
      options.real = true;
    } else if (arg === '--model') {
      options.model = args[++index] ?? options.model;
    } else if (arg === '--adapter' || arg === '--adapter-path') {
      options.adapterPath = args[++index] ?? options.adapterPath;
    } else if (arg === '--training-metadata-path') {
      options.trainingMetadataPath = args[++index] ?? options.trainingMetadataPath;
    } else if (arg === '--dataset-id') {
      options.datasetId = args[++index] ?? null;
    } else if (arg === '--dataset-name') {
      options.datasetName = args[++index] ?? null;
    } else if (arg === '--training-example-count' || arg === '--dataset-example-count') {
      options.trainingExampleCount = Number(args[++index] ?? NaN);
    } else if (arg === '--validation-example-count') {
      options.validationExampleCount = Number(args[++index] ?? NaN);
    }
  }

  if (!options.adapterPath) {
    options.adapterPath = buildAdapterPathForModel(options.model);
  }
  if (!options.trainingMetadataPath) {
    options.trainingMetadataPath = buildTrainingMetadataPathForAdapter(options.adapterPath);
  }

  return options;
};

export const buildLocalLoraMetadata = (overrides = {}) => ({
  source: 'mock-local-lora-smoke',
  endpoint: process.env.LOCAL_LORA_BASE_URL ?? 'http://localhost:8008',
  note: 'Mock runtime validation only, not a real trained adapter',
  runtimeMode: 'learning_engine_l3',
  smokeValidated: false,
  ...overrides,
});

export const buildLocalLoraVersionInput = (overrides = {}) => {
  const fineTunedModel = overrides.fineTunedModel ?? DEFAULT_LOCAL_LORA_MODEL;

  return {
    name: overrides.name ?? deriveLocalLoraDisplayName(fineTunedModel),
    provider: 'local_lora',
    baseModel: 'local-lora-base',
    fineTunedModel,
    status: 'ready',
    isActive: true,
    metadata: buildLocalLoraMetadata(),
    ...overrides,
  };
};

export const readTrainingMetadata = (trainingMetadataPath) => {
  const resolvedPath = path.resolve(projectRoot, trainingMetadataPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Training metadata not found at ${resolvedPath}`);
  }

  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
};

export const buildRealLocalLoraVersionInput = (options = {}) => {
  const metadataPath =
    options.trainingMetadataPath ??
    buildTrainingMetadataPathForAdapter(options.adapterPath ?? buildAdapterPathForModel(options.model));
  const adapterPath = options.adapterPath ?? buildAdapterPathForModel(options.model);
  const trainingMetadata = options.trainingMetadata ?? readTrainingMetadata(metadataPath);

  if (trainingMetadata.isMockTraining) {
    throw new Error('Training metadata is marked as mock. Refusing to register it as a real Local LoRA adapter.');
  }

  const fineTunedModel =
    options.model ??
    trainingMetadata.fineTunedModel ??
    trainingMetadata.adapterName ??
    process.env.LOCAL_LORA_MODEL ??
    'local-lora-tutor-v1';

  return buildLocalLoraVersionInput({
    name: deriveLocalLoraDisplayName(fineTunedModel),
    baseModel: trainingMetadata.baseModel ?? 'unknown-base-model',
    fineTunedModel,
    metadata: buildLocalLoraMetadata({
      source: 'real-local-lora-training',
      note: 'Real Local LoRA adapter trained locally. Validate quality with browser smoke and eval benchmarks.',
      endpoint: process.env.LOCAL_LORA_BASE_URL ?? 'http://localhost:8008',
      adapterPath,
      trainingMetadataPath: metadataPath,
      datasetName: options.datasetName ?? trainingMetadata.datasetName ?? null,
      datasetId: options.datasetId ?? trainingMetadata.datasetId ?? null,
      trainingExampleCount:
        Number.isFinite(options.trainingExampleCount)
          ? options.trainingExampleCount
          : trainingMetadata.trainingExampleCount ?? null,
      validationExampleCount:
        Number.isFinite(options.validationExampleCount)
          ? options.validationExampleCount
          : trainingMetadata.validationExampleCount ?? null,
      targetedFailureModes: trainingMetadata.targetedFailureModes ?? [],
      isMockTraining: false,
      smokeValidated: false,
      runtimeMode: 'learning_engine_l3',
    }),
  });
};

export async function activateLocalLoraVersion(prisma, overrides = {}) {
  const input = buildLocalLoraVersionInput(overrides);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.modelVersion.findFirst({
      where: {
        provider: 'local_lora',
        OR: [{ fineTunedModel: input.fineTunedModel }, { name: input.name }],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const metadata =
      existing?.metadata && typeof existing.metadata === 'object'
        ? { ...existing.metadata, ...input.metadata }
        : input.metadata;

    const version = existing
      ? await tx.modelVersion.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            baseModel: input.baseModel,
            fineTunedModel: input.fineTunedModel,
            status: input.status,
            metadata,
          },
        })
      : await tx.modelVersion.create({
          data: {
            name: input.name,
            provider: 'local_lora',
            baseModel: input.baseModel,
            fineTunedModel: input.fineTunedModel ?? null,
            status: input.status,
            isActive: false,
            metadata,
          },
        });

    await tx.modelVersion.updateMany({
      where: {
        provider: { in: LOCAL_LORA_RUNTIME_GROUP },
        id: { not: version.id },
      },
      data: { isActive: false },
    });

    return tx.modelVersion.update({
      where: { id: version.id },
      data: { isActive: true },
    });
  });
}

export async function runRegister(prisma = new PrismaClient(), options = parseCliArgs()) {
  const version = await activateLocalLoraVersion(
    prisma,
    options.real
      ? buildRealLocalLoraVersionInput(options)
      : buildLocalLoraVersionInput({
          name: deriveLocalLoraDisplayName(options.model),
          fineTunedModel: options.model,
          metadata: buildLocalLoraMetadata({
            endpoint: process.env.LOCAL_LORA_BASE_URL ?? 'http://localhost:8008',
          }),
        }),
  );

  console.log(`Activated Local LoRA model version: ${version.id}`);
  console.log(
    JSON.stringify(
      {
        id: version.id,
        provider: version.provider,
        fineTunedModel: version.fineTunedModel,
        status: version.status,
        isActive: version.isActive,
      },
      null,
      2,
    ),
  );

  return version;
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    await runRegister(prisma, parseCliArgs(process.argv.slice(2)));
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    await prisma.$disconnect();
    process.exit(1);
  }
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await runFromCli();
}
