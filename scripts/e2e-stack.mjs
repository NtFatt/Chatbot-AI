import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const rootCwd = process.cwd();
const candidatePnpmPaths = [
  process.env.npm_execpath,
  process.env.PNPM_SCRIPT_SRC_DIR ? path.join(process.env.PNPM_SCRIPT_SRC_DIR, 'pnpm.cjs') : null,
  process.env.PNPM_HOME ? path.join(process.env.PNPM_HOME, 'pnpm.cjs') : null,
  process.env.PNPM_HOME ? path.join(process.env.PNPM_HOME, 'pnpm') : null,
].filter(Boolean);

const resolvedPnpmPath = candidatePnpmPaths.find((candidate) => candidate && existsSync(candidate));
const pnpmExecPath = resolvedPnpmPath ?? (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm');
const pnpmNeedsNode = pnpmExecPath.endsWith('.cjs') || pnpmExecPath.endsWith('.js');
const windowsCommandShell = process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe';
const apiPort = process.env.E2E_API_PORT ?? '4100';
const webPort = process.env.E2E_WEB_PORT ?? '4173';
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

const processes = [];
let shuttingDown = false;

const prefixOutput = (stream, name, color) => {
  const rl = createInterface({ input: stream });
  rl.on('line', (line) => {
    process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
  });
};

const spawnPnpmProcess = ({ name, color, pnpmArgs, env }) => {
  const child = spawn(
    pnpmNeedsNode ? process.execPath : process.platform === 'win32' ? windowsCommandShell : pnpmExecPath,
    pnpmNeedsNode
      ? [pnpmExecPath, ...pnpmArgs]
      : process.platform === 'win32'
        ? ['/c', pnpmExecPath, ...pnpmArgs]
        : pnpmArgs,
    {
      cwd: rootCwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      shell: false,
    },
  );

  if (child.stdout) {
    prefixOutput(child.stdout, name, color);
  }

  if (child.stderr) {
    prefixOutput(child.stderr, name, color);
  }

  child.on('exit', (code, signal) => {
    if (!shuttingDown && (code ?? 0) !== 0) {
      console.error(`${color}[${name}]\x1b[0m exited unexpectedly with code ${code ?? 'null'}.`);
      shutdown(signal ?? `exit:${code ?? 'null'}`);
      process.exitCode = code ?? 1;
    }
  });

  child.on('error', (error) => {
    if (!shuttingDown) {
      console.error(`${color}[${name}]\x1b[0m failed to start: ${error.message}`);
      shutdown('spawn-error');
      process.exitCode = 1;
    }
  });

  processes.push(child);
  return child;
};

const waitForUrl = async (url, timeoutMs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore until timeout
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Stopping E2E stack (${signal})...`);
  processes.forEach((child) => {
    if (!child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore shutdown edge cases
      }
    }
  });

  setTimeout(() => {
    process.exit(process.exitCode ?? 0);
  }, 250).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const bootstrap = async () => {
  spawnPnpmProcess({
    name: 'api',
    color: '\x1b[36m',
    pnpmArgs: ['--filter', '@chatbot-ai/api', 'dev'],
    env: {
      ...process.env,
      PORT: apiPort,
    },
  });

  await waitForUrl(`${apiBaseUrl}/health`, 120_000);

  spawnPnpmProcess({
    name: 'web',
    color: '\x1b[35m',
    pnpmArgs: [
      '--filter',
      '@chatbot-ai/web',
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      webPort,
      '--strictPort',
    ],
    env: {
      ...process.env,
      VITE_API_URL: apiBaseUrl,
      VITE_SOCKET_URL: apiBaseUrl,
    },
  });

  await waitForUrl(webBaseUrl, 120_000);
};

void bootstrap().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to bootstrap E2E stack.');
  shutdown('bootstrap-failed');
  process.exit(1);
});
