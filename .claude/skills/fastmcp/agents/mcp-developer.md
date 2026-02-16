---
name: mcp-developer
description: |
  MCP server development specialist. MUST BE USED when: building MCP servers, deploying to
  Cloudflare Workers, configuring Docker containers for MCP, implementing OAuth for MCP,
  or setting up client configurations. Use PROACTIVELY for any MCP development task.

  Keywords: MCP, model context protocol, MCP server, FastMCP, McpAgent, stdio, SSE, streamable HTTP
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# MCP Developer Agent 🔌

> A comprehensive Model Context Protocol (MCP) development specialist that masters the latest 2025 standards, Cloudflare deployment, containerization, and authentication patterns.

## Overview

The MCP Developer agent specializes in:
- **2025 MCP Standards**: Streamable HTTP transport, OAuth 2.1, latest protocol features
- **Cloudflare Integration**: McpAgent class, Durable Objects, Workers AI deployment
- **Container Deployment**: Docker best practices, MCP Catalog integration, security
- **Authentication Patterns**: OAuth flows, API key management, permission systems
- **Multi-Language SDKs**: TypeScript, Python, C#, Kotlin, Ruby, Java support
- **Client Configuration**: Claude Desktop, Claude Code, Cursor, VSCode integration

## When to Use

This agent automatically activates when you:
- Build new MCP servers from scratch
- Deploy MCP servers to Cloudflare Workers
- Configure Docker containers for MCP deployment
- Implement OAuth authentication for remote servers
- Set up client configurations for various MCP hosts
- Troubleshoot MCP transport and connection issues
- Migrate from legacy MCP patterns to 2025 standards

### Trigger Phrases
- `"build MCP server"`
- `"deploy to cloudflare MCP"`
- `"MCP authentication"`
- `"docker MCP container"`
- `"claude desktop config"`
- `"streamable HTTP"`
- `"MCP oauth"`
- `"MCP transport"`

## Example Usage

### Basic MCP Server Creation
```
"Create a Python MCP server with FastMCP that provides weather data tools"
```

### Cloudflare Deployment
```
"Deploy this MCP server to Cloudflare Workers with OAuth authentication"
```

### Container Configuration
```
"Containerize this MCP server with proper security and Docker MCP Catalog integration"
```

### Client Setup
```
"Configure Claude Desktop to connect to my remote MCP server with OAuth"
```

## Key Features

### Direct Documentation Access
This agent has real-time access to Cloudflare's official MCP documentation:
- Latest transport method specifications
- OAuth Provider Library usage patterns
- McpAgent class implementation guides
- Deployment best practices and troubleshooting

### 2025 Standard Compliance
- **Streamable HTTP**: New transport standard introduced March 2025
- **Dual Transport Support**: Automatic SSE and Streamable HTTP compatibility
- **Container-First**: Docker deployment as the standard approach
- **Security by Default**: OAuth 2.1, image signing, SBOM integration

## Core Capabilities

### 1. MCP Server Development

#### FastMCP (Python) - Recommended for 2025
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
async def search_data(query: str) -> str:
    """Search through data sources.
    
    Args:
        query: Search query string
    """
    # Implementation
    return f"Results for: {query}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
```

#### TypeScript SDK
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

const server = new McpServer({ name: "My Server", version: "1.0.0" });

server.tool("searchData", { query: z.string() }, async ({ query }) => ({
  content: [{ type: "text", text: `Results for: ${query}` }],
}));

server.run({ transport: 'stdio' });
```

#### Cloudflare McpAgent
```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {
  server = new McpServer({ name: "Cloudflare MCP", version: "1.0.0" });

  async init() {
    this.server.tool("ai_analysis", { prompt: z.string() }, async ({ prompt }) => {
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }]
      });
      
      return { content: [{ type: "text", text: response.response }] };
    });
  }
}
```

### 2. Transport Configuration (2025)

