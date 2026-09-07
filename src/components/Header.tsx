import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, RefreshCw, KeyRound, Server, Wifi, WifiOff, Globe, Lock } from 'lucide-react';
import { UserSession, AuthTokens } from '../types.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  session: UserSession | null;
  tokens: AuthTokens | null;
  onLogout: () => void;
  onResetDb: () => void;
  isResetting: boolean;
  onOpenApkTab?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  tokens,
  onLogout,
  onResetDb,
  isResetting,
  onOpenApkTab
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkPing();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLatencyMs(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPing = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      const t0 = performance.now();
      try {
        const res = await fetch('/api/v1/health', { cache: 'no-store' });
        if (res.ok) {
          setIsOnline(true);
          setLatencyMs(Math.round(performance.now() - t0));
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const activeScope = session?.scope || tokens?.scope || 'read write offline_access';

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                AuthForge Engine
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online &amp; Offline Sync
              </span>
            </div>
            <p className="text-xs text-slate-700 hidden sm:block">
              RESTful JWT, RBAC, Read/Write Scopes &amp; Live Internet Connectivity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Internet Connectivity Badge */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isOnline 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
            title={isOnline ? `Internet connection active${latencyMs ? ` (${latencyMs}ms ping)` : ''}` : 'No internet connection detected'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">Internet:</span>
                <span className="font-semibold">{latencyMs ? `${latencyMs}ms` : 'Connected'}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Active Granted Scope Badge */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs"
            title={`Active Access Scopes: ${activeScope}`}
          >
            <Lock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span className="text-slate-500 text-[11px]">Scope:</span>
            <span className="font-mono font-semibold text-indigo-900">
              {activeScope.includes('read') && activeScope.includes('write') ? 'read • write' : activeScope}
            </span>
          </div>

          {/* Server status */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 border border-slate-200">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Port 3000</span>
          </div>

          {/* Active Session Info */}
          {session ? (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                {session.role.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-xs font-medium text-slate-900 truncate max-w-[140px]">
                  {session.name}
                </div>
                <div className="text-[10px] text-slate-700 capitalize">
                  {session.role} • {session.authProvider}
                </div>
              </div>
              <button
                id="btn-header-logout"
                onClick={onLogout}
                className="text-xs font-medium text-slate-600 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                title="Invalidate session and logout"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Unauthenticated</span>
            </div>
          )}

          {/* Install APK / PWA Button */}
          <PWAInstallButton onOpenMobileModal={onOpenApkTab} />

          {/* Reset DB Button */}
          <button
            id="btn-header-reset-db"
            onClick={onResetDb}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Reset repository to initial seeded principals"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
