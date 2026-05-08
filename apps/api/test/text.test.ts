import { describe, expect, it } from 'vitest';

import { sanitizeInput, truncateText, buildSessionTitle, extractKeywords } from '../src/utils/text';

describe('text utilities', () => {
  describe('sanitizeInput', () => {
    it('strips null bytes and trims', () => {
      expect(sanitizeInput('  Hello\u0000World  ')).toBe('HelloWorld');
      expect(sanitizeInput('\u0000\u0000')).toBe('');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });
  });

  describe('truncateText', () => {
    it('returns unchanged text under limit', () => {
      expect(truncateText('short text', 100)).toBe('short text');
    });

    it('appends ellipsis when over limit', () => {
      const result = truncateText('this is a long text', 10);
      expect(result).toMatch(/…$/);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('handles empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('handles exact boundary', () => {
      const text = 'hello';
      expect(truncateText(text, 5)).toBe('hello');
    });
  });

  describe('buildSessionTitle', () => {
    it('truncates at 64 characters', () => {
      const longTitle = 'a'.repeat(100);
      const result = buildSessionTitle(longTitle);
      expect(result.length).toBeLessThanOrEqual(64);
    });

  it('collapses whitespace and trims leading/trailing spaces', () => {
    const result = buildSessionTitle('  Hello   World  ');
    expect(result).toBe('Hello World');
  });

    it('returns short titles unchanged', () => {
      expect(buildSessionTitle('SQL Joins')).toBe('SQL Joins');
    });
  });

  describe('extractKeywords', () => {
    it('returns unique non-stopwords', () => {
      const keywords = extractKeywords('Please explain SQL joins and normalization please');
      expect(keywords).toContain('sql');
      expect(keywords).toContain('joins');
      expect(keywords).toContain('normalization');
      expect(keywords).not.toContain('please');
      expect(keywords).not.toContain('explain');
    });

    it('handles Vietnamese text', () => {
      const keywords = extractKeywords('giải thích chủ nghĩa duy vật');
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('filters short words and duplicates', () => {
      const keywords = extractKeywords('sql sql sql a bc de');
      expect(keywords).toHaveLength(1);
      expect(keywords[0]).toBe('sql');
    });

    it('limits to 20 keywords', () => {
      const words = Array.from({ length: 30 }, (_, i) => `keyword${i}`).join(' ');
      const keywords = extractKeywords(words);
      expect(keywords.length).toBeLessThanOrEqual(20);
    });

    it('handles empty input', () => {
      const keywords = extractKeywords('the and for');
      expect(keywords).toHaveLength(0);
    });

    it('handles mixed English and Vietnamese', () => {
      const keywords = extractKeywords('giải thích SQL joins normalization đi');
      expect(keywords).toContain('sql');
      expect(keywords).toContain('joins');
      expect(keywords).toContain('normalization');
    });
  });
});
