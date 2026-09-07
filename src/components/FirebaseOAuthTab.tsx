import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  Server, 
  Layers, 
  ArrowRight,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import { UserSession, AuthTokens } from '../types.ts';

interface FirebaseOAuthTabProps {
  onApplyTokens: (tokens: AuthTokens, sessionUser?: UserSession) => void;
}

export const FirebaseOAuthTab: React.FC<FirebaseOAuthTabProps> = ({ onApplyTokens }) => {
  const [provider, setProvider] = useState<'google.com' | 'github.com'>('google.com');
  const [userEmail, setUserEmail] = useState<string>('principal.architect@enterprise.io');
  const [userName, setUserName] = useState<string>('Jordan Taylor');
  const [tamperAudience, setTamperAudience] = useState<boolean>(false);
  const [tamperExpired, setTamperExpired] = useState<boolean>(false);

  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Generate mock ID token from backend
  const handleGenerateToken = async () => {
    setIsGenerating(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/v1/auth/mock-firebase-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          provider,
          tamperAudience,
          tamperExpired
        })
      });
      const data = await res.json();
      if (data.success && data.data?.idToken) {
        setGeneratedToken(data.data.idToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Verify token via Firebase Admin SDK backend endpoint
  const handleVerifyWithBackend = async () => {
    if (!generatedToken) return;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/v1/auth/firebase-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: generatedToken })
      });
      const data = await res.json();
      setVerifyResult({ status: res.status, data });

      if (res.ok && data.success && data.data?.tokens && data.data?.user) {
        onApplyTokens(data.data.tokens, data.data.user);
      }
    } catch (err: any) {
      setVerifyResult({ status: 500, data: { error: err.message } });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-md border border-amber-200">
              OAuth 2.0 / OpenID Connect Specification
            </span>
            <span className="text-xs text-slate-700">Firebase Admin SDK Architecture</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Secure Auth Handler &amp; Token Verification Flow
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Standard OAuth redirects &amp; popups delegate credentials to{' '}
            <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
              firebaseapp.com/__/auth/handler
            </code>{' '}
            while the server validates authenticity using Firebase Admin SDK.
          </p>
        </div>
      </div>

      {/* Sequence Architecture Diagram Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          End-to-End Architectural Sequence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {/* Step 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                Client SDK
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">Initiate Provider Auth</div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Client invokes <code className="text-indigo-700 font-mono">signInWithPopup(auth, provider)</code>. The application never captures raw third-party credentials.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                OAuth Handler
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">Dedicated Handler Domain</div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Browser navigates to <code className="text-amber-800 font-mono">firebaseapp.com/__/auth/handler</code>. Handles OAuth callback &amp; PostMessage safely cross-origin.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                RS256 ID Token
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">Signed Token Delivery</div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Client receives signed OIDC JWT with claims: <code className="text-emerald-800 font-mono">aud, iss, sub, auth_time</code>, and passes it to your backend.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                Firebase Admin SDK
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">Backend Verification</div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Server runs <code className="text-purple-700 font-mono">verifyIdToken()</code>. Validates project ID, signature, exp, provisions/links user &amp; returns JWT session.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Token Configuration Form */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              1. Simulate Client OAuth Authentication
            </h3>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              firebaseapp.com/__/auth/handler
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Identity Provider:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-provider-google"
                  type="button"
                  onClick={() => setProvider('google.com')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 ${
                    provider === 'google.com'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Google Workspace / OIDC</span>
                </button>
                <button
                  id="btn-provider-github"
                  type="button"
                  onClick={() => setProvider('github.com')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 ${
                    provider === 'github.com'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>GitHub Enterprise OAuth</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  User Email:
                </label>
                <input
                  id="input-oauth-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Display Name:
                </label>
                <input
                  id="input-oauth-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Tamper Options */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Security Anomalies:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 text-xs text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    id="checkbox-tamper-aud"
                    type="checkbox"
                    checked={tamperAudience}
                    onChange={(e) => setTamperAudience(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Wrong Project ID Audience</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    id="checkbox-tamper-exp"
                    type="checkbox"
                    checked={tamperExpired}
                    onChange={(e) => setTamperExpired(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Expired ID Token</span>
                </label>
              </div>
            </div>

            <button
              id="btn-generate-oauth-token"
              onClick={handleGenerateToken}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating OIDC Token...' : 'Simulate Firebase OAuth Client Acquisition'}
            </button>
          </div>

          {generatedToken && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Acquired Firebase ID Token:</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  RS256 Signed
                </span>
              </div>
              <textarea
                rows={3}
                readOnly
                value={generatedToken}
                className="w-full text-[10px] font-mono p-2.5 bg-slate-950 text-slate-300 rounded-xl border border-slate-800 focus:outline-none break-all"
              />
            </div>
          )}
        </div>

        {/* Right: Backend Verification Action & Result */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-purple-600" />
              2. Backend Firebase Admin SDK Verification
            </h3>
            <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              POST /api/v1/auth/firebase-verify
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              Your server uses the Firebase Admin SDK to verify the authenticity of the authentication payload. It confirms the issuer is <code className="text-purple-700 font-mono text-[11px]">https://securetoken.google.com/authforge-cloud-sandbox</code> and audience matches the project ID.
            </p>

            <button
              id="btn-verify-backend-token"
              onClick={handleVerifyWithBackend}
              disabled={!generatedToken || isVerifying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isVerifying ? (
                'Running Firebase Admin SDK Verification...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Execute Firebase Admin Token Verification</span>
                </>
              )}
            </button>

            {/* Verification Result Display */}
            {verifyResult ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Verification Outcome:</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    verifyResult.status === 200 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    HTTP {verifyResult.status} {verifyResult.status === 200 ? 'AUTHENTICATED' : 'REJECTED'}
                  </span>
                </div>

                <pre className="text-xs font-mono p-3.5 bg-slate-950 text-emerald-300 rounded-xl overflow-x-auto max-h-[260px] leading-relaxed border border-slate-800">
                  {JSON.stringify(verifyResult.data, null, 2)}
                </pre>

                {verifyResult.status === 200 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <span>User automatically linked and JWT session tokens issued!</span>
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Session Active
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-600">
                <Lock className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                <p className="text-xs">
                  Generate an OIDC ID token on the left, then click verify above to test the Admin SDK check.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