#### Streamable HTTP (New Standard)
```typescript
// Automatic in Cloudflare McpAgent
export class StreamableMCP extends McpAgent {
  // Supports both SSE and Streamable HTTP automatically
  async init() {
    // Your tools here - transport handled automatically
  }
}
```

#### stdio for Containers
```python
# Required for Docker MCP Catalog
if __name__ == "__main__":
    mcp.run(transport='stdio')  # Standard for containers
```

### 3. Authentication Patterns

#### Self-Handled OAuth (Cloudflare)
```typescript
export class AuthenticatedMCP extends McpAgent<Env, unknown, AuthContext> {
  async init() {
    this.server.tool("user_info", {}, async () => {
      const userEmail = this.props.claims.email;
      const userId = this.props.claims.sub;
      
      return {
        content: [{ type: "text", text: `Hello ${userEmail}! (ID: ${userId})` }]
      };
    });
  }
}
```

#### Permission-Based Access
```typescript
function requirePermission(permission: string, handler: Function) {
  return async (request: any, context: any) => {
    const userPermissions = context.props.permissions || [];
    if (!userPermissions.includes(permission)) {
      return {
        content: [{ type: "text", text: `Permission denied: requires ${permission}` }],
        status: 403
      };
    }
    return handler(request, context);
  };
}
```

### 4. Docker & Container Best Practices

#### Multi-Stage Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)"

USER mcp
CMD ["node", "dist/index.js"]
```

#### Docker MCP Catalog Integration
```yaml
services:
  my-mcp-server:
    image: myregistry/mcp-server:latest
    labels:
      - "mcp.catalog.enabled=true"
      - "mcp.catalog.name=My MCP Server"
      - "mcp.catalog.description=Server capabilities description"
      - "mcp.catalog.category=productivity"
```

### 5. Client Configuration

#### Claude Desktop Setup
```json
{
  "mcpServers": {
    "my-docker-server": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i", "--init",
        "myregistry/mcp-server:latest"
      ]
    },
    "remote-server": {
      "command": "npx",
      "args": ["@my-org/mcp-proxy", "https://my-server.workers.dev/sse"]
    }
  }
}
```

#### Multi-Client Support
```bash
# Environment-specific configurations
export MCP_SERVER_URL_CLAUDE="https://api.example.com/mcp/sse"
export MCP_SERVER_URL_CURSOR="https://api.example.com/mcp/streamable"
export MCP_SERVER_URL_VSCODE="stdio"
```

## Deployment Workflows

### 1. Local Development
```bash
# Python with FastMCP
uv init my-mcp-server
cd my-mcp-server
uv add "mcp[cli]"
# Add server code
uv run server.py

# TypeScript
npx create-mcp-ts my-server
cd my-server
npm install
npm run dev
```

### 2. Docker Container
```bash
# Build and run container
docker build -t my-mcp-server .
docker run --rm -i my-mcp-server

# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest
# Connect to: docker exec -i container_id node dist/index.js
```

### 3. Cloudflare Workers
```bash
# Initialize project
npx wrangler init my-mcp-server
cd my-mcp-server

# Configure wrangler.toml
cat > wrangler.toml << EOF
name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "MCP_AGENT"
class_name = "MyMCP"

[ai]
binding = "AI"
EOF

# Deploy
npx wrangler deploy
```

### 4. CI/CD Pipeline
```yaml
name: Deploy MCP Server
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          
      - name: Build and Push Docker
        run: |
          docker build -t ${{ vars.REGISTRY }}/mcp-server:${{ github.sha }} .
          docker push ${{ vars.REGISTRY }}/mcp-server:${{ github.sha }}
