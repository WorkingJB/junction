'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

interface Integration {
  id: string;
  provider: string;
  syncEnabled: boolean;
  lastSync?: string;
  syncErrors: number;
  lastError?: string;
  webhookId?: string;
  requiresPolling: boolean;
}

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  supportsWebhooks: boolean;
  docsUrl?: string;
}

const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Sync tasks with your Todoist account',
    icon: '✓',
    tier: 1,
    supportsWebhooks: true,
    docsUrl: 'https://developer.todoist.com',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Sync tasks with your Asana workspace',
    icon: 'A',
    tier: 1,
    supportsWebhooks: true,
    docsUrl: 'https://developers.asana.com',
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Sync tasks with your ClickUp workspace',
    icon: 'C',
    tier: 1,
    supportsWebhooks: true,
    docsUrl: 'https://clickup.com/api',
  },
];

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectProvider = async (provider: string) => {
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/integrations/${provider}/oauth`;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const disconnectProvider = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to disconnect integration');

      setSuccessMessage('Integration disconnected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchIntegrations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const syncNow = async (integrationId: string, provider: string) => {
    setSyncing(integrationId);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to sync');

      const data = await response.json();
      setSuccessMessage(
        `Synced successfully: ${data.tasksCreated || 0} created, ${data.tasksUpdated || 0} updated`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchIntegrations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const getIntegrationStatus = (provider: string): Integration | null => {
    return integrations.find((i) => i.provider === provider) || null;
  };

  const formatLastSync = (lastSync?: string): string => {
    if (!lastSync) return 'Never';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-medium">Task Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external task management platforms to sync your tasks
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-start gap-2">
          <Check className="h-4 w-4 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        {AVAILABLE_PROVIDERS.map((provider) => {
          const integration = getIntegrationStatus(provider.id);
          const isConnected = !!integration;
          const hasErrors = integration && integration.syncErrors > 0;

          return (
            <div
              key={provider.id}
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                    {provider.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{provider.name}</h4>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      {hasErrors && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <X className="h-3 w-3" />
                          Sync Error
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                    {isConnected && integration && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Last sync: {formatLastSync(integration.lastSync)}</p>
                        {integration.requiresPolling && (
                          <p className="text-amber-600 dark:text-amber-500">
                            Polling-based (syncs every 15 minutes)
                          </p>
                        )}
                        {integration.webhookId && (
                          <p className="text-green-600 dark:text-green-500">
                            Webhooks enabled (real-time sync)
                          </p>
                        )}
                        {hasErrors && integration.lastError && (
                          <p className="text-destructive">{integration.lastError}</p>
                        )}
                      </div>
                    )}
                    {provider.docsUrl && (
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View documentation
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isConnected && integration ? (
                    <>
                      <button
                        onClick={() => syncNow(integration.id, provider.id)}
                        disabled={syncing === integration.id}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${syncing === integration.id ? 'animate-spin' : ''}`}
                        />
                        Sync Now
                      </button>
                      <button
                        onClick={() => disconnectProvider(integration.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connectProvider(provider.id)}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="text-sm font-medium mb-2">Coming Soon</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Additional integrations are being developed:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Google Tasks</li>
          <li>• Microsoft To Do & Planner</li>
          <li>• Monday.com</li>
          <li>• Basecamp</li>
          <li>• TickTick</li>
        </ul>
      </div>
    </div>
  );
}
