import type { ProviderHealthState, ProviderKey } from '@chatbot-ai/shared';

import { env } from '../../config/env';

interface ProviderHealthRuntime {
  provider: ProviderKey;
  state: ProviderHealthState;
  consecutiveFailures: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  cooldownUntil: string | null;
}

export interface ProviderHealthSnapshot extends ProviderHealthRuntime {
  available: boolean;
  cooldownRemainingMs: number;
}

export class ProviderHealthService {
  private readonly health = new Map<ProviderKey, ProviderHealthRuntime>();

  private getRuntime(provider: ProviderKey): ProviderHealthRuntime {
    const existing = this.health.get(provider);
    if (existing) {
      return existing;
    }

    const initial: ProviderHealthRuntime = {
      provider,
      state: 'healthy',
      consecutiveFailures: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      cooldownUntil: null,
    };
    this.health.set(provider, initial);
    return initial;
  }

  canAttempt(provider: ProviderKey) {
    const runtime = this.getRuntime(provider);
    const now = Date.now();
    const cooldownUntil = runtime.cooldownUntil ? new Date(runtime.cooldownUntil).getTime() : null;
    const cooldownRemainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;

    if (cooldownRemainingMs > 0) {
      runtime.state = 'cooldown';
      return {
        allowed: false,
        cooldownRemainingMs,
      };
    }

    if (runtime.state === 'cooldown') {
      runtime.state = runtime.consecutiveFailures > 0 ? 'degraded' : 'healthy';
      runtime.cooldownUntil = null;
    }

    return {
      allowed: true,
      cooldownRemainingMs: 0,
    };
  }

  recordSuccess(provider: ProviderKey) {
    const runtime = this.getRuntime(provider);
    runtime.state = 'healthy';
    runtime.consecutiveFailures = 0;
    runtime.lastErrorCode = null;
    runtime.lastErrorMessage = null;
    runtime.cooldownUntil = null;
    runtime.lastSuccessAt = new Date().toISOString();
  }

  recordFailure(input: {
    provider: ProviderKey;
    code: string;
    message: string;
    retryable: boolean;
  }) {
    const runtime = this.getRuntime(input.provider);
    runtime.lastErrorCode = input.code;
    runtime.lastErrorMessage = input.message;
    runtime.lastFailureAt = new Date().toISOString();
    runtime.consecutiveFailures += 1;

    if (input.retryable && runtime.consecutiveFailures >= env.AI_PROVIDER_FAILURE_THRESHOLD) {
      runtime.state = 'cooldown';
      runtime.cooldownUntil = new Date(Date.now() + env.AI_PROVIDER_COOLDOWN_MS).toISOString();
      return;
    }

    runtime.state = 'degraded';
  }

  snapshot(provider: ProviderKey): ProviderHealthSnapshot {
    const runtime = this.getRuntime(provider);
    const cooldownCheck = this.canAttempt(provider);

    return {
      ...runtime,
      available: cooldownCheck.allowed,
      cooldownRemainingMs: cooldownCheck.cooldownRemainingMs,
    };
  }

  snapshotAll(providers: ProviderKey[]) {
    return providers.map((provider) => this.snapshot(provider));
  }
}
