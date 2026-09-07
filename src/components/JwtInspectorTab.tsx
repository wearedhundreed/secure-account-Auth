import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  RefreshCw,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { AuthTokens, UserSession } from '../types.ts';

interface JwtInspectorTabProps {
  tokens: AuthTokens | null;
  session: UserSession | null;
  onRefreshTokens: () => void;
}

export const JwtInspectorTab: React.FC<JwtInspectorTabProps> = ({
  tokens,
  session,
  onRefreshTokens
}) => {
  const [tokenInput, setTokenInput] = useState<string>(tokens?.accessToken || '');
  const [copied, setCopied] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [tamperedRole, setTamperedRole] = useState<string>('admin');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (tokens?.accessToken) {
      setTokenInput(tokens.accessToken);
    }
  }, [tokens?.accessToken]);

  // Decode JWT segments
  const parseJwt = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { header, payload, signature: parts[2] };
    } catch {
      return null;
    }
  };

  const parsed = parseJwt(tokenInput);

  // Live countdown timer for 15-minute token
  useEffect(() => {
    if (!parsed?.payload?.exp) {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = parsed.payload.exp - nowSec;
      setSecondsRemaining(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [parsed?.payload?.exp]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Tamper token payload to demonstrate signature verification failure
  const handleVerifyTamperTest = async () => {
    if (!parsed) return;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      // Modify payload to forge role
      const tamperedPayload = { ...parsed.payload, role: tamperedRole };
      const forgedB64 = btoa(JSON.stringify(tamperedPayload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const parts = tokenInput.split('.');
      const tamperedToken = `${parts[0]}.${forgedB64}.${parts[2]}`;

      // Dispatch to /api/v1/auth/me to verify
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`
        }
      });
      const data = await res.json();
      setVerifyResult({ status: res.status, data });
    } catch (err: any) {
      setVerifyResult({ status: 500, data: { error: err.message } });
    } finally {
      setIsVerifying(false);
    }
  };

  const totalWindowSeconds = 900; // 15 minutes
  const progressPercent = secondsRemaining !== null 
    ? Math.min(100, Math.max(0, (secondsRemaining / totalWindowSeconds) * 100))
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-violet-50 text-violet-700 rounded-md border border-violet-200">
              JWT Diagnostics
            </span>
            <span className="text-xs text-slate-700">15-Minute Expiry Spec</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Cryptographic Token Inspector &amp; Lifecycle Monitor
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Inspect RS256 / HS256 claims, countdown timer, signature integrity, and refresh token rotation lineage.
          </p>
        </div>

        {/* 15-Minute Expiry Meter */}
        {secondsRemaining !== null && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[220px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Token TTL:
              </span>
              <span className={`font-mono font-bold ${secondsRemaining > 60 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {secondsRemaining > 0 ? formatSeconds(secondsRemaining) : 'EXPIRED'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  secondsRemaining > 120 ? 'bg-emerald-500' : secondsRemaining > 30 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
              <span>Issued (0m)</span>
              <span>Limit (15m)</span>
            </div>
          </div>
        )}
      </div>

      {/* Raw Token Input Field */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-500" />
            Active Raw JWT Access Token:
          </label>
          <div className="flex items-center gap-2">
            <button
              id="btn-copy-raw-jwt"
              onClick={() => copyToClipboard(tokenInput, 'raw')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
            >
              {copied === 'raw' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied === 'raw' ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              id="btn-trigger-refresh"
              onClick={onRefreshTokens}
              className="text-xs text-indigo-700 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded border border-indigo-200 hover:bg-indigo-100"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rotate / Refresh</span>
            </button>
          </div>
        </div>
        <textarea
          id="textarea-jwt-input"
          rows={3}
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Paste JWT here (header.payload.signature)..."
          className="w-full text-xs font-mono p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 break-all"
        />
      </div>

      {/* Decoded Inspection Cards */}
      {parsed ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Header Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4" />
                1. Token Header
              </span>
              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                Algorithm &amp; Type
              </span>
            </div>
            <pre className="text-xs font-mono p-3 bg-slate-950 text-rose-300 rounded-xl overflow-x-auto leading-relaxed">
              {JSON.stringify(parsed.header, null, 2)}
            </pre>
            <div className="text-[11px] text-slate-700 space-y-1">
              <div>• <strong>alg:</strong> {parsed.header.alg || 'HS256'} (HMAC SHA-256)</div>
              <div>• <strong>typ:</strong> {parsed.header.typ || 'JWT'}</div>
            </div>
          </div>

          {/* Payload Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                2. Payload Claims
              </span>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                Data &amp; Permissions
              </span>
            </div>
            <pre className="text-xs font-mono p-3 bg-slate-950 text-purple-300 rounded-xl overflow-x-auto max-h-64 leading-relaxed">
              {JSON.stringify(parsed.payload, null, 2)}
            </pre>
            <div className="text-[11px] text-slate-700 space-y-1">
              <div>• <strong>Role:</strong> <span className="font-semibold text-slate-900">{parsed.payload.role}</span></div>
              <div>• <strong>Scope:</strong> <span className="font-mono text-indigo-700 font-semibold">{parsed.payload.scope || 'read write offline_access'}</span></div>
              <div>• <strong>Permissions:</strong> {(parsed.payload.permissions || []).join(', ')}</div>
              <div>• <strong>TTL:</strong> 15 minutes (900s)</div>
            </div>
          </div>

          {/* Signature & Tamper Simulator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                3. Signature &amp; Tamper Test
              </span>
              <span className="text-[10px] font-mono bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200">
                Cryptographic Seal
              </span>
            </div>

            <div className="p-3 bg-slate-950 text-cyan-300 font-mono text-xs rounded-xl break-all">
              {parsed.signature || 'None'}
            </div>

            {/* Tamper test experiment */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Role Privilege Escalation:</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Modify the payload role claim to test if the server correctly rejects the tampered signature:
              </p>
              <div className="flex items-center gap-2">
                <select
                  id="select-tampered-role"
                  value={tamperedRole}
                  onChange={(e) => setTamperedRole(e.target.value)}
                  className="text-xs bg-white border border-amber-300 rounded px-2 py-1 text-slate-800"
                >
                  <option value="admin">Forge role: admin</option>
                  <option value="manager">Forge role: manager</option>
                  <option value="super-user">Forge role: super-user</option>
                </select>
                <button
                  id="btn-test-tampered-token"
                  onClick={handleVerifyTamperTest}
                  disabled={isVerifying}
                  className="text-xs font-semibold px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded shadow-xs disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Verify on Server'}
                </button>
              </div>

              {verifyResult && (
                <div className={`p-2 rounded text-[11px] font-mono mt-2 border ${
                  verifyResult.status === 401 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  <strong>HTTP {verifyResult.status}:</strong> {verifyResult.data?.error?.message || 'Rejected correctly'}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-600">
          <p className="text-sm">Please log in or paste a valid JWT into the input field above.</p>
        </div>
      )}

      {/* Refresh Token Rotation Card */}
      {tokens?.refreshToken && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Active Refresh Token Record
              </span>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                Single-Use with Family Lineage
              </span>
            </div>
            <button
              id="btn-copy-refresh-token"
              onClick={() => copyToClipboard(tokens.refreshToken!, 'rt')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
            >
              {copied === 'rt' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied === 'rt' ? 'Copied' : 'Copy Refresh Token'}</span>
            </button>
          </div>
          <div className="p-3 bg-slate-950 text-slate-300 font-mono text-xs rounded-xl break-all">
            {tokens.refreshToken}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700 pt-1">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-700 block text-[11px]">Rotation Policy:</span>
              <span className="font-semibold text-slate-900">Single-use token rotation</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-700 block text-[11px]">Replay Attack Protection:</span>
              <span className="font-semibold text-slate-900">Invalidates token family</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-700 block text-[11px]">Refresh Expiry Window:</span>
              <span className="font-semibold text-slate-900">7 Days (Rolling)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
