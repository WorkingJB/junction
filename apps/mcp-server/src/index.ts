#!/usr/bin/env node

/**
 * Junction MCP Server
 *
 * Provides MCP integration for AI agents to interact with Junction.
 *
 * Features:
 * - Task resources (list and get agent tasks)
 * - Task tools (create, update, complete tasks)
 * - Progress reporting
 * - Request human input (elicitation)
 * - Cost logging
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Placeholder server - will be implemented in Phase 3
const server = new Server(
  {
    name: 'junction-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'tasks://list',
        name: 'Agent Tasks',
        description: 'List all tasks for this agent',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  // TODO: Implement resource reading
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: 'application/json',
        text: JSON.stringify({ tasks: [] }),
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_task',
        description: 'Create a new agent task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority'
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task ID' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'waiting_for_input'],
              description: 'New task status'
            },
            error_message: { type: 'string', description: 'Error message if failed' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'log_cost',
        description: 'Log token usage and cost',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Associated task ID' },
            model: { type: 'string', description: 'Model name' },
            input_tokens: { type: 'number', description: 'Input token count' },
            output_tokens: { type: 'number', description: 'Output token count' },
            cost_usd: { type: 'number', description: 'Cost in USD' },
          },
          required: ['model', 'input_tokens', 'output_tokens', 'cost_usd'],
        },
      },
      {
        name: 'request_input',
        description: 'Request input from the user',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task ID' },
            prompt: { type: 'string', description: 'Prompt for the user' },
          },
          required: ['task_id', 'prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // TODO: Implement tool calls
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: true, message: 'Tool not yet implemented' }),
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Junction MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
