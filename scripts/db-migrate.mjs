import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
const forwardedArgs = process.argv.slice(2);
const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

const prismaArgs = isInteractive
  ? ['exec', 'prisma', 'migrate', 'dev', ...forwardedArgs]
  : ['exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'];

if (!isInteractive && forwardedArgs.length > 0) {
  console.warn('Ignoring forwarded args for non-interactive db:migrate; running prisma migrate deploy instead.');
}

const command = pnpmNeedsNode
  ? process.execPath
  : process.platform === 'win32'
    ? windowsCommandShell
    : pnpmExecPath;
const args = pnpmNeedsNode
  ? [pnpmExecPath, ...prismaArgs]
  : process.platform === 'win32'
    ? ['/c', pnpmExecPath, ...prismaArgs]
    : prismaArgs;

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
