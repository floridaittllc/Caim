import {
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
  offlineRewrite,
  parseGrokSuggestion,
} from './parse';
import type { GrokChatResponse, GrokSuggestion, RewriteStyle } from './types';

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_MODEL = 'grok-3';

export type GrokClientOptions = {
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

export async function rewriteWithGrok(
  text: string,
  style: RewriteStyle,
  options: GrokClientOptions = {},
): Promise<GrokSuggestion> {
  const apiKey =
    options.apiKey?.trim() ||
    process.env.EXPO_PUBLIC_XAI_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim() ||
    '';

  if (!apiKey) {
    return offlineRewrite(text, style);
  }

  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildRewriteSystemPrompt() },
          { role: 'user', content: buildRewriteUserPrompt(text, style) },
        ],
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    const fallback = offlineRewrite(text, style);
    return {
      ...fallback,
      warning: `Grok unreachable (${message}). Using offline heuristics.`,
    };
  }

  const raw = (await response.json()) as GrokChatResponse;

  if (!response.ok) {
    const message = raw.error?.message ?? `HTTP ${response.status}`;
    const fallback = offlineRewrite(text, style);
    return {
      ...fallback,
      warning: `Grok error: ${message}. Using offline heuristics.`,
    };
  }

  try {
    return parseGrokSuggestion(raw, text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse error';
    const fallback = offlineRewrite(text, style);
    return {
      ...fallback,
      warning: `Could not parse Grok response (${message}). Using offline heuristics.`,
    };
  }
}
