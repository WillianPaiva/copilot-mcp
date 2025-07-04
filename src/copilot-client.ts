import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  GitHubConfig,
  CopilotResponse,
  CopilotChatRequest,
  CopilotExplainRequest,
  CopilotSuggestRequest,
  CopilotReviewRequest,
} from './types.js';

interface CopilotToken {
  token: string;
  expires_at: number;
}

export class CopilotClient {
  private config: GitHubConfig;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private cachedGitHubToken?: string;
  private cachedCopilotToken?: CopilotToken;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  private checkRateLimit() {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    if (now - this.lastResetTime > timeWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= 60) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    this.requestCount++;
  }

  private getGitHubToken(): string {
    if (this.cachedGitHubToken) {
      return this.cachedGitHubToken;
    }

    // Check environment variable (only in GitHub Codespaces)
    const token = process.env.GITHUB_TOKEN;
    const codespaces = process.env.CODESPACES;
    if (token && codespaces) {
      this.cachedGitHubToken = token;
      return token;
    }

    // Check if manual token is provided
    if (this.config.token) {
      this.cachedGitHubToken = this.config.token;
      return this.config.token;
    }

    // Read from GitHub Copilot config files
    const configPath = join(homedir(), '.config');
    const filePaths = [
      join(configPath, 'github-copilot', 'hosts.json'),
      join(configPath, 'github-copilot', 'apps.json'),
    ];

    for (const filePath of filePaths) {
      if (existsSync(filePath)) {
        try {
          const fileData = readFileSync(filePath, 'utf8');
          const parsedData = JSON.parse(fileData);
          
          for (const [key, value] of Object.entries(parsedData)) {
            if (key.includes('github.com')) {
              const oauthToken = (value as any).oauth_token;
              if (oauthToken) {
                this.cachedGitHubToken = oauthToken;
                return oauthToken;
              }
            }
          }
        } catch (error) {
          // Continue to next file if this one fails
          continue;
        }
      }
    }

    throw new Error(
      'Failed to find GitHub token. Please ensure GitHub Copilot is installed and authenticated, or set GITHUB_TOKEN environment variable.'
    );
  }

  private async getCopilotToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedCopilotToken && this.cachedCopilotToken.expires_at > Date.now()) {
      return this.cachedCopilotToken.token;
    }

    // Get a new Copilot token
    const githubToken = this.getGitHubToken();
    
    const response = await fetch('https://api.github.com/copilot_internal/v2/token', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${githubToken}`,
        'User-Agent': 'copilot-mcp-server/1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Copilot token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    this.cachedCopilotToken = {
      token: data.token,
      expires_at: data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + (60 * 60 * 1000), // 1 hour default
    };

    return data.token;
  }

  async chat(request: CopilotChatRequest): Promise<CopilotResponse> {
    this.checkRateLimit();

    try {
      const prompt = this.buildChatPrompt(request);
      const response = await this.makeCompletionRequest(prompt, request.model);
      
      return {
        content: response,
        model: request.model,
      };
    } catch (error) {
      throw new Error(`Copilot chat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async explain(request: CopilotExplainRequest): Promise<CopilotResponse> {
    this.checkRateLimit();

    try {
      const prompt = this.buildExplainPrompt(request);
      const response = await this.makeCompletionRequest(prompt);
      
      return {
        content: response,
      };
    } catch (error) {
      throw new Error(`Code explanation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async suggest(request: CopilotSuggestRequest): Promise<CopilotResponse> {
    this.checkRateLimit();

    try {
      const prompt = this.buildSuggestPrompt(request);
      const response = await this.makeCompletionRequest(prompt);
      
      return {
        content: response,
      };
    } catch (error) {
      throw new Error(`Code suggestion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async review(request: CopilotReviewRequest): Promise<CopilotResponse> {
    this.checkRateLimit();

    try {
      const prompt = this.buildReviewPrompt(request);
      const response = await this.makeCompletionRequest(prompt);
      
      return {
        content: response,
      };
    } catch (error) {
      throw new Error(`Code review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUsage(): Promise<any> {
    try {
      return {
        message: 'Usage data from GitHub Copilot',
        requestCount: this.requestCount,
        lastResetTime: new Date(this.lastResetTime).toISOString(),
        hasValidToken: !!this.cachedCopilotToken,
        tokenExpiry: this.cachedCopilotToken ? new Date(this.cachedCopilotToken.expires_at).toISOString() : null,
      };
    } catch (error) {
      throw new Error(`Failed to get usage data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildChatPrompt(request: CopilotChatRequest): string {
    let prompt = request.message;
    
    if (request.context) {
      prompt += `\n\nContext:\n${request.context}`;
    }
    
    return prompt;
  }

  private buildExplainPrompt(request: CopilotExplainRequest): string {
    let prompt = `Please explain the following code in detail, including what it does, how it works, and any important concepts:\n\n`;
    
    if (request.language) {
      prompt += `Language: ${request.language}\n\n`;
    }
    
    prompt += `\`\`\`\n${request.code}\n\`\`\``;
    
    if (request.context) {
      prompt += `\n\nAdditional context: ${request.context}`;
    }
    
    return prompt;
  }

  private buildSuggestPrompt(request: CopilotSuggestRequest): string {
    let prompt = `Generate code based on the following description:\n\n${request.prompt}`;
    
    if (request.language) {
      prompt += `\n\nTarget language: ${request.language}`;
    }
    
    if (request.context) {
      prompt += `\n\nContext/constraints:\n${request.context}`;
    }
    
    if (request.maxSuggestions && request.maxSuggestions > 1) {
      prompt += `\n\nPlease provide up to ${request.maxSuggestions} alternative implementations.`;
    }
    
    return prompt;
  }

  private buildReviewPrompt(request: CopilotReviewRequest): string {
    let prompt = `Please review the following code`;
    
    if (request.reviewType) {
      const reviewTypes = {
        security: 'for security vulnerabilities and best practices',
        performance: 'for performance issues and optimizations',
        style: 'for code style and formatting improvements',
        general: 'for general improvements and best practices'
      };
      prompt += ` ${reviewTypes[request.reviewType]}`;
    }
    
    prompt += `:\n\n`;
    
    if (request.language) {
      prompt += `Language: ${request.language}\n\n`;
    }
    
    prompt += `\`\`\`\n${request.code}\n\`\`\``;
    
    prompt += `\n\nProvide specific feedback, suggestions for improvement, and explain the reasoning behind your recommendations.`;
    
    return prompt;
  }

  private async makeCompletionRequest(prompt: string, model?: string): Promise<string> {
    try {
      const copilotToken = await this.getCopilotToken();
      
      const response = await fetch('https://api.githubcopilot.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${copilotToken}`,
          'Content-Type': 'application/json',
          'Editor-Version': 'vscode/1.0.0',
          'Editor-Plugin-Version': 'copilot-mcp-server/1.0.0',
          'Copilot-Integration-Id': 'vscode-chat',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: model || 'gpt-4o',
          stream: false,
          max_tokens: 4096,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Copilot API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from GitHub Copilot API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error('GitHub Copilot API not available. Make sure you have access to GitHub Copilot.');
      }
      throw error;
    }
  }
}