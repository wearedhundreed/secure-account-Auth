import React, { useState, useEffect } from 'react';
import { 
  PlugZap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  SlidersHorizontal, 
  Power, 
  PowerOff, 
  Copy, 
  Check, 
  ExternalLink, 
  Radio, 
  Cpu, 
  Cloud, 
  Smartphone, 
  Activity, 
  Globe, 
  MessageSquare, 
  CreditCard, 
  Phone, 
  Shield, 
  ShieldCheck, 
  Flame, 
  Zap, 
  CheckCheck,
  Send,
  Terminal,
  Sparkles,
  Layers
} from 'lucide-react';
import { IntegrationApp, IntegrationCategory } from '../types.ts';

interface IntegrationsTabProps {
  onNotify?: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = () => {
  const [integrations, setIntegrations] = useState<IntegrationApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnablingAll, setIsEnablingAll] = useState<boolean>(false);
  const [isDisablingAll, setIsDisablingAll] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>({
    text: 'All 16 integration apps are loaded and ready in the AuthForge ecosystem.',
    type: 'success'
  });

  // Fetch all integrations on mount
  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/integrations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.integrations)) {
        setIntegrations(json.data.integrations);
      }
    } catch (err) {
      console.error('Failed to fetch integrations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  // Enable all integrations
  const handleEnableAll = async () => {
    setIsEnablingAll(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/v1/integrations/enable-all', {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.integrations)) {
        setIntegrations(json.data.integrations);
        setActionMessage({
          text: `Success: All ${json.data.integrations.length} integration applications are now ENABLED and active!`,
          type: 'success'
        });
      }
    } catch (err: any) {
      setActionMessage({
        text: `Error enabling integrations: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsEnablingAll(false);
    }
  };

  // Disable all integrations
  const handleDisableAll = async () => {
    setIsDisablingAll(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/v1/integrations/disable-all', {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.integrations)) {
        setIntegrations(json.data.integrations);
        setActionMessage({
          text: 'All integrations set to standby/disabled.',
          type: 'info'
        });
      }
    } catch (err: any) {
      setActionMessage({
        text: `Error disabling integrations: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsDisablingAll(false);
    }
  };

  // Toggle individual integration
  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/v1/integrations/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      const json = await res.json();
      if (json.success && json.data?.integration) {
        setIntegrations(prev => 
          prev.map(item => item.id === id ? json.data.integration : item)
        );
      }
    } catch (err) {
      console.error('Failed to toggle integration', err);
    }
  };

  // Run ping / handshake test on integration
  const handleTestPing = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/v1/integrations/${id}/test`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTestResults(prev => ({
          ...prev,
          [id]: json.data
        }));
        // Update local latency & health
        setIntegrations(prev => prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              health: 'HEALTHY',
              latencyMs: json.data.latencyMs,
              lastSynced: new Date().toISOString()
            };
          }
          return item;
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: err.message }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render Category Icon
  const renderAppIcon = (iconName: string, category: IntegrationCategory) => {
    const className = "w-5 h-5";
    switch (iconName) {
      case 'google':
        return <Globe className={`${className} text-blue-600`} />;
      case 'github':
        return <Terminal className={`${className} text-slate-900`} />;
      case 'microsoft':
        return <Layers className={`${className} text-cyan-600`} />;
      case 'shield':
      case 'shieldCheck':
        return <ShieldCheck className={`${className} text-emerald-600`} />;
      case 'flame':
        return <Flame className={`${className} text-amber-500`} />;
      case 'radio':
        return <Radio className={`${className} text-indigo-600`} />;
      case 'cpu':
        return <Cpu className={`${className} text-violet-600`} />;
      case 'cloud':
        return <Cloud className={`${className} text-orange-500`} />;
      case 'smartphone':
        return <Smartphone className={`${className} text-emerald-600`} />;
      case 'activity':
        return <Activity className={`${className} text-purple-600`} />;
      case 'alertTriangle':
        return <AlertTriangle className={`${className} text-amber-600`} />;
      case 'globe':
        return <Globe className={`${className} text-sky-600`} />;
      case 'messageSquare':
        return <MessageSquare className={`${className} text-emerald-600`} />;
      case 'creditCard':
        return <CreditCard className={`${className} text-indigo-600`} />;
      case 'phone':
        return <Phone className={`${className} text-teal-600`} />;
      default:
        return <PlugZap className={`${className} text-slate-700`} />;
    }
  };

  // Filtered list
  const filteredApps = integrations.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch = 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const totalCount = integrations.length;
  const enabledCount = integrations.filter(i => i.enabled).length;
  const allAreEnabled = totalCount > 0 && enabledCount === totalCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 flex items-center gap-1.5">
                <PlugZap className="w-3.5 h-3.5" />
                AuthForge Integration Ecosystem
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" />
                {enabledCount} of {totalCount} Connected
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              All Integration Apps &amp; Service Connectors
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Complete catalog of Identity SSO providers, distributed message brokers, security SIEM forwarders, and communication webhooks configured for instant authorization.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-enable-all-integrations"
              onClick={handleEnableAll}
              disabled={isEnablingAll || isLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isEnablingAll ? 'animate-bounce' : ''}`} />
              {isEnablingAll ? 'Enabling All...' : 'Enable All Integrations'}
            </button>

            <button
              id="btn-disable-all-integrations"
              onClick={handleDisableAll}
              disabled={isDisablingAll || isLoading}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              <PowerOff className="w-4 h-4 inline mr-1.5" />
              Disable All
            </button>

            <button
              id="btn-refresh-integrations"
              onClick={fetchIntegrations}
              disabled={isLoading}
              title="Refresh integrations list"
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Status Toast Banner */}
        {actionMessage && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center justify-between border ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : actionMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage.text}</span>
            </div>
            <button 
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Metric Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-xs text-slate-500 font-medium">Total Registered</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalCount} Apps</div>
            <span className="text-[11px] text-slate-400">across 4 core tiers</span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
            <span className="text-xs text-emerald-700 font-medium">Active &amp; Enabled</span>
            <div className="text-xl font-bold text-emerald-900 mt-0.5">{enabledCount} / {totalCount}</div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {allAreEnabled ? '100% Operational' : `${Math.round((enabledCount/totalCount)*100)}% Active`}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-xs text-slate-500 font-medium">Protocols Covered</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">6 Protocols</div>
            <span className="text-[11px] text-slate-400">OIDC, AMQP, Kafka, FCM</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-xs text-slate-500 font-medium">Global Health</span>
            <div className="text-xl font-bold text-indigo-700 mt-0.5">Healthy (99.9%)</div>
            <span className="text-[11px] text-slate-400">Avg roundtrip: ~24ms</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Apps', count: totalCount },
            { id: 'identity', label: 'Identity & SSO', count: integrations.filter(i => i.category === 'identity').length },
            { id: 'messaging', label: 'Queues & Brokers', count: integrations.filter(i => i.category === 'messaging').length },
            { id: 'security', label: 'Security & SIEM', count: integrations.filter(i => i.category === 'security').length },
            { id: 'communications', label: 'Webhooks & Alerts', count: integrations.filter(i => i.category === 'communications').length }
          ].map(cat => (
            <button
              key={cat.id}
              id={`filter-cat-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-integrations-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps, protocols, features..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Grid of Integration Cards */}
      {filteredApps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <PlugZap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No integration apps found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map(app => {
            const isTesting = testingId === app.id;
            const testResult = testResults[app.id];

            return (
              <div
                key={app.id}
                id={`integration-card-${app.id}`}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                  app.enabled 
                    ? 'border-slate-200 hover:border-indigo-300 hover:shadow-sm' 
                    : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Card Header: Icon, Name, Toggle Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {renderAppIcon(app.iconName, app.category)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {app.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            {app.protocol}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            app.enabled 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {app.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enable/Disable Switch */}
                    <button
                      id={`toggle-${app.id}`}
                      onClick={() => handleToggle(app.id, app.enabled)}
                      title={app.enabled ? 'Click to disable' : 'Click to enable'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        app.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          app.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                    {app.description}
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {app.features.map((feat, idx) => (
                      <span 
                        key={idx}
                        className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200/70 px-1.5 py-0.5 rounded"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* Target Endpoint Box */}
                  <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-2">
                    <div className="truncate font-mono text-[10px] text-slate-700" title={app.endpoint}>
                      {app.endpoint}
                    </div>
                    <button
                      onClick={() => copyToClipboard(app.endpoint, app.id)}
                      title="Copy endpoint URL"
                      className="text-slate-400 hover:text-slate-700 shrink-0 p-1 rounded hover:bg-slate-200"
                    >
                      {copiedId === app.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Test Ping Result Banner if available */}
                  {testResult && (
                    <div className={`mt-2 p-2 rounded-lg text-[11px] font-mono border ${
                      testResult.success 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{testResult.message}</span>
                        {testResult.latencyMs && (
                          <span className="text-emerald-700">{testResult.latencyMs}ms</span>
                        )}
                      </div>
                      {testResult.receipt?.handshakeReceipt && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          Receipt: {testResult.receipt.handshakeReceipt}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${app.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[11px]">
                      {app.enabled ? `${app.latencyMs}ms latency` : 'Standby'}
                    </span>
                  </div>

                  <button
                    id={`btn-ping-${app.id}`}
                    onClick={() => handleTestPing(app.id)}
                    disabled={isTesting}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    {isTesting ? 'Pinging...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REST API & Quick Code Reference */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Integration Ecosystem REST API
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">authforge-v1</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs font-mono">
          <div>
            <span className="text-slate-400 block mb-1"># 1. Fetch all integration apps status</span>
            <pre className="bg-slate-950 p-2.5 rounded-lg text-emerald-300 overflow-x-auto">
              curl -X GET http://localhost:3000/api/v1/integrations
            </pre>
          </div>

          <div>
            <span className="text-slate-400 block mb-1"># 2. Bulk enable all integrations with 1 call</span>
            <pre className="bg-slate-950 p-2.5 rounded-lg text-cyan-300 overflow-x-auto">
              curl -X POST http://localhost:3000/api/v1/integrations/enable-all
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
