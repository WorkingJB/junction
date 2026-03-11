#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Configuration from environment variables
const JUNCTION_API_URL = process.env.JUNCTION_API_URL || 'http://localhost:3000';
const JUNCTION_API_KEY = process.env.JUNCTION_API_KEY;

if (!JUNCTION_API_KEY) {
  console.error('Error: JUNCTION_API_KEY environment variable is required');
  process.exit(1);
}

// Helper function to make authenticated API calls
async function junctionAPI(endpoint: string, options: any = {}) {
  const url = `${JUNCTION_API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JUNCTION_API_KEY}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'junction-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_task',
        description: 'Create a new task for this agent in Junction',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed task description',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority level',
            },
            estimated_duration: {
              type: 'number',
              description: 'Estimated duration in minutes',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as JSON object',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task_status',
        description: 'Update the status of an existing task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to update',
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
              description: 'New status for the task',
            },
            result: {
              type: 'string',
              description: 'Task result or output (optional)',
            },
            error: {
              type: 'string',
              description: 'Error message if task failed (optional)',
            },
          },
          required: ['task_id', 'status'],
        },
      },
      {
        name: 'get_tasks',
        description: 'Get all tasks for this agent',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
              description: 'Filter by status (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (optional)',
            },
          },
        },
      },
      {
        name: 'log_cost',
        description: 'Log token usage and cost for API calls',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model name (e.g., "claude-3-5-sonnet-20241022")',
            },
            input_tokens: {
              type: 'number',
              description: 'Number of input tokens used',
            },
            output_tokens: {
              type: 'number',
              description: 'Number of output tokens generated',
            },
            cost_usd: {
              type: 'number',
              description: 'Total cost in USD',
            },
            agent_task_id: {
              type: 'string',
              description: 'Associated task ID (optional)',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata (optional)',
            },
          },
          required: ['model', 'input_tokens', 'output_tokens', 'cost_usd'],
        },
      },
      {
        name: 'request_human_input',
        description: 'Request input from a human by updating task status to waiting_for_input',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID that needs input',
            },
            prompt: {
              type: 'string',
              description: 'Question or prompt for the human',
            },
          },
          required: ['task_id', 'prompt'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_task': {
        const result = await junctionAPI('/api/agent-tasks', {
          method: 'POST',
          body: JSON.stringify(args),
        }) as any;

        return {
          content: [
            {
              type: 'text',
              text: `Task created successfully!\n\nTask ID: ${result.task.id}\nTitle: ${result.task.title}\nStatus: ${result.task.status}\nPriority: ${result.task.priority}`,
            },
          ],
        };
      }

      case 'update_task_status': {
        const { task_id, ...updateData } = args as any;
        const result = await junctionAPI(`/api/agent-tasks/${task_id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }) as any;

        return {
          content: [
            {
              type: 'text',
              text: `Task updated successfully!\n\nTask ID: ${result.task.id}\nStatus: ${result.task.status}\nUpdated: ${result.task.updated_at}`,
            },
          ],
        };
      }

      case 'get_tasks': {
        const queryParams = new URLSearchParams();
        if ((args as any).status) {
          queryParams.append('status', (args as any).status);
        }
        if ((args as any).limit) {
          queryParams.append('limit', (args as any).limit.toString());
        }

        const result = await junctionAPI(
          `/api/agent-tasks?${queryParams.toString()}`
        ) as any;

        const tasksText = result.tasks
          .map(
            (task: any) =>
              `• ${task.title} (${task.status}) - Priority: ${task.priority}\n  ID: ${task.id}\n  Created: ${task.created_at}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.tasks.length} tasks:\n\n${tasksText}`,
            },
          ],
        };
      }

      case 'log_cost': {
        const result = await junctionAPI('/api/agent-costs', {
          method: 'POST',
          body: JSON.stringify(args),
        }) as any;

        return {
          content: [
            {
              type: 'text',
              text: `Cost logged successfully!\n\nModel: ${result.cost.model}\nTokens: ${result.cost.input_tokens} in / ${result.cost.output_tokens} out\nCost: $${result.cost.cost_usd.toFixed(4)}`,
            },
          ],
        };
      }

      case 'request_human_input': {
        const { task_id, prompt } = args as any;

        // Update task to waiting_for_input status with the prompt in metadata
        const result = await junctionAPI(`/api/agent-tasks/${task_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'waiting_for_input',
            metadata: {
              human_input_prompt: prompt,
              requested_at: new Date().toISOString(),
            },
          }),
        }) as any;

        return {
          content: [
            {
              type: 'text',
              text: `Human input requested for task "${result.task.title}".\n\nPrompt: ${prompt}\n\nThe task status has been updated to waiting_for_input. You can check the Junction dashboard for the response.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'junction://tasks',
        name: 'Agent Tasks',
        description: 'List of all tasks for this agent',
        mimeType: 'application/json',
      },
      {
        uri: 'junction://tasks/pending',
        name: 'Pending Tasks',
        description: 'Tasks with pending status',
        mimeType: 'application/json',
      },
      {
        uri: 'junction://tasks/in_progress',
        name: 'In Progress Tasks',
        description: 'Tasks currently in progress',
        mimeType: 'application/json',
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    let status: string | undefined;

    if (uri === 'junction://tasks') {
      status = undefined;
    } else if (uri === 'junction://tasks/pending') {
      status = 'pending';
    } else if (uri === 'junction://tasks/in_progress') {
      status = 'in_progress';
    } else {
      throw new Error(`Unknown resource: ${uri}`);
    }

    const queryParams = new URLSearchParams();
    if (status) {
      queryParams.append('status', status);
    }

    const result = await junctionAPI(`/api/agent-tasks?${queryParams.toString()}`) as any;

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result.tasks, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `Error reading resource: ${error.message}`,
        },
      ],
    };
  }
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