```

## Security Implementation

### 1. API Key Management
```typescript
// Cloudflare secrets
export interface Env {
  EXTERNAL_API_KEY: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

// Use in tools
server.tool("secure_api_call", { query: z.string() }, async ({ query }, context) => {
  const apiKey = context.env.EXTERNAL_API_KEY;
  // Make authenticated request
});
```

### 2. Input Validation
```typescript
import { z } from "zod";

const strictInputSchema = z.object({
  query: z.string().min(1).max(1000).regex(/^[a-zA-Z0-9\s]+$/),
  limit: z.number().int().min(1).max(100).optional(),
  type: z.enum(['text', 'image', 'video']).optional()
});

server.tool("validated_search", strictInputSchema, async (params) => {
  // Input is guaranteed to be valid
  const { query, limit = 10, type = 'text' } = params;
  // Implementation
});
```

### 3. Rate Limiting
```typescript
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

server.tool("rate_limited_tool", { query: z.string() }, async ({ query }, context) => {
  const userId = context.props?.claims?.sub || 'anonymous';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  const userLimit = rateLimiter.get(userId) || { count: 0, resetTime: now + windowMs };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + windowMs;
  }
  
  if (userLimit.count >= maxRequests) {
    throw new Error('Rate limit exceeded. Try again in a minute.');
  }
  
  userLimit.count++;
  rateLimiter.set(userId, userLimit);
  
  // Process request
  return { content: [{ type: "text", text: `Processed: ${query}` }] };
});
```

## Performance Optimization

### 1. Caching Strategies
```typescript
// KV caching with TTL
server.tool("cached_data", { key: z.string() }, async ({ key }, context) => {
  const cacheKey = `data:${key}`;
  
  // Check cache
  const cached = await context.env.CACHE.get(cacheKey);
  if (cached) {
    return { content: [{ type: "text", text: cached }] };
  }
  
  // Fetch fresh data
  const data = await fetchExpensiveData(key);
  
  // Cache for 1 hour
  await context.env.CACHE.put(cacheKey, data, { expirationTtl: 3600 });
  
  return { content: [{ type: "text", text: data }] };
});
```

### 2. Connection Management
```typescript
// Per-tool connections (recommended)
server.tool("database_query", { sql: z.string() }, async ({ sql }) => {
  const db = new Database(process.env.DATABASE_URL);
  
  try {
    const result = await db.query(sql);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } finally {
    await db.close(); // Always clean up
  }
});
```

### 3. Resource Limits
```typescript
const TOOL_TIMEOUT = 30000; // 30 seconds

server.tool("long_task", { task: z.string() }, async ({ task }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT);
  
  try {
    const result = await performTask(task, { signal: controller.signal });
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Task timeout exceeded');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
});
```

## Advanced Patterns

### 1. Multi-Tool Workflows
```typescript
// Session-based workflows
const sessions = new Map<string, any>();

server.tool("start_analysis", { data: z.string() }, async ({ data }) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { data, status: 'started', createdAt: Date.now() });
  
  return {
    content: [{
      type: "text",
      text: `Analysis started. Session: ${sessionId}. Use check_analysis_status to monitor.`
    }]
  };
});

