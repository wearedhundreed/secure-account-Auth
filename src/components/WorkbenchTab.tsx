import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  Clock, 
  Shield, 
  Send, 
  Code2, 
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { UserSession, AuthTokens } from '../types.ts';

interface WorkbenchTabProps {
  session: UserSession | null;
  tokens: AuthTokens | null;
  onApplyTokens: (tokens: AuthTokens, sessionUser?: UserSession) => void;
}

interface EndpointPreset {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  requiresAuth: boolean;
  requiredRole?: string;
  requiredScope?: string;
  defaultBody?: any;
}

const ENDPOINTS: EndpointPreset[] = [
  {
    id: 'register',
    name: 'Register Account',
    method: 'POST',
    path: '/api/v1/auth/register',
    description: 'Registers user with bcrypt cost factor 12 & issues 15-min JWT',
    requiresAuth: false,
    defaultBody: {
      email: 'new.engineer@authforge.dev',
      password: 'SecurePassword123!',
      name: 'Morgan Blake',
      role: 'user',
      scope: 'read write offline_access'
    }
  },
  {
    id: 'login',
    name: 'Login (Seeded Admin)',
    method: 'POST',
    path: '/api/v1/auth/login',
    description: 'Verifies bcrypt password hash and returns access & refresh tokens',
    requiresAuth: false,
    defaultBody: {
      email: 'admin@authforge.dev',
      password: 'AdminPassword123!'
    }
  },
  {
    id: 'refresh',
    name: 'Refresh Token Rotation',
    method: 'POST',
    path: '/api/v1/auth/refresh',
    description: 'Rotates refresh token & issues new 15-minute access token',
    requiresAuth: false,
    defaultBody: {
      refreshToken: ''
    }
  },
  {
    id: 'auth_me',
    name: 'Get Current Profile (/me)',
    method: 'GET',
    path: '/api/v1/auth/me',
    description: 'Requires Bearer JWT. Returns authenticated profile and claims',
    requiresAuth: true
  },
  {
    id: 'data_read',
    name: 'Data Feed (Scope: read)',
    method: 'GET',
    path: '/api/v1/protected/data-feed',
    description: 'OAuth Scope Guard: Requires read scope. Fetches live data synced over internet',
    requiresAuth: true,
    requiredScope: 'read'
  },
  {
    id: 'data_write',
    name: 'Data Feed Write (Scope: write)',
    method: 'POST',
    path: '/api/v1/protected/data-feed',
    description: 'OAuth Scope Guard: Requires write scope. Commits record to cloud over internet',
    requiresAuth: true,
    requiredScope: 'write',
    defaultBody: {
      title: 'Cloud Telemetry Record',
      payload: {
        channel: 'production-us-east',
        syncedOverInternet: true,
        scope: 'write'
      }
    }
  },
  {
    id: 'internet_status',
    name: 'Internet Online Check (Live)',
    method: 'GET',
    path: '/api/v1/protected/internet-status',
    description: 'Live round-trip check: Pings remote DNS & confirms active internet connectivity',
    requiresAuth: true
  },
  {
    id: 'manager_reports',
    name: 'Manager Reports (RBAC)',
    method: 'GET',
    path: '/api/v1/protected/manager-reports',
    description: 'RBAC Guard: Restricted to roles [manager, admin]',
    requiresAuth: true,
    requiredRole: 'manager | admin'
  },
  {
    id: 'admin_dashboard',
    name: 'Admin Dashboard (RBAC)',
    method: 'GET',
    path: '/api/v1/protected/admin-dashboard',
    description: 'RBAC Guard: Strictly restricted to role [admin]',
    requiresAuth: true,
    requiredRole: 'admin'
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs (RBAC)',
    method: 'GET',
    path: '/api/v1/protected/audit-logs',
    description: 'RBAC Guard: Restricted to roles [admin, auditor]',
    requiresAuth: true,
    requiredRole: 'admin | auditor'
  },
  {
    id: 'assign_role',
    name: 'Assign User Role (Admin)',
    method: 'POST',
    path: '/api/v1/protected/admin/assign-role',
    description: 'Admin endpoint to promote/demote principal role and permissions',
    requiresAuth: true,
    requiredRole: 'admin',
    defaultBody: {
      userId: 'usr_engineer_003',
      role: 'manager'
    }
  },
  {
    id: 'logout',
    name: 'Logout & Revoke Token',
    method: 'POST',
    path: '/api/v1/auth/logout',
    description: 'Revokes active refresh token and invalidates future rotation',
    requiresAuth: false,
    defaultBody: {
      refreshToken: ''
    }
  }
];

