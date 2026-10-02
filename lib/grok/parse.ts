import type { Correction, GrokChatResponse, GrokSuggestion } from './types';

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseCorrections(raw: unknown): Correction[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const corrections: Correction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const original = asString(record.original);
    const suggestion = asString(record.suggestion);
    const reason = asString(record.reason) ?? 'Suggested fix';
    if (original && suggestion) {
      corrections.push({ original, suggestion, reason });
    }
  }
  return corrections;
}

/** Extract JSON object from model output that may be fenced or wrapped in prose. */
export function extractJsonObject(content: string): unknown | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function parseGrokSuggestion(
  response: GrokChatResponse,
  fallbackText: string,
): GrokSuggestion {
  if (response.error?.message) {
    throw new Error(response.error.message);
  }

  const content = response.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) {
    throw new Error('Empty response from Grok');
  }

  const parsed = extractJsonObject(content);
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const rewritten =
      asString(record.rewritten) ??
      asString(record.text) ??
      asString(record.result) ??
      content;
    return {
      rewritten,
      corrections: parseCorrections(record.corrections),
      source: 'grok',
      model: response.model,
    };
  }

  return {
    rewritten: content,
    corrections: [],
    source: 'grok',
    model: response.model,
    warning: 'Response was not structured JSON; using raw text.',
  };
}

export function buildRewriteSystemPrompt(): string {
  return [
    'You are CAIm, a writing assistant for a mobile keyboard.',
    'Return ONLY valid JSON with this shape:',
    '{"rewritten":"string","corrections":[{"original":"string","suggestion":"string","reason":"string"}]}',
    'Fix grammar and spelling in corrections. Do not wrap JSON in markdown.',
  ].join(' ');
}

export function buildRewriteUserPrompt(
  text: string,
  style: string,
): string {
  return `Rewrite the text in a ${style} style.\n\nText:\n${text}`;
}

/** Used when no API key / offline — deterministic local heuristics. */
export function offlineRewrite(
  text: string,
  style: string,
): GrokSuggestion {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      rewritten: '',
      corrections: [],
      source: 'offline',
      warning: 'Nothing to rewrite.',
    };
  }

  const corrections: Correction[] = [];
  let rewritten = trimmed
    .replace(/\bi\b/g, 'I')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1');

  if (rewritten !== trimmed) {
    corrections.push({
      original: trimmed,
      suggestion: rewritten,
      reason: 'Basic capitalization and spacing',
    });
  }

  switch (style) {
    case 'professional':
      if (!/[.!?]$/.test(rewritten)) {
        rewritten = `${rewritten}.`;
      }
      rewritten = rewritten.replace(/\bcan't\b/gi, 'cannot').replace(/\bwon't\b/gi, 'will not');
      break;
    case 'casual':
      rewritten = rewritten.replace(/\bcannot\b/gi, "can't");
      break;
    case 'shorten': {
      const words = rewritten.split(/\s+/);
      if (words.length > 12) {
        rewritten = `${words.slice(0, 12).join(' ')}…`;
        corrections.push({
          original: trimmed,
          suggestion: rewritten,
          reason: 'Shortened to first 12 words (offline)',
        });
      }
      break;
    }
    case 'expand':
      rewritten = `${rewritten} Additionally, this draft can be expanded with more context once Grok is connected.`;
      break;
    default:
      break;
  }

  return {
    rewritten,
    corrections,
    source: 'offline',
    warning: 'Offline heuristics — set an xAI API key for Grok.',
  };
}
