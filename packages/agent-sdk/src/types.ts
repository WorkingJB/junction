import { z } from 'zod';

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'waiting_for_input']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: TaskPrioritySchema.default('medium'),
  metadata: z.record(z.any()).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  error_message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const LogCostSchema = z.object({
  task_id: z.string().optional(),
  model: z.string(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
  metadata: z.record(z.any()).optional(),
});

export const RequestInputSchema = z.object({
  task_id: z.string(),
  prompt: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type LogCost = z.infer<typeof LogCostSchema>;
export type RequestInput = z.infer<typeof RequestInputSchema>;

export interface AgentTask {
  id: string;
  agent_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'waiting_for_input' | 'offline' | 'error';
  last_heartbeat: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