export const WorkbenchTab: React.FC<WorkbenchTabProps> = ({
  session,
  tokens,
  onApplyTokens
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointPreset>(ENDPOINTS[1]);
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [path, setPath] = useState<string>('/api/v1/auth/login');
  const [bodyText, setBodyText] = useState<string>(
    JSON.stringify(ENDPOINTS[1].defaultBody, null, 2)
  );
  const [useAuthHeader, setUseAuthHeader] = useState<boolean>(false);
  const [customToken, setCustomToken] = useState<string>('');
  
  // Execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string> | null>(null);
  const [responseBody, setResponseBody] = useState<any>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const effectiveToken = customToken.trim() || tokens?.accessToken || '';

  const handleSelectPreset = (ep: EndpointPreset) => {
    setSelectedEndpoint(ep);
    setMethod(ep.method);
    setPath(ep.path);
    setUseAuthHeader(ep.requiresAuth);

    let defaultBody = ep.defaultBody ? { ...ep.defaultBody } : null;
    if (ep.id === 'refresh' || ep.id === 'logout') {
      if (tokens?.refreshToken) {
        defaultBody = { refreshToken: tokens.refreshToken };
      }
    }
    setBodyText(defaultBody ? JSON.stringify(defaultBody, null, 2) : '');
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBody(null);
    setResponseHeaders(null);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (useAuthHeader && effectiveToken) {
        headers['Authorization'] = `Bearer ${effectiveToken}`;
      }

      const options: RequestInit = {
        method,
        headers
      };

      if (method === 'POST' && bodyText.trim()) {
        try {
          JSON.parse(bodyText); // syntax check
          options.body = bodyText;
        } catch {
          setIsLoading(false);
          setResponseStatus(400);
          setResponseBody({
            success: false,
            error: {
              code: 'CLIENT_JSON_PARSE_ERROR',
              message: 'Request body contains invalid JSON syntax',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }

      const res = await fetch(path, options);
      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);
      setResponseStatus(res.status);

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        respHeaders[key] = val;
      });
      setResponseHeaders(respHeaders);

      const data = await res.json().catch(() => ({ raw: 'Non-JSON response received' }));
      setResponseBody(data);

      // Auto capture tokens if register/login succeeded
      if (res.ok && data?.data?.tokens && data?.data?.user) {
        onApplyTokens(data.data.tokens, data.data.user);
      } else if (res.ok && data?.data?.tokens && !data?.data?.user && session) {
        onApplyTokens(data.data.tokens, session);
      }
    } catch (err: any) {
      setLatencyMs(Math.round(performance.now() - start));
      setResponseStatus(500);
      setResponseBody({
        success: false,
        error: {
          code: 'NETWORK_FETCH_ERROR',
          message: err.message || 'Failed to communicate with API server',
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurlCommand = (): string => {
    let curl = `curl -X ${method} "http://localhost:3000${path}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;
    if (useAuthHeader && effectiveToken) {
      curl += ` \\\n  -H "Authorization: Bearer ${effectiveToken.substring(0, 30)}..."`;
    }
    if (method === 'POST' && bodyText.trim()) {
      const escaped = bodyText.replace(/"/g, '\\"').replace(/\n/g, '');
      curl += ` \\\n  -d "${escaped}"`;
    }
    return curl;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
              Live Interactive Workbench
            </span>
            <span className="text-xs text-slate-700">Production REST API Gateway</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Execute Endpoints with Live Bcrypt, JWT &amp; RBAC Validation
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Test password hashing (cost 12), token expiration (15m), refresh rotation, and permission enforcement in real time.
          </p>
        </div>

        {/* Quick Session Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <div className="text-slate-600 font-medium">Active Bearer Token</div>
            <div className="font-mono text-slate-900 font-semibold truncate max-w-[160px]">
              {tokens?.accessToken ? `${tokens.accessToken.substring(0, 16)}...` : 'None (Unset)'}
            </div>
          </div>
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2">
            <div className="text-indigo-700 font-medium">Granted Scopes</div>
            <div className="font-mono text-indigo-900 font-semibold truncate max-w-[160px]">
              {session?.scope || tokens?.scope || 'read write offline_access'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 px-1">
            Target Endpoints ({ENDPOINTS.length})
          </div>
          <div className="space-y-2">
            {ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              return (
                <button
                  key={ep.id}
                  id={`preset-${ep.id}`}
                  onClick={() => handleSelectPreset(ep)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          ep.method === 'POST'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {ep.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {ep.requiredRole && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {ep.requiredRole}
                        </span>
                      )}
                      {ep.requiredScope && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                          scope:{ep.requiredScope}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 mt-1 truncate">
                    {ep.path}
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 line-clamp-1">
                    {ep.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Request & Response Inspector */}
        <div className="lg:col-span-8 space-y-4">
          {/* Request Config Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Method, Path and Send */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <span className={`px-3 py-2 text-xs font-mono font-bold ${
                  method === 'POST' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {method}
                </span>
                <input
                  id="input-request-path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none min-w-[240px] sm:w-72"
                  placeholder="/api/v1/..."
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  id="btn-copy-curl"
                  onClick={copyCurl}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Copy as cURL"
                >
                  {copiedCurl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCurl ? 'Copied' : 'cURL'}</span>
                </button>

                <button
                  id="btn-send-request"
                  onClick={handleSendRequest}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isLoading ? 'Executing...' : 'Send Request'}</span>
                </button>
              </div>
            </div>

            {/* Auth Header Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    id="checkbox-use-auth"
                    type="checkbox"
                    checked={useAuthHeader}
                    onChange={(e) => setUseAuthHeader(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Attach Authorization Bearer Token</span>
                </label>
                {session && (
                  <span className="text-[11px] text-slate-700">
                    Active identity: <span className="font-semibold text-slate-800">{session.name} ({session.role})</span>
                  </span>
                )}
              </div>

              {useAuthHeader && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-700">
                    <span>Token (prefilled from active session):</span>
                    {tokens?.accessToken && (
                      <span className="text-emerald-700 font-mono">15m Access Token Loaded</span>
                    )}
                  </div>
                  <input
                    id="input-bearer-token"
                    type="text"
                    value={customToken || tokens?.accessToken || ''}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-[11px] font-mono px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Request Body (For POST) */}
            {method === 'POST' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    JSON Request Body:
                  </label>
                  <span className="text-[10px] font-mono text-slate-600">application/json</span>
                </div>
                <textarea
                  id="textarea-request-body"
                  rows={6}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="{}"
                />
              </div>
            )}
          </div>

          {/* Response Output Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Response Inspector
                </h3>
                {responseStatus !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-100 text-emerald-800'
                        : responseStatus === 401 || responseStatus === 403
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : responseStatus === 401 ? 'Unauthorized' : responseStatus === 403 ? 'Forbidden' : responseStatus === 409 ? 'Conflict' : 'Error'}
                  </span>
                )}
                {latencyMs !== null && (
                  <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {latencyMs}ms
                  </span>
                )}
              </div>

              {responseBody?.data?.tokens && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Tokens Loaded into Session
                </span>
              )}
            </div>

            {/* Response Body Display */}
            {responseBody ? (
              <pre
                id="pre-response-body"
                className="w-full text-xs font-mono p-4 bg-slate-950 text-emerald-300 rounded-xl border border-slate-800 overflow-x-auto max-h-[380px] leading-relaxed"
              >
                {JSON.stringify(responseBody, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-600 space-y-2">
                <Code2 className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs">
                  Click <strong className="text-slate-700">Send Request</strong> above to dispatch the API call against the local Express server.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
