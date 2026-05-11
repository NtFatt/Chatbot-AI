import fs from 'node:fs';
import path from 'node:path';

const API_PACKAGE_NAME = '@chatbot-ai/api';
const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', '.git'] as const;

const readPackageName = (directory: string) => {
  const packageJsonPath = path.join(directory, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      name?: string;
    };
    return packageJson.name ?? null;
  } catch {
    return null;
  }
};

const findAncestor = (startDirectory: string, predicate: (directory: string) => boolean) => {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (predicate(currentDirectory)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
};

export interface EnvPathResolution {
  apiRoot: string;
  apiEnvPath: string;
  workspaceRoot: string | null;
  rootEnvPath: string | null;
}

export const resolveEnvPaths = (moduleDirectory: string): EnvPathResolution => {
  const apiRoot =
    findAncestor(moduleDirectory, (directory) => readPackageName(directory) === API_PACKAGE_NAME) ??
    path.resolve(moduleDirectory, '..');
  const workspaceRoot = findAncestor(
    path.dirname(apiRoot),
    (directory) => WORKSPACE_MARKERS.some((marker) => fs.existsSync(path.join(directory, marker))),
  );

  return {
    apiRoot,
    apiEnvPath: path.join(apiRoot, '.env'),
    workspaceRoot,
    rootEnvPath: workspaceRoot ? path.join(workspaceRoot, '.env') : null,
  };
};