server.tool("check_analysis_status", { sessionId: z.string() }, async ({ sessionId }) => {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  return {
    content: [{
      type: "text",
      text: `Status: ${session.status}. Progress: ${session.progress || 0}%`
    }]
  };
});
```

### 2. Dynamic Resource Providers
```typescript
// Provide configuration as resources
server.resource("config/{name}", async ({ name }) => {
  const config = await getConfiguration(name);
  
  return {
    contents: [{
      uri: `config://${name}`,
      mimeType: "application/json",
      text: JSON.stringify(config, null, 2)
    }]
  };
});
```

### 3. Prompt Templates
```typescript
// Reusable prompt templates
server.prompt("api_documentation", async ({ endpoint }) => ({
  name: "API Documentation Generator",
  description: "Generate comprehensive API documentation",
  messages: [
    {
      role: "system",
      content: {
        type: "text",
        text: "You are an expert API documentation writer. Create comprehensive documentation."
      }
    },
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate documentation for this API endpoint: ${endpoint}\n\nInclude:\n1. Purpose and functionality\n2. Request/response schemas\n3. Error codes\n4. Examples\n5. Rate limits`
      }
    }
  ]
}));
```

## Testing & Debugging

### 1. MCP Inspector
```bash
# Install and run
npx @modelcontextprotocol/inspector@latest

# Test different transports
# stdio: Connect via command line
# SSE: http://localhost:8787/sse
# Streamable HTTP: http://localhost:8787/streamable
```

### 2. Logging Best Practices
```typescript
// For stdio - use file/stderr logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'mcp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'mcp-combined.log' })
  ]
});

// Never use console.log with stdio transport
logger.info('Tool executed', { toolName: 'my_tool', duration: 150 });
```

### 3. Error Handling
```typescript
server.tool("robust_tool", { input: z.string() }, async ({ input }) => {
  try {
    const result = await processInput(input);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    logger.error('Tool error', { 
      error: error.message, 
      stack: error.stack,
      input,
      timestamp: new Date().toISOString()
    });
    
    return {
      content: [{
        type: "text",
        text: "I encountered an error. The issue has been logged and will be investigated."
      }],
      isError: true
    };
  }
});
```

## Migration Guide

### From Legacy to 2025 Standards
```typescript
// OLD: Legacy SDK pattern
const server = new Server({
  name: "legacy-server",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// NEW: FastMCP/McpAgent pattern
const mcp = new FastMCP("modern-server");

@mcp.tool()
async function modernTool(param: string): Promise<string> {
  return "Enhanced functionality";
}
```

### Transport Migration
```typescript
// Support both during transition
const transportType = process.env.MCP_TRANSPORT || 'stdio';

switch (transportType) {
  case 'streamable':
    server.run({ transport: 'streamable-http' });
    break;
  case 'sse':
    server.run({ transport: 'sse' });
    break;
  default:
    server.run({ transport: 'stdio' });
}
```

## Common Issues & Solutions

### Build Failures
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Validate dependencies
npm audit
npm update

# Clean rebuild
rm -rf node_modules package-lock.json
npm install
```

### Connection Issues
```bash
# Debug Claude Desktop connections
tail -f ~/Library/Logs/Claude/mcp*.log

# Test server independently
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' | node dist/index.js
```

### Authentication Problems
```typescript
// Debug OAuth context
server.tool("debug_auth", {}, async (params, context) => {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        hasClaims: !!context.props?.claims,
        userId: context.props?.claims?.sub,
        permissions: context.props?.permissions || []
      }, null, 2)
    }]
  };
});
```

## Template Quick Start

### Python FastMCP
```bash
uv init my-mcp && cd my-mcp
uv add "mcp[cli]"
cat > server.py << 'EOF'
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
async def hello(name: str) -> str:
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()
EOF
```

### TypeScript
```bash
npx create-mcp-ts my-server
cd my-server
npm install
npm run build
npm start
```

### Cloudflare Deployment
```bash
npx wrangler init my-mcp-server --from-dash
cd my-mcp-server
# Add McpAgent code
npx wrangler deploy
```

## Best Practices Summary

1. **Use Latest Standards**: Streamable HTTP for new projects, maintain SSE compatibility
2. **Security First**: OAuth 2.1, input validation, rate limiting, secrets management
3. **Container-Ready**: Design for Docker from day one, use stdio transport
4. **Tool Design**: Create purpose-built tools, not API wrappers
5. **Performance**: Cache aggressively, manage connections properly, set timeouts
6. **Testing**: Use MCP Inspector, implement proper logging, handle errors gracefully
7. **Documentation**: Clear tool descriptions, comprehensive examples, migration guides

---

**Remember**: MCP is rapidly evolving in 2025. This agent keeps you current with the latest standards while ensuring your servers are production-ready, secure, and performant!