import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createInterface } from 'node:readline';

const rootCwd = process.cwd();
const forwardedArgs = process.argv.slice(2);

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

const spawnCommand = (args, env = process.env, label = null) => {
  const child = spawn(
    pnpmNeedsNode ? process.execPath : process.platform === 'win32' ? windowsCommandShell : pnpmExecPath,
    pnpmNeedsNode
      ? [pnpmExecPath, ...args]
      : process.platform === 'win32'
        ? ['/c', pnpmExecPath, ...args]
        : args,
    {
      cwd: rootCwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
      shell: false,
    },
  );

  if (label) {
    const prefix = (stream, color) => {
      const rl = createInterface({ input: stream });
      rl.on('line', (line) => {
        process.stdout.write(`${color}[${label}]\x1b[0m ${line}\n`);
      });
    };

    if (child.stdout) {
      prefix(child.stdout, '\x1b[36m');
    }

    if (child.stderr) {
      prefix(child.stderr, '\x1b[35m');
    }
  } else {
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  }

  return child;
};

const findOpenPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to resolve a free port for E2E tests.')));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });

const waitForUrl = async (url, timeoutMs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling until ready
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

let stackProcess = null;

const shutdownStack = () => {
  if (stackProcess && !stackProcess.killed) {
    try {
      stackProcess.kill('SIGTERM');
    } catch {
      // ignore cleanup edge cases
    }
  }
};

process.on('SIGINT', () => {
  shutdownStack();
  process.exit(130);
});

process.on('SIGTERM', () => {
  shutdownStack();
  process.exit(143);
});

const run = async () => {
  const [apiPort, webPort] = await Promise.all([findOpenPort(), findOpenPort()]);
  const webBaseUrl = `http://127.0.0.1:${webPort}`;
  const stackEnv = {
    ...process.env,
    E2E_API_PORT: String(apiPort),
    E2E_WEB_PORT: String(webPort),
  };

  stackProcess = spawn(process.execPath, ['scripts/e2e-stack.mjs'], {
    cwd: rootCwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: stackEnv,
  });

  if (stackProcess.stdout) {
    const rl = createInterface({ input: stackProcess.stdout });
    rl.on('line', (line) => {
      process.stdout.write(`\x1b[36m[stack]\x1b[0m ${line}\n`);
    });
  }

  if (stackProcess.stderr) {
    const rl = createInterface({ input: stackProcess.stderr });
    rl.on('line', (line) => {
      process.stdout.write(`\x1b[35m[stack]\x1b[0m ${line}\n`);
    });
  }

  stackProcess.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[stack] exited unexpectedly with code ${code}`);
    }
  });

  await waitForUrl(webBaseUrl, 120_000);

  const playwrightProcess = spawnCommand(
    ['exec', 'playwright', 'test', ...forwardedArgs],
    {
      ...process.env,
      PLAYWRIGHT_BASE_URL: webBaseUrl,
      E2E_API_PORT: String(apiPort),
      E2E_WEB_PORT: String(webPort),
    },
  );

  const exitCode = await new Promise((resolve) => {
    playwrightProcess.on('exit', (code) => resolve(code ?? 1));
    playwrightProcess.on('error', () => resolve(1));
  });

  shutdownStack();
  process.exit(exitCode);
};

void run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to run E2E suite.');
  shutdownStack();
  process.exit(1);
});
