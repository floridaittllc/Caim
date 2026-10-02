export type RewriteStyle = 'professional' | 'casual' | 'shorten' | 'expand';

export type Correction = {
  original: string;
  suggestion: string;
  reason: string;
};

export type GrokSuggestion = {
  rewritten: string;
  corrections: Correction[];
  source: 'grok' | 'offline';
  model?: string;
  warning?: string;
};

export type GrokChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GrokChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};
