export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Junction - Your unified task and agent management platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Human Tasks</h3>
          <p className="mt-2 text-2xl font-bold">0</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks from you and integrations
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Agent Tasks</h3>
          <p className="mt-2 text-2xl font-bold">0</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks being worked on by agents
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Active Agents</h3>
          <p className="mt-2 text-2xl font-bold">0</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Agents currently online
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Getting Started</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Phase 1: Foundation - Complete!</li>
          <li>→ Next: Implement human task management (Phase 2)</li>
          <li>• Then: Add agent integration layer (Phase 3)</li>
        </ul>
      </div>
    </div>
  );
}
