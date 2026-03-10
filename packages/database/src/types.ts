// Database types - will be generated from Supabase schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          type: 'work' | 'personal';
          due_date: string | null;
          completed_at: string | null;
          integration_id: string | null;
          external_id: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at'>>;
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          status: 'active' | 'idle' | 'waiting_for_input' | 'offline' | 'error';
          api_key: string;
          last_heartbeat: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at'>>;
      };
      agent_tasks: {
        Row: {
          id: string;
          agent_id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting_for_input';
          priority: 'low' | 'medium' | 'high';
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_tasks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['agent_tasks']['Row'], 'id' | 'created_at'>>;
      };
      agent_costs: {
        Row: {
          id: string;
          agent_id: string;
          agent_task_id: string | null;
          user_id: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          timestamp: string;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['agent_costs']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['agent_costs']['Row'], 'id' | 'timestamp'>>;
      };
      task_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: 'todoist' | 'microsoft_todo' | 'asana' | 'linear' | 'jira';
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          last_sync: string | null;
          sync_enabled: boolean;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['task_integrations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['task_integrations']['Row'], 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          agent_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          changes: Record<string, any> | null;
          ip_address: string | null;
          user_agent: string | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'> & {
          id?: string;
          timestamp?: string;
        };
        Update: never; // Audit logs should not be updated
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
