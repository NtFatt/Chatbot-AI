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

const pnpmExecPath = candidatePnpmPaths.find((candidate) => candidate && existsSync(candidate)) ?? process.env.npm_execpath;

if (!pnpmExecPath) {
  console.error('Could not resolve pnpm executable from npm_execpath.');
  process.exit(1);
}

const processes = [
  {
    name: 'api',
    color: '\x1b[36m',
    args: [pnpmExecPath, '--filter', '@chatbot-ai/api', 'dev'],
  },
  {
    name: 'web',
    color: '\x1b[35m',
    args: [pnpmExecPath, '--filter', '@chatbot-ai/web', 'dev'],
  },
];

const reset = '\x1b[0m';
let shuttingDown = false;
let pending = processes.length;

const prefixOutput = (stream, name, color) => {
  const rl = createInterface({ input: stream });
  rl.on('line', (line) => {
    process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
  });
};

const children = processes.map(({ name, color, args }) => {
  const child = spawn(process.execPath, args, {
    cwd: rootCwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    shell: false,
  });

  if (child.stdout) {
    prefixOutput(child.stdout, name, color);
  }

  if (child.stderr) {
    prefixOutput(child.stderr, name, color);
  }

  child.on('exit', (code, signal) => {
    pending -= 1;

    if (!shuttingDown && (code ?? 0) !== 0) {
      shuttingDown = true;
      console.error(`${color}[${name}]${reset} exited unexpectedly with code ${code ?? 'null'}.`);
      children.forEach((candidate) => {
        if (candidate !== child && !candidate.killed) {
          candidate.kill('SIGTERM');
        }
      });
      process.exitCode = code ?? 1;
    }

    if (signal && !shuttingDown) {
      console.error(`${color}[${name}]${reset} exited due to signal ${signal}.`);
    }

    if (pending === 0) {
      process.exit(process.exitCode ?? 0);
    }
  });

  child.on('error', (error) => {
    if (!shuttingDown) {
      shuttingDown = true;
      console.error(`${color}[${name}]${reset} failed to start: ${error.message}`);
      children.forEach((candidate) => {
        if (candidate !== child && !candidate.killed) {
          candidate.kill('SIGTERM');
        }
      });
      process.exit(1);
    }
  });

  return child;
});

const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.exitCode = 0;
  console.log(`Stopping dev processes (${signal})...`);
  children.forEach((child) => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
