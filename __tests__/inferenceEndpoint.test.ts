import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { KEYBOARD_SHARED_KEYS } from 'caim-app-group/src/keys';

import {
  normalizeBaseUrl,
  parseIssueCount,
  testSelfHostedConnection,
} from '../lib/inference/endpoint';
import {
  DEFAULT_AI_CONFIG,
  parseAIConfig,
  sharedValuesForKeyboard,
} from '../lib/inference/keyboardConfig';
import prompts from '../server/runpod/prompts.json';

const RUNPOD = 'https://api.runpod.ai/v2/abc123xyz/openai/v1';

describe('normalizeBaseUrl', () => {
  it.each([
    'abc123xyz',
    ' abc123xyz ',
    'https://api.runpod.ai/v2/abc123xyz',
    'https://api.runpod.ai/v2/abc123xyz/',
    'api.runpod.ai/v2/abc123xyz',
    'https://api.runpod.ai/v2/abc123xyz/openai/v1',
    'https://api.runpod.ai/v2/abc123xyz/openai/v1/chat/completions',
  ])('maps %p to the RunPod OpenAI route', (input) => {
    expect(normalizeBaseUrl(input)).toBe(RUNPOD);
  });

  it('keeps Pod and LAN bases', () => {
    expect(normalizeBaseUrl('https://k3x9-8000.proxy.runpod.net/v1/')).toBe(
      'https://k3x9-8000.proxy.runpod.net/v1',
    );
    expect(normalizeBaseUrl('http://192.168.1.20:8000/v1/chat/completions')).toBe(
      'http://192.168.1.20:8000/v1',
    );
  });

  it('rejects unusable input', () => {
    expect(normalizeBaseUrl('')).toBeNull();
    expect(normalizeBaseUrl('ftp://example.com/v1')).toBeNull();
    expect(normalizeBaseUrl('https://')).toBeNull();
  });
});

describe('parseIssueCount', () => {
  it('reads plain and fenced grammar JSON', () => {
    expect(parseIssueCount('{"issues":[{"original":"a"},{"original":"b"}]}')).toBe(2);
    expect(parseIssueCount('```json\n{"issues":[]}\n```')).toBe(0);
  });

  it('returns null for non-grammar replies', () => {
    expect(parseIssueCount('Looks fine!')).toBeNull();
    expect(parseIssueCount('{"rewritten":"x"}')).toBeNull();
  });
});

describe('testSelfHostedConnection', () => {
  it('sends the shared grammar prompt with a json_schema response format', async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      captured = { url: String(url), init: init ?? {} };
      return new Response(
        JSON.stringify({
          model: 'caim-grammar',
          choices: [{ message: { content: '{"issues":[{"original":"Their"}]}' } }],
        }),
        { status: 200 },
      );
    };
    let clock = 1000;
    const result = await testSelfHostedConnection({
      baseUrl: 'abc123xyz',
      apiKey: ' rp_key ',
      fetchImpl,
      now: () => (clock += 250),
    });

    expect(result).toEqual({
      ok: true,
      latencyMs: 250,
      issueCount: 1,
      model: 'caim-grammar',
      baseUrl: RUNPOD,
    });
    expect(captured).not.toBeNull();
    const request = captured as unknown as { url: string; init: RequestInit };
    expect(request.url).toBe(`${RUNPOD}/chat/completions`);
    expect((request.init.headers as Record<string, string>).Authorization).toBe('Bearer rp_key');
    const body = JSON.parse(String(request.init.body));
    expect(body.model).toBe('caim-grammar');
    expect(body.messages[0].content).toBe(prompts.grammar.system);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.schema).toEqual(prompts.grammar.schema);
  });

  it('explains auth failures', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const result = await testSelfHostedConnection({ baseUrl: 'abc', apiKey: 'bad', fetchImpl });
    expect(result).toEqual({ ok: false, message: 'HTTP 401: the API key was rejected.' });
  });

  it('flags replies that are not grammar JSON', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'Sure!' } }] }), {
        status: 200,
      });
    const result = await testSelfHostedConnection({ baseUrl: 'abc', apiKey: 'k', fetchImpl });
    expect(result.ok).toBe(false);
  });

  it('reports a cold start when the request times out', async () => {
    const fetchImpl: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    const result = await testSelfHostedConnection({
      baseUrl: 'abc',
      apiKey: 'k',
      fetchImpl,
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.message).toContain('serverless worker may still be starting');
  });

  it('validates input before calling the network', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('should not be called');
    };
    expect(await testSelfHostedConnection({ baseUrl: '', apiKey: 'k', fetchImpl })).toEqual({
      ok: false,
      message: 'Enter an https URL or a RunPod endpoint id.',
    });
    expect(await testSelfHostedConnection({ baseUrl: 'abc', apiKey: ' ', fetchImpl })).toEqual({
      ok: false,
      message: 'Enter the API key for this endpoint.',
    });
  });
});

describe('keyboard AI config', () => {
  it('parses stored config defensively', () => {
    expect(parseAIConfig(null)).toEqual(DEFAULT_AI_CONFIG);
    expect(parseAIConfig('not json')).toEqual(DEFAULT_AI_CONFIG);
    expect(
      parseAIConfig(JSON.stringify({ provider: 'nope', backgroundGrammar: false, selfHostedBaseUrl: 'abc' })),
    ).toEqual({ ...DEFAULT_AI_CONFIG, backgroundGrammar: false, selfHostedBaseUrl: 'abc' });
  });

  it('publishes normalized values for the keyboard', () => {
    expect(
      sharedValuesForKeyboard(
        { ...DEFAULT_AI_CONFIG, provider: 'selfHosted', selfHostedBaseUrl: 'abc123xyz', onDeviceEnabled: false },
        ' rp ',
      ),
    ).toEqual({
      inference_provider: 'selfHosted',
      selfhosted_base_url: RUNPOD,
      selfhosted_api_key: 'rp',
      selfhosted_model: '',
      background_grammar: 'on',
      on_device_enabled: 'off',
    });
  });

  it('uses the same App Group keys and provider ids as the Swift keyboard', () => {
    const swiftSettings = fs.readFileSync(
      path.join(__dirname, '../Packages/CAImKeyboardCore/Sources/CAImKeyboardCore/InferenceSettings.swift'),
      'utf8',
    );
    const swiftKeys = [...swiftSettings.matchAll(/static let \w+ = "([a-z_]+)"/g)].map((m) => m[1]);
    expect(new Set(swiftKeys)).toEqual(new Set(Object.values(KEYBOARD_SHARED_KEYS)));

    const swiftRouter = fs.readFileSync(
      path.join(__dirname, '../Packages/CAImKeyboardCore/Sources/CAImKeyboardCore/InferenceRouter.swift'),
      'utf8',
    );
    const preferenceBlock = swiftRouter.slice(
      swiftRouter.indexOf('enum ProviderPreference'),
      swiftRouter.indexOf('public init(lenient'),
    );
    const swiftCases = [...preferenceBlock.matchAll(/case (\w+)/g)].map((m) => m[1]);
    expect(swiftCases).toEqual(['auto', 'onDevice', 'selfHosted', 'grok']);
  });
});
