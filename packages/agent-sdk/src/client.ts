import type { CreateTask, UpdateTask, LogCost, RequestInput, AgentTask, Agent } from './types';
import { CreateTaskSchema, UpdateTaskSchema, LogCostSchema, RequestInputSchema } from './types';

export interface OrqestrClientConfig {
  apiKey: string;
  baseUrl?: string;
}

// Legacy export for backwards compatibility
export type JunctionClientConfig = OrqestrClientConfig;

export class OrqestrClient {
  private apiKey: string;
  private baseUrl: string;
  private agentId?: string;

  constructor(config: OrqestrClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Register this agent with Orqestr
   */
  async register(name: string, type: string, metadata?: Record<string, any>): Promise<Agent> {
    const agent = await this.request<Agent>('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name, type, metadata }),
    });
    this.agentId = agent.id;
    return agent;
  }

  /**
   * Send a heartbeat to indicate the agent is still active
   */
  async heartbeat(): Promise<void> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    await this.request(`/api/agents/${this.agentId}/heartbeat`, {
      method: 'POST',
    });
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTask): Promise<AgentTask> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    const validated = CreateTaskSchema.parse(data);
    return this.request<AgentTask>(`/api/agents/${this.agentId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, data: UpdateTask): Promise<AgentTask> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    const validated = UpdateTaskSchema.parse(data);
    return this.request<AgentTask>(`/api/agents/${this.agentId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(validated),
    });
  }

  /**
   * Get all tasks for this agent
   */
  async getTasks(): Promise<AgentTask[]> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    return this.request<AgentTask[]>(`/api/agents/${this.agentId}/tasks`);
  }

  /**
   * Get a specific task
   */
  async getTask(taskId: string): Promise<AgentTask> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    return this.request<AgentTask>(`/api/agents/${this.agentId}/tasks/${taskId}`);
  }

  /**
   * Log token usage and cost
   */
  async logCost(data: LogCost): Promise<void> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    const validated = LogCostSchema.parse(data);
    await this.request(`/api/agents/${this.agentId}/costs`, {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /**
   * Request input from the user
   */
  async requestInput(data: RequestInput): Promise<void> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    const validated = RequestInputSchema.parse(data);
    await this.request(`/api/agents/${this.agentId}/waiting`, {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /**
   * Update agent status
   */
  async updateStatus(status: 'active' | 'idle' | 'waiting_for_input' | 'offline' | 'error'): Promise<void> {
    if (!this.agentId) {
      throw new Error('Agent not registered. Call register() first.');
    }
    await this.request(`/api/agents/${this.agentId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }
}

// Legacy export for backwards compatibility
export const JunctionClient = OrqestrClient;
