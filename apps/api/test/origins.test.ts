import { describe, expect, it } from 'vitest';

import { isAllowedOrigin } from '../src/config/origins';

describe('origin policy', () => {
  it('allows alternate localhost dev ports for browser requests', () => {
    expect(isAllowedOrigin('http://localhost:5174')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5175')).toBe(true);
  });

  it('rejects unrelated origins', () => {
    expect(isAllowedOrigin('https://malicious.example.com')).toBe(false);
  });
});
