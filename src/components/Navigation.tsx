import React from 'react';
import { 
  Terminal, 
  Key, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  FileCode2,
  Webhook,
  Radio,
  Smartphone
} from 'lucide-react';
import { TabType } from '../types.ts';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  testPassCount?: number;
  testTotalCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  testPassCount,
  testTotalCount
}) => {
  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'workbench', label: 'API Workbench', icon: Terminal },
    { id: 'jwt-inspector', label: 'JWT & Token Inspector', icon: Key },
    { id: 'firebase-oauth', label: 'OAuth & Firebase SDK', icon: ShieldAlert },
    { id: 'rbac-matrix', label: 'RBAC Matrix & Users', icon: Users },
    { id: 'callback-hub', label: 'Callback URLs', icon: Webhook },
    { id: 'worker-dispatcher', label: 'Worker Messaging', icon: Radio, badge: 'Fleet' },
    { id: 'apk-deployment', label: 'GitHub & APK', icon: Smartphone, badge: 'APK' },
    { 
      id: 'test-suite', 
      label: 'Test Suite', 
      icon: CheckCircle2,
      badge: testPassCount !== undefined ? `${testPassCount}/${testTotalCount}` : '10 Tests'
    },
    { id: 'architecture', label: 'Architecture & Code', icon: FileCode2 }
  ];

  return (
    <nav className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar py-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-emerald-100 text-emerald-800 font-bold' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
