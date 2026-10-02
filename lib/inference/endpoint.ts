import prompts from '../../server/runpod/prompts.json';

export type ProviderPreference = 'auto' | 'onDevice' | 'selfHosted' | 'grok';

export const PROVIDER_PREFERENCES: ProviderPreference[] = ['auto', 'onDevice', 'selfHosted', 'grok'];

export const DEFAULT_SELF_HOSTED_MODEL = prompts.servedModelName;

/**
 * Same rules as `OpenAICompatibleEndpoint.normalizedBaseURL` (Swift) and
 * `normalize_base_url` (server/runpod/smoke_test.py). Returns null for unusable input.
 */
export function normalizeBaseUrl(raw: string): string | null {
  let text = raw.trim();
  if (!text) {
    return null;
  }
  if (/^[A-Za-z0-9]+$/.test(text)) {
    return `https://api.runpod.ai/v2/${text}/openai/v1`;
  }
  if (!text.includes('://')) {
    text = `https://${text}`;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname) {
    return null;
  }
  let path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/chat/completions')) {
    path = path.slice(0, -'/chat/completions'.length);
  }
  if (/^\/v2\/[^/]+$/.test(path)) {
    path += '/openai/v1';
  }
  return `${url.protocol}//${url.host}${path}`;
}

export type ConnectionTestResult =
  | { ok: true; latencyMs: number; issueCount: number; model: string | null; baseUrl: string }
  | { ok: false; message: string };

export type ConnectionTestOptions = {
  baseUrl: string;
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
};

const SAMPLE = 'Their going to the libary tomorow.';

/** Sends one real grammar check, so it proves auth, routing, the model and JSON output. */
export async function testSelfHostedConnection(
  options: ConnectionTestOptions,
): Promise<ConnectionTestResult> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  if (!baseUrl) {
    return { ok: false, message: 'Enter an https URL or a RunPod endpoint id.' };
  }
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    return { ok: false, message: 'Enter the API key for this endpoint.' };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const started = now();

  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model?.trim() || DEFAULT_SELF_HOSTED_MODEL,
        temperature: prompts.grammar.temperature,
        max_tokens: prompts.grammar.maxTokens,
        messages: [
          { role: 'system', content: prompts.grammar.system },
          { role: 'user', content: prompts.grammar.userTemplate.replace('{{text}}', SAMPLE) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'grammar_issues', schema: prompts.grammar.schema, strict: true },
        },
      }),
      signal: controller?.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      return { ok: false, message: describeHttpError(response.status, raw) };
    }
    const body = JSON.parse(raw) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content ?? '';
    const issues = parseIssueCount(content);
    if (issues === null) {
      return { ok: false, message: 'Connected, but the reply was not grammar JSON. Check the model name.' };
    }
    return { ok: true, latencyMs: now() - started, issueCount: issues, model: body.model ?? null, baseUrl };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        message: `No reply in ${Math.round(timeoutMs / 1000)}s. A serverless worker may still be starting; try again in a minute.`,
      };
    }
    const message = error instanceof Error ? error.message : 'Network error';
    return { ok: false, message: `Could not reach the endpoint (${message}).` };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function describeHttpError(status: number, raw: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(raw) as { error?: string | { message?: string }; message?: string };
    detail =
      typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error?.message ?? parsed.message ?? '';
  } catch {
    detail = raw.slice(0, 120);
  }
  if (status === 401 || status === 403) {
    return `HTTP ${status}: the API key was rejected.`;
  }
  if (status === 404) {
    return 'HTTP 404: check the endpoint id / URL (it should end in /openai/v1 or /v1).';
  }
  return detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}`;
}

/** Issue count from model content (tolerates code fences), or null when it is not grammar JSON. */
export function parseIssueCount(content: string): number | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : content).trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { issues?: unknown };
    return Array.isArray(parsed.issues) ? parsed.issues.length : null;
  } catch {
    return null;
  }
}
