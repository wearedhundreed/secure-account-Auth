import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Navigation } from './components/Navigation.tsx';
import { WorkbenchTab } from './components/WorkbenchTab.tsx';
import { JwtInspectorTab } from './components/JwtInspectorTab.tsx';
import { FirebaseOAuthTab } from './components/FirebaseOAuthTab.tsx';
import { RbacMatrixTab } from './components/RbacMatrixTab.tsx';
import { TestSuiteTab } from './components/TestSuiteTab.tsx';
import { ArchitectureTab } from './components/ArchitectureTab.tsx';
import { CallbackHubTab } from './components/CallbackHubTab.tsx';
import { WorkerDispatcherTab } from './components/WorkerDispatcherTab.tsx';
import { ApkDeploymentTab } from './components/ApkDeploymentTab.tsx';
import { IntegrationsTab } from './components/IntegrationsTab.tsx';
import { TabType, UserSession, AuthTokens, TestSuiteReport } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('workbench');
  const [session, setSession] = useState<UserSession | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Auto-initialize with seeded Admin session on first load so user immediately has valid JWT
  useEffect(() => {
    const initializeDefaultSession = async () => {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@authforge.dev',
            password: 'AdminPassword123!'
          })
        });
        const data = await res.json();
        if (data.success && data.data?.tokens && data.data?.user) {
          setTokens(data.data.tokens);
          setSession(data.data.user);
        }
      } catch (err) {
        console.warn('Could not auto-login seeded admin:', err);
      }
    };

    initializeDefaultSession();
  }, []);

  const handleApplyTokens = (newTokens: AuthTokens, sessionUser?: UserSession) => {
    setTokens(newTokens);
    if (sessionUser) {
      setSession(sessionUser);
    }
  };

  const handleLogout = async () => {
    try {
      if (tokens?.refreshToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        });
      }
    } catch {
      // ignore
    } finally {
      setTokens(null);
      setSession(null);
    }
  };

  const handleRefreshTokens = async () => {
    if (!tokens?.refreshToken) return;
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });
      const data = await res.json();
      if (data.success && data.data?.tokens) {
        setTokens(prev => ({
          ...prev!,
          accessToken: data.data.tokens.accessToken,
          refreshToken: data.data.tokens.refreshToken,
          expiresIn: data.data.tokens.expiresIn,
          expiresInHuman: data.data.tokens.expiresInHuman,
          refreshExpiresAt: data.data.tokens.refreshExpiresAt
        }));
      }
    } catch (err) {
      console.error('Failed to rotate token:', err);
    }
  };

  const handleResetDb = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/v1/tests/reset-db', { method: 'POST' });
      // Re-login as default admin
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@authforge.dev',
          password: 'AdminPassword123!'
        })
      });
      const data = await res.json();
      if (data.success && data.data?.tokens && data.data?.user) {
        setTokens(data.data.tokens);
        setSession(data.data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans">
      <Header
        session={session}
        tokens={tokens}
        onLogout={handleLogout}
        onResetDb={handleResetDb}
        isResetting={isResetting}
        onOpenApkTab={() => setActiveTab('apk-deployment')}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        testPassCount={testReport?.passed}
        testTotalCount={testReport?.totalTests}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'workbench' && (
          <WorkbenchTab
            session={session}
            tokens={tokens}
            onApplyTokens={handleApplyTokens}
          />
        )}

        {activeTab === 'jwt-inspector' && (
          <JwtInspectorTab
            tokens={tokens}
            session={session}
            onRefreshTokens={handleRefreshTokens}
          />
        )}

        {activeTab === 'firebase-oauth' && (
          <FirebaseOAuthTab
            onApplyTokens={handleApplyTokens}
          />
        )}

        {activeTab === 'rbac-matrix' && (
          <RbacMatrixTab
            session={session}
            tokens={tokens}
            onApplyTokens={handleApplyTokens}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}

        {activeTab === 'callback-hub' && (
          <CallbackHubTab userEmail="weare@dhundreed.com" />
        )}

        {activeTab === 'worker-dispatcher' && (
          <WorkerDispatcherTab />
        )}

        {activeTab === 'apk-deployment' && (
          <ApkDeploymentTab />
        )}

        {activeTab === 'test-suite' && (
          <TestSuiteTab
            initialReport={testReport}
            onTestComplete={setTestReport}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureTab />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AuthForge RESTful Service • Bcrypt (12 rounds) • JWT (15m window) • RBAC • Firebase Admin OIDC
          </div>
          <div className="text-slate-600 font-mono text-[11px]">
            Target: Port 3000 • Production Node.js / Express / Vite
          </div>
        </div>
      </footer>
    </div>
  );
}
