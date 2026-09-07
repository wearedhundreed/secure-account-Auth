import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  Copy, 
  Check, 
  ExternalLink, 
  Radio, 
  Send, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Terminal,
  Clock,
  Layers
} from 'lucide-react';

interface CallbackHubTabProps {
  userEmail?: string;
}

interface WebhookLogItem {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  clientIp?: string;
}

export const CallbackHubTab: React.FC<CallbackHubTabProps> = ({ userEmail = 'weare@dhundreed.com' }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProvider, setSimProvider] = useState<'google' | 'worker' | 'custom'>('google');
  const [customJson, setCustomJson] = useState<string>('{\n  "event": "worker.alert",\n  "workerId": "worker-audit-logger-02",\n  "severity": "HIGH",\n  "message": "Token anomaly detected in test sandbox"\n}');

  const devAppUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';
  const sharedAppUrl = devAppUrl;

  const callbackUrls = [
    {
      id: 'oauth-dev',
      label: 'OAuth 2.0 / OIDC Redirect Callback URL (Dev)',
      url: `${devAppUrl}/api/v1/auth/callback`,
      tag: 'Development',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Register as "Authorized redirect URI" in Google Cloud Console or GitHub OAuth Apps settings.'
    },
    {
      id: 'oauth-pre',
      label: 'OAuth 2.0 / OIDC Redirect Callback URL (Shared / Prod)',
      url: `${sharedAppUrl}/api/v1/auth/callback`,
      tag: 'Shared / Preview',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Production-ready callback URI for external identity providers.'
    },
    {
      id: 'firebase-handler',
      label: 'Firebase Auth Handler Domain',
      url: `${devAppUrl}/__/auth/handler`,
      tag: 'OIDC Handler',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Official Firebase SDK redirect/popup auth domain for cross-origin authentication.'
    },
    {
      id: 'webhook-general',
      label: 'General Webhook Callback Receiver',
      url: `${devAppUrl}/api/v1/webhooks/callback`,
      tag: 'Webhooks Ingest',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Receives POST payloads from external platforms, payment gateways, and third-party services.'
    },
    {
      id: 'worker-callback',
      label: 'Worker Test Event Callback Ingest',
      url: `${devAppUrl}/api/v1/webhooks/worker-event`,
      tag: 'Worker Fleet',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      description: 'Ingest endpoint for task completion receipts, health pings, and asynchronous worker messages.'
    }
  ];

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/v1/webhooks/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.logs)) {
        setLogs(data.data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/v1/webhooks/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateCallback = async () => {
    setIsSimulating(true);
    try {
      let bodyPayload: any = undefined;
      if (simProvider === 'custom') {
        try {
          bodyPayload = JSON.parse(customJson);
        } catch {
          alert('Invalid JSON in custom payload');
          setIsSimulating(false);
          return;
        }
      }

      await fetch('/api/v1/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: simProvider,
          customBody: bodyPayload
        })
      });

      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-violet-50 text-violet-700 rounded-md border border-violet-200">
              External Integration Registry
            </span>
            <span className="text-xs text-slate-700">Account: {userEmail}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Callback URLs &amp; Inbound Webhook Center
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Configured endpoints for OAuth 2.0 / OpenID Connect redirect flows, third-party webhook subscriptions, and worker telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 px-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-slate-700">
            Listener Active on Port 3000
          </span>
        </div>
      </div>

      {/* Callback URLs Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Webhook className="w-4 h-4 text-indigo-600" />
          Configured Callback Endpoints
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {callbackUrls.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${item.tagColor}`}>
                    {item.tag}
                  </span>
                </div>
                <button
                  id={`btn-copy-${item.id}`}
                  onClick={() => handleCopy(item.url, item.id)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 text-indigo-300 font-mono text-xs rounded-lg break-all border border-slate-800">
                {item.url}
              </div>

              <p className="text-[11px] text-slate-700">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Simulate Inbound Event & Live Captured Webhook Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Simulator Column */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-indigo-600" />
              Simulate Inbound Callback Event
            </h3>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              POST /simulate
            </span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Payload Archetype:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSimProvider('google')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  simProvider === 'google'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                OAuth Exchange
              </button>
              <button
                type="button"
                onClick={() => setSimProvider('worker')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  simProvider === 'worker'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Worker Heartbeat
              </button>
              <button
                type="button"
                onClick={() => setSimProvider('custom')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  simProvider === 'custom'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Custom JSON
              </button>
            </div>

            {simProvider === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Custom Event Body:
                </label>
                <textarea
                  rows={4}
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-slate-950 text-emerald-300 rounded-lg border border-slate-800 focus:outline-none"
                />
              </div>
            )}

            <button
              id="btn-dispatch-sim-callback"
              onClick={handleSimulateCallback}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSimulating ? 'Dispatching Inbound Callback...' : 'Trigger Simulated Inbound Callback'}
            </button>
          </div>
        </div>

        {/* Live Logs Stream Column */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Live Callback Ingestion Audit Log ({logs.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                id="btn-refresh-webhook-logs"
                onClick={fetchLogs}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {logs.length > 0 && (
                <button
                  id="btn-clear-webhook-logs"
                  onClick={handleClearLogs}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-600">
                <Radio className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                <p className="text-xs">No callback events recorded yet.</p>
                <p className="text-[11px] text-slate-700 mt-1">
                  Trigger a simulated callback or send a POST request to your callback URL to test live ingestion.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                        {log.method}
                      </span>
                      <span className="font-mono text-slate-900 font-semibold">{log.path}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <pre className="text-[11px] font-mono p-2 bg-slate-950 text-slate-200 rounded-lg overflow-x-auto max-h-24">
                    {JSON.stringify(log.body || log.query || {}, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
