import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, 'apps', 'api', '.env');
const envExamplePath = path.join(projectRoot, 'apps', 'api', '.env.example');

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
      const unquoted = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      acc[key] = unquoted;
      return acc;
    }, {});
};

const booleanish = (value, fallback = false) => {
  if (value == null || value === '') {
    return fallback;
  }

  return value === 'true';
};

const envFile = readEnvFile(fs.existsSync(envPath) ? envPath : envExamplePath);
const providers = [
  {
    key: 'GEMINI',
    enabled: booleanish(envFile.GEMINI_ENABLED, true),
    configured: Boolean((envFile.GEMINI_API_KEY ?? '').trim()),
    model: envFile.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  {
    key: 'OPENAI',
    enabled: booleanish(envFile.OPENAI_ENABLED, true),
    configured: Boolean((envFile.OPENAI_API_KEY ?? '').trim()),
    model: envFile.OPENAI_MODEL || 'gpt-5.4-mini',
  },
];

const configuredProviders = providers.filter((provider) => provider.enabled && provider.configured);
const localFallbackEnabled = booleanish(envFile.AI_LOCAL_FALLBACK_ENABLED, true);
const startupStrict = booleanish(envFile.AI_STARTUP_STRICT, false);

console.log('\nAI Doctor\n');
console.log(`- Env source: ${fs.existsSync(envPath) ? 'apps/api/.env' : 'apps/api/.env.example'}`);
console.log(`- Local fallback enabled: ${localFallbackEnabled ? 'yes' : 'no'}`);
console.log(`- Startup strict mode: ${startupStrict ? 'yes' : 'no'}`);
console.log('');

providers.forEach((provider) => {
  const status = !provider.enabled
    ? 'disabled'
    : provider.configured
      ? 'configured'
      : 'missing key';

  console.log(
    `- ${provider.key}: ${status} | model=${provider.model}`,
  );
});

try {
  const response = await fetch('http://localhost:4000/health');
  if (response.ok) {
    const payload = await response.json();
    const healthAi = payload?.data?.ai;
    console.log('');
    console.log(`- API /health: reachable`);
    if (healthAi) {
      console.log(`- Runtime AI mode: ${healthAi.mode}`);
      console.log(`- Runtime local fallback: ${healthAi.localFallbackEnabled ? 'yes' : 'no'}`);
      if (Array.isArray(healthAi.issues) && healthAi.issues.length > 0) {
        console.log('- Runtime issues:');
        healthAi.issues.forEach((issue) => {
          console.log(`  • [${issue.severity}] ${issue.code}${issue.provider ? ` (${issue.provider})` : ''}`);
        });
      }
    }
  } else {
    console.log('');
    console.log(`- API /health: unreachable (HTTP ${response.status})`);
  }
} catch {
  console.log('');
  console.log('- API /health: not reachable right now');
}

if (configuredProviders.length === 0) {
  console.log('');
  console.log('Result: no real AI provider is ready yet.');
  console.log('Action: add GEMINI_API_KEY and/or OPENAI_API_KEY to apps/api/.env, restart the API, then run pnpm ai:doctor again.');
  process.exitCode = 1;
} else {
  console.log('');
  console.log(`Result: ${configuredProviders.length} real AI provider(s) configured.`);
}
