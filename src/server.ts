import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CopilotClient } from './copilot-client.js';
import { ServerConfig } from './types.js';
import {  
  CopilotChatRequestSchema,
  CopilotExplainRequestSchema, 
  CopilotSuggestRequestSchema,
  CopilotReviewRequestSchema
} from './types.js';

export class CopilotMCPServer {
  private server: Server;
  private copilotClient: CopilotClient | null = null;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'copilot-mcp-server',
        version: '1.0.5',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private getCopilotClient(): CopilotClient {
    if (!this.copilotClient) {
      this.copilotClient = new CopilotClient(this.config.github);
    }
    return this.copilotClient;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'copilot_chat',
            description: 'Chat with GitHub Copilot AI models for general programming assistance',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Your message or question for Copilot',
                  minLength: 1,
                  maxLength: 10000
                },
                context: {
                  type: 'string',
                  description: 'Optional context to provide (e.g., current code, file contents)',
                  optional: true
                },
                model: {
                  type: 'string',
                  enum: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash'],
                  description: 'AI model to use (optional)',
                  optional: true
                },
                temperature: {
                  type: 'number',
                  minimum: 0,
                  maximum: 2,
                  description: 'Response creativity (0=focused, 2=creative)',
                  optional: true
                }
              },
              required: ['message']
            }
          },
          {
            name: 'copilot_explain',
            description: 'Get detailed explanations of code from GitHub Copilot',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Code to explain',
                  minLength: 1
                },
                language: {
                  type: 'string',
                  description: 'Programming language (auto-detected if not provided)',
                  optional: true
                },
                context: {
                  type: 'string',
                  description: 'Additional context about the code',
                  optional: true
                }
              },
              required: ['code']
            }
          },
          {
            name: 'copilot_suggest',
            description: 'Get code suggestions and completions from GitHub Copilot',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of what code you want to generate',
                  minLength: 1
                },
                language: {
                  type: 'string',
                  description: 'Target programming language',
                  optional: true
                },
                context: {
                  type: 'string',
                  description: 'Existing code context or constraints',
                  optional: true
                },
                maxSuggestions: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  description: 'Maximum number of suggestions to return',
                  optional: true
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'copilot_review',
            description: 'Get code review and improvement suggestions from GitHub Copilot',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Code to review',
                  minLength: 1
                },
                language: {
                  type: 'string',
                  description: 'Programming language',
                  optional: true
                },
                reviewType: {
                  type: 'string',
                  enum: ['security', 'performance', 'style', 'general'],
                  description: 'Type of review to perform',
                  optional: true
                }
              },
              required: ['code']
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'copilot_chat': {
            const parsed = CopilotChatRequestSchema.parse(args);
            const response = await this.getCopilotClient().chat(parsed);
            return {
              content: [
                {
                  type: 'text',
                  text: response.content,
                },
              ],
            };
          }

          case 'copilot_explain': {
            const parsed = CopilotExplainRequestSchema.parse(args);
            const response = await this.getCopilotClient().explain(parsed);
            return {
              content: [
                {
                  type: 'text',
                  text: response.content,
                },
              ],
            };
          }

          case 'copilot_suggest': {
            const parsed = CopilotSuggestRequestSchema.parse(args);
            const response = await this.getCopilotClient().suggest(parsed);
            return {
              content: [
                {
                  type: 'text',
                  text: response.content,
                },
              ],
            };
          }

          case 'copilot_review': {
            const parsed = CopilotReviewRequestSchema.parse(args);
            const response = await this.getCopilotClient().review(parsed);
            return {
              content: [
                {
                  type: 'text',
                  text: response.content,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'copilot://models',
            name: 'Available Copilot Models',
            description: 'List of available GitHub Copilot AI models',
            mimeType: 'application/json',
          },
          {
            uri: 'copilot://usage',
            name: 'Usage Statistics',
            description: 'Current Copilot usage metrics and limits',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'copilot://models':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  models: [
                    {
                      name: 'gpt-4o',
                      description: 'OpenAI GPT-4 Omni - Advanced multimodal model',
                      provider: 'OpenAI'
                    },
                    {
                      name: 'claude-3-5-sonnet',
                      description: 'Anthropic Claude 3.5 Sonnet - Fast and capable',
                      provider: 'Anthropic'
                    },
                    {
                      name: 'gemini-2.0-flash',
                      description: 'Google Gemini 2.0 Flash - Fast and efficient',
                      provider: 'Google'
                    }
                  ]
                }, null, 2),
              },
            ],
          };

        case 'copilot://usage':
          try {
            const usage = await this.getCopilotClient().getUsage();
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(usage, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({ error: 'Unable to fetch usage data' }, null, 2),
                },
              ],
            };
          }

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Copilot MCP Server started on stdio');
    
    // Keep the process alive
    process.stdin.resume();
  }
}