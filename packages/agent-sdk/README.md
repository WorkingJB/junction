# Junction Agent SDK

SDK for integrating AI agents with the Junction platform.

## Installation

```bash
npm install @junction/agent-sdk
```

## Usage

```typescript
import { JunctionClient } from '@junction/agent-sdk';

// Initialize the client
const client = new JunctionClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://junction.example.com', // optional, defaults to localhost:3000
});

// Register your agent
const agent = await client.register('My Agent', 'custom', {
  version: '1.0.0',
  capabilities: ['task-execution', 'data-analysis'],
});

// Create a task
const task = await client.createTask({
  title: 'Process user data',
  description: 'Analyze and process the uploaded user data',
  priority: 'high',
});

// Update task progress
await client.updateTask(task.id, {
  status: 'in_progress',
});

// Log costs
await client.logCost({
  task_id: task.id,
  model: 'gpt-4',
  input_tokens: 1500,
  output_tokens: 500,
  cost_usd: 0.05,
});

// Request human input
await client.requestInput({
  task_id: task.id,
  prompt: 'Which data format should I use for the export?',
});

// Complete the task
await client.updateTask(task.id, {
  status: 'completed',
});

// Send periodic heartbeats
setInterval(() => {
  await client.heartbeat();
}, 30000); // every 30 seconds
```

## API Reference

### `JunctionClient`

The main client for interacting with Junction.

#### Constructor

```typescript
new JunctionClient(config: JunctionClientConfig)
```

- `config.apiKey` (string, required): Your Junction API key
- `config.baseUrl` (string, optional): The base URL of your Junction instance

#### Methods

##### `register(name, type, metadata?)`

Register your agent with Junction.

- `name` (string): Agent name
- `type` (string): Agent type (e.g., 'claude_code', 'custom')
- `metadata` (object, optional): Additional agent metadata

Returns: `Promise<Agent>`

##### `heartbeat()`

Send a heartbeat to indicate the agent is active.

Returns: `Promise<void>`

##### `createTask(data)`

Create a new task.

- `data.title` (string): Task title
- `data.description` (string, optional): Task description
- `data.priority` ('low' | 'medium' | 'high', optional): Task priority

Returns: `Promise<AgentTask>`

##### `updateTask(taskId, data)`

Update an existing task.

- `taskId` (string): The task ID
- `data` (object): Fields to update

Returns: `Promise<AgentTask>`

##### `getTasks()`

Get all tasks for this agent.

Returns: `Promise<AgentTask[]>`

##### `getTask(taskId)`

Get a specific task.

- `taskId` (string): The task ID

Returns: `Promise<AgentTask>`

##### `logCost(data)`

Log token usage and cost.

- `data.task_id` (string, optional): Associated task ID
- `data.model` (string): Model name
- `data.input_tokens` (number): Input token count
- `data.output_tokens` (number): Output token count
- `data.cost_usd` (number): Cost in USD

Returns: `Promise<void>`

##### `requestInput(data)`

Request input from the user.

- `data.task_id` (string): The task ID
- `data.prompt` (string): The prompt for the user

Returns: `Promise<void>`

##### `updateStatus(status)`

Update the agent's status.

- `status` ('active' | 'idle' | 'waiting_for_input' | 'offline' | 'error'): New status

Returns: `Promise<void>`

## License

MIT
