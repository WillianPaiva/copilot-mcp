# Copilot MCP Server

A Model Context Protocol (MCP) server that integrates with GitHub Copilot to provide AI-powered code assistance directly to Claude Code and other MCP-compatible tools.

## Features

- **Chat with Copilot**: Get general programming assistance using GitHub Copilot's AI models
- **Code Explanation**: Detailed explanations of code snippets
- **Code Suggestions**: Generate code based on natural language descriptions
- **Code Review**: Get feedback and improvement suggestions for your code
- **Multiple AI Models**: Support for GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Flash
- **Rate Limiting**: Built-in rate limiting to respect API limits
- **Flexible Authentication**: Support for both Personal Access Tokens and GitHub Apps

## Installation

### Option 1: Using npx (Recommended)

```bash
npx copilot-mcp-server
```

### Option 2: Manual Installation

1. Clone this repository:
```bash
git clone https://github.com/WillianPaiva/copilot-mcp.git
cd copilot-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### No Configuration Needed!

The server works out of the box with your existing GitHub Copilot authentication.

### Optional Configuration

Only needed for special use cases. Create a `.env` file:

```bash
cp .env.example .env
```

Optional settings:
```env
# Only if you want to override the detected organization
GITHUB_ORG=your_organization_name

# Optional debugging
LOG_LEVEL=info
DEBUG=false
MAX_REQUESTS_PER_MINUTE=60
```

### Setup Requirements

**Prerequisites:**
1. **GitHub Copilot Subscription**: You need an active GitHub Copilot subscription
2. **GitHub Copilot CLI Installed**: Install and authenticate GitHub Copilot CLI:
   ```bash
   # Install GitHub CLI first
   brew install gh  # or your preferred method
   
   # Install GitHub Copilot CLI extension
   gh extension install github/gh-copilot
   
   # Authenticate (this will save tokens to ~/.config/github-copilot/)
   gh auth login
   ```

### Authentication

**Automatic Authentication (Recommended)**

The MCP server automatically detects your GitHub Copilot authentication from:
1. `~/.config/github-copilot/hosts.json` 
2. `~/.config/github-copilot/apps.json`

No manual configuration needed if you have GitHub Copilot CLI installed and authenticated!

**Troubleshooting Authentication**

If automatic detection fails, you can manually override:
```env
GITHUB_TOKEN=your_github_token_here
```

## Usage

### With Claude Code

Add the following to your Claude Code MCP configuration:

**Option 1: Using npx (Recommended)**
```json
{
  "mcpServers": {
    "copilot": {
      "command": "npx",
      "args": ["-y", "copilot-mcp-server"]
    }
  }
}
```

**Option 2: Manual Installation**
```json
{
  "mcpServers": {
    "copilot": {
      "command": "node",
      "args": ["/path/to/your/copilot-mcp/build/index.js"]
    }
  }
}
```

That's it! No tokens or environment variables needed - the server automatically uses your existing GitHub Copilot authentication.

### Available Tools

#### `copilot_chat`
General programming assistance and questions.

```javascript
// Example usage in Claude Code
copilot_chat({
  message: "How do I implement a binary search algorithm?",
  model: "gpt-4o",
  context: "I'm working on a JavaScript project"
})
```

#### `copilot_explain`
Get detailed explanations of code.

```javascript
copilot_explain({
  code: "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }",
  language: "javascript"
})
```

#### `copilot_suggest`
Generate code from natural language descriptions.

```javascript
copilot_suggest({
  prompt: "Create a React component for a user profile card",
  language: "javascript",
  maxSuggestions: 3
})
```

#### `copilot_review`
Get code review and improvement suggestions.

```javascript
copilot_review({
  code: "your code here",
  language: "python",
  reviewType: "security"
})
```

### Available Resources

#### `copilot://models`
List of available AI models and their capabilities.

#### `copilot://usage`
Current usage statistics and rate limiting information.

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm test
```

## Rate Limiting

The server implements rate limiting to respect GitHub's API limits:
- Default: 60 requests per minute
- Configurable via `MAX_REQUESTS_PER_MINUTE` environment variable
- Automatic reset every minute

## Error Handling

The server includes comprehensive error handling for:
- Authentication failures
- Rate limit exceeded
- Network issues
- Invalid requests
- API unavailability

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure GitHub Copilot CLI is installed: `gh extension install github/gh-copilot`
   - Make sure you're authenticated: `gh auth login`
   - Verify you have access to GitHub Copilot

2. **Rate Limit Exceeded**
   - Wait for the rate limit to reset (1 minute)
   - Consider reducing the frequency of requests

3. **API Not Available**
   - Verify you have access to GitHub Copilot
   - Check GitHub's status page for outages

### Debug Mode

Enable debug mode for verbose logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Security

- The server uses your existing GitHub Copilot authentication
- No tokens are stored or transmitted by this application
- Authentication files are read-only from GitHub CLI's standard locations
- Follow GitHub's security best practices for your main GitHub authentication

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information