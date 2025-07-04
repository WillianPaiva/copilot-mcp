import { z } from 'zod';

export const CopilotChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.string().optional(),
  model: z.enum(['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash']).optional(),
  temperature: z.number().min(0).max(2).optional()
});

export const CopilotExplainRequestSchema = z.object({
  code: z.string().min(1),
  language: z.string().optional(),
  context: z.string().optional()
});

export const CopilotSuggestRequestSchema = z.object({
  prompt: z.string().min(1),
  language: z.string().optional(),
  context: z.string().optional(),
  maxSuggestions: z.number().min(1).max(10).optional()
});

export const CopilotReviewRequestSchema = z.object({
  code: z.string().min(1),
  language: z.string().optional(),
  reviewType: z.enum(['security', 'performance', 'style', 'general']).optional()
});

export type CopilotChatRequest = z.infer<typeof CopilotChatRequestSchema>;
export type CopilotExplainRequest = z.infer<typeof CopilotExplainRequestSchema>;
export type CopilotSuggestRequest = z.infer<typeof CopilotSuggestRequestSchema>;
export type CopilotReviewRequest = z.infer<typeof CopilotReviewRequestSchema>;

export interface CopilotResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface GitHubConfig {
  token?: string;
  appId?: string;
  privateKeyPath?: string;
  installationId?: string;
  org?: string;
}

export interface ServerConfig {
  github: GitHubConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  debug: boolean;
  maxRequestsPerMinute: number;
}