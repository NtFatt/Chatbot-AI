import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveEnvPaths } from '../src/config/env-paths';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('resolveEnvPaths', () => {
  it('finds the API env files from the source config directory', () => {
    const resolution = resolveEnvPaths(path.join(workspaceRoot, 'apps', 'api', 'src', 'config'));

    expect(resolution.apiRoot).toBe(path.join(workspaceRoot, 'apps', 'api'));
    expect(resolution.apiEnvPath).toBe(path.join(workspaceRoot, 'apps', 'api', '.env'));
    expect(resolution.workspaceRoot).toBe(workspaceRoot);
    expect(resolution.rootEnvPath).toBe(path.join(workspaceRoot, '.env'));
  });

  it('finds the API env files from the bundled dist directory', () => {
    const resolution = resolveEnvPaths(path.join(workspaceRoot, 'apps', 'api', 'dist'));

    expect(resolution.apiRoot).toBe(path.join(workspaceRoot, 'apps', 'api'));
    expect(resolution.apiEnvPath).toBe(path.join(workspaceRoot, 'apps', 'api', '.env'));
    expect(resolution.workspaceRoot).toBe(workspaceRoot);
    expect(resolution.rootEnvPath).toBe(path.join(workspaceRoot, '.env'));
  });
});
