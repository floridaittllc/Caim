import { describe, expect, it } from '@jest/globals';

import {
  extractJsonObject,
  offlineRewrite,
  parseGrokSuggestion,
} from '../lib/grok/parse';
import type { GrokChatResponse } from '../lib/grok/types';

describe('extractJsonObject', () => {
  it('parses raw JSON', () => {
    const value = extractJsonObject(
      '{"rewritten":"Hello","corrections":[]}',
    ) as { rewritten: string };
    expect(value.rewritten).toBe('Hello');
  });

  it('parses fenced JSON', () => {
    const value = extractJsonObject(
      'Here you go:\n```json\n{"rewritten":"Hi","corrections":[]}\n```',
    ) as { rewritten: string };
    expect(value.rewritten).toBe('Hi');
  });

  it('returns null for prose', () => {
    expect(extractJsonObject('just text')).toBeNull();
  });
});

describe('parseGrokSuggestion', () => {
  it('reads structured content', () => {
    const response: GrokChatResponse = {
      model: 'grok-3',
      choices: [
        {
          message: {
            content: JSON.stringify({
              rewritten: 'I cannot believe this works.',
              corrections: [
                {
                  original: 'cant',
                  suggestion: 'cannot',
                  reason: 'spelling',
                },
              ],
            }),
          },
        },
      ],
    };

    const result = parseGrokSuggestion(response, 'fallback');
    expect(result.source).toBe('grok');
    expect(result.rewritten).toBe('I cannot believe this works.');
    expect(result.corrections).toHaveLength(1);
    expect(result.model).toBe('grok-3');
  });

  it('falls back to raw text when not JSON', () => {
    const response: GrokChatResponse = {
      choices: [{ message: { content: 'Plain rewrite' } }],
    };
    const result = parseGrokSuggestion(response, 'x');
    expect(result.rewritten).toBe('Plain rewrite');
    expect(result.warning).toMatch(/not structured JSON/i);
  });

  it('throws on API error payload', () => {
    expect(() =>
      parseGrokSuggestion({ error: { message: 'Unauthorized' } }, 'x'),
    ).toThrow('Unauthorized');
  });
});

describe('offlineRewrite', () => {
  it('capitalizes lone i and cleans spacing', () => {
    const result = offlineRewrite('hello   i  world', 'casual');
    expect(result.source).toBe('offline');
    expect(result.rewritten).toContain('I');
    expect(result.warning).toMatch(/Offline/i);
  });

  it('shortens long text', () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
    const result = offlineRewrite(words, 'shorten');
    expect(result.rewritten.split(/\s+/).length).toBeLessThanOrEqual(13);
  });

  it('handles empty input', () => {
    const result = offlineRewrite('   ', 'professional');
    expect(result.rewritten).toBe('');
  });
});
