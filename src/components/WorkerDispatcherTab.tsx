import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Send, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Server, 
  Layers, 
  RefreshCw, 
  Trash2, 
  Smartphone, 
  AlertTriangle,
  Flame,
  Check,
  Activity
} from 'lucide-react';
import { TestWorker, WorkerMessage } from '../server/types.ts';

const MESSAGE_TEMPLATES: Record<string, { topic: string; priority: 'low' | 'normal' | 'high' | 'urgent'; payload: any }> = {
  ping: {
    topic: 'test.ping',
    priority: 'normal',
    payload: {
      action: 'HEARTBEAT_PROBE',
      environment: 'test-sandbox-us-east1',
      timestamp: new Date().toISOString()
    }
  },
  token_revocation: {
    topic: 'auth.token.revoked',
    priority: 'urgent',
    payload: {
      action: 'INVALIDATE_TOKEN_FAMILY',
      familyId: 'fam_88ca1a2e-security-revoke',
      reason: 'REUSE_ANOMALY_SIMULATED',
      scope: 'ALL_INSTANCES',
      timestamp: new Date().toISOString()
    }
  },
  mobile_push: {
    topic: 'mobile.push',
    priority: 'high',
    payload: {
      targetApp: 'com.dhundreed.authforge',
      notification: {
        title: 'Security Alert: Test Message Received',
        body: 'Your worker daemon has processed test payload successfully.',
        badge: 1
      },
      data: { channel: 'fcm_test_broadcast', priority: 'high' }
    }
  },
  worker_alert: {
    topic: 'worker.alert',
    priority: 'urgent',
    payload: {
      alertType: 'MEMORY_THRESHOLD_TEST',
      thresholdPercent: 85,
      workerActionRequired: false,
      timestamp: new Date().toISOString()
    }
  }
};

export const WorkerDispatcherTab: React.FC = () => {
  const [workers, setWorkers] = useState<TestWorker[]>([]);
  const [history, setHistory] = useState<WorkerMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [topic, setTopic] = useState<string>('test.ping');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(MESSAGE_TEMPLATES.ping.payload, null, 2)
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const fetchWorkersAndHistory = async () => {
    setIsLoading(true);
    try {
      const [workersRes, historyRes] = await Promise.all([
        fetch('/api/v1/workers'),
        fetch('/api/v1/workers/history')
      ]);
      const workersData = await workersRes.json();
      const historyData = await historyRes.json();

      if (workersData.success && Array.isArray(workersData.data?.workers)) {
        setWorkers(workersData.data.workers);
      }
      if (historyData.success && Array.isArray(historyData.data?.messages)) {
        setHistory(historyData.data.messages);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndHistory();
  }, []);

  const handleApplyTemplate = (key: string) => {
    const tmpl = MESSAGE_TEMPLATES[key];
    if (!tmpl) return;
    setTopic(tmpl.topic);
    setPriority(tmpl.priority);
    setPayloadText(JSON.stringify(tmpl.payload, null, 2));
  };

  const handleDispatch = async () => {
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      alert('Payload is not valid JSON. Please check formatting.');
      return;
    }

    setIsSending(true);
    setLastReceipt(null);

    try {
      const res = await fetch('/api/v1/workers/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWorkerId: selectedWorkerId,
          topic,
          priority,
          payload: parsedPayload
        })
      });

      const data = await res.json();
      setLastReceipt(data);
      await fetchWorkersAndHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/v1/workers/history', { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
              Test Environment Fleet
            </span>
            <span className="text-xs text-slate-700">Environment: test-sandbox-us-east1</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Worker Test Messaging &amp; Dispatch Console
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Dispatch diagnostic events, security alerts, token invalidations, and payload commands directly to registered background workers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-workers"
            onClick={fetchWorkersAndHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Worker Fleet Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-indigo-600" />
            Registered Test Workers ({workers.length})
          </h3>
          <span className="text-xs text-slate-700">All workers receiving synthetic traffic</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((w) => (
            <div
              key={w.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs transition-all space-y-3 ${
                selectedWorkerId === w.id
                  ? 'border-indigo-400 ring-1 ring-indigo-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{w.name}</span>
                  <span className="text-[10px] font-mono text-slate-600 block mt-0.5">{w.id}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  w.status === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {w.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-700">
                {w.role}
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100 text-[10px] font-mono text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Channel:</span>
                  <span className="font-semibold text-slate-800 uppercase">{w.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivered:</span>
                  <span className="font-semibold text-emerald-700">{w.messagesReceived} messages</span>
                </div>
              </div>

              <button
                id={`btn-target-worker-${w.id}`}
                onClick={() => setSelectedWorkerId(w.id)}
                className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedWorkerId === w.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {selectedWorkerId === w.id ? 'Target Selected' : 'Select Target'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Message Composer & Live History Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Column */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-indigo-600" />
              Compose Test Message
            </h3>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              POST /api/v1/workers/dispatch
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Quick Templates:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyTemplate('ping')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Heartbeat Ping
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('token_revocation')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
              >
                Token Revocation
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('mobile_push')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              >
                Mobile Push Alert
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('worker_alert')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
              >
                Worker Alert
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Destination:
                </label>
                <select
                  id="select-target-worker"
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Broadcast to All 4 Workers</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Message Priority:
                </label>
                <select
                  id="select-message-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Topic / Event Channel:
              </label>
              <input
                id="input-message-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. test.ping, auth.token.revoked, mobile.push"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Message JSON Payload:
              </label>
              <textarea
                id="textarea-worker-payload"
                rows={5}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full text-xs font-mono p-3 bg-slate-950 text-emerald-300 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              id="btn-dispatch-test-message"
              onClick={handleDispatch}
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {isSending ? (
                <Clock className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Send className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isSending ? 'Dispatching to Test Workers...' : 'Send Test Message to Workers'}</span>
            </button>

            {/* Receipt Modal Display */}
            {lastReceipt && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1 font-mono">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Delivery Acknowledged by Worker Engine:</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  {lastReceipt.message}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History / Telemetry Column */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              Dispatched Message Telemetry ({history.length})
            </h3>
            {history.length > 0 && (
              <button
                id="btn-clear-worker-history"
                onClick={handleClearHistory}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl text-slate-600">
                <Radio className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                <p className="text-xs">No test messages dispatched yet.</p>
                <p className="text-[11px] text-slate-700 mt-1">
                  Choose a template on the left and click Send Test Message to verify worker responsiveness.
                </p>
              </div>
            ) : (
              history.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{msg.topic}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        msg.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : msg.priority === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {msg.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
                      <span className="text-emerald-700 font-bold">{msg.latencyMs}ms latency</span>
                      <span>{new Date(msg.sentAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Target: <strong>{msg.workerName}</strong></span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {msg.status}
                    </span>
                  </div>

                  <pre className="text-[10px] font-mono p-2 bg-slate-950 text-slate-300 rounded-lg overflow-x-auto max-h-20">
                    {JSON.stringify(msg.payload, null, 2)}
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
