import { afterEach, describe, expect, it } from '@jest/globals';

import { rewriteWithGrok } from '../lib/grok/client';

describe('rewriteWithGrok', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses offline fallback when no API key', async () => {
    process.env = { ...originalEnv };
    delete process.env.XAI_API_KEY;
    delete process.env.EXPO_PUBLIC_XAI_API_KEY;

    const result = await rewriteWithGrok('i am fine', 'professional', {
      apiKey: null,
    });
    expect(result.source).toBe('offline');
    expect(result.rewritten.length).toBeGreaterThan(0);
  });

  it('parses a successful Grok response', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          model: 'grok-3',
          choices: [
            {
              message: {
                content: JSON.stringify({
                  rewritten: 'I am fine.',
                  corrections: [],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const result = await rewriteWithGrok('i am fine', 'professional', {
      apiKey: 'test-key',
      fetchImpl,
    });
    expect(result.source).toBe('grok');
    expect(result.rewritten).toBe('I am fine.');
  });

  it('falls back offline on HTTP error', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });

    const result = await rewriteWithGrok('hello there', 'casual', {
      apiKey: 'test-key',
      fetchImpl,
    });
    expect(result.source).toBe('offline');
    expect(result.warning).toMatch(/rate limited/i);
  });
});
