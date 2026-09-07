import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Check, 
  X, 
  KeyRound, 
  Sparkles, 
  AlertCircle,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { UserSession, AuthTokens } from '../types.ts';

interface RbacMatrixTabProps {
  session: UserSession | null;
  tokens: AuthTokens | null;
  onApplyTokens: (tokens: AuthTokens, sessionUser?: UserSession) => void;
}

interface DirectoryUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'auditor';
  permissions: string[];
  authProvider: string;
}

const PERMISSIONS = [
  { id: 'users:read', label: 'users:read', desc: 'View user directory and profiles' },
  { id: 'users:write', label: 'users:write', desc: 'Create, update, or assign user roles' },
  { id: 'reports:read', label: 'reports:read', desc: 'Access operational manager analytics' },
  { id: 'reports:export', label: 'reports:export', desc: 'Export compliance & finance data' },
  { id: 'audit:read', label: 'audit:read', desc: 'Inspect security and audit event logs' },
  { id: 'data:read', label: 'data:read', desc: 'Read live internet data feeds' },
  { id: 'data:write', label: 'data:write', desc: 'Commit and write records over internet' },
  { id: 'files:read', label: 'files:read', desc: 'Read remote files & packages' },
  { id: 'files:write', label: 'files:write', desc: 'Upload and write storage artifacts' },
  { id: 'system:admin', label: 'system:admin', desc: 'Full administrative engine privileges' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['users:read', 'users:write', 'reports:read', 'reports:export', 'audit:read', 'data:read', 'data:write', 'files:read', 'files:write', 'system:admin'],
  manager: ['users:read', 'reports:read', 'reports:export', 'data:read', 'data:write'],
  auditor: ['users:read', 'reports:read', 'audit:read', 'data:read'],
  user: ['users:read', 'data:read', 'data:write'],
};

export const RbacMatrixTab: React.FC<RbacMatrixTabProps> = ({
  session,
  tokens,
  onApplyTokens
}) => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [targetRole, setTargetRole] = useState<'admin' | 'manager' | 'user' | 'auditor'>('manager');
  const [assignStatus, setAssignStatus] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);

  // Load user directory from API
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Use existing admin token if available, otherwise login temporarily or use endpoint
      const headers: Record<string, string> = {};
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
      const res = await fetch('/api/v1/protected/admin/users', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.users) {
          setUsers(data.data.users);
          if (!selectedUserId && data.data.users.length > 0) {
            setSelectedUserId(data.data.users[0].id);
          }
        }
      } else {
        // Fallback default list if unauthenticated
        setUsers([
          { id: 'usr_admin_001', email: 'admin@authforge.dev', name: 'Alex Vance (Principal Admin)', role: 'admin', permissions: ROLE_PERMISSIONS.admin, authProvider: 'local' },
          { id: 'usr_manager_002', email: 'manager@authforge.dev', name: 'Sarah Connor (Engineering Manager)', role: 'manager', permissions: ROLE_PERMISSIONS.manager, authProvider: 'local' },
          { id: 'usr_engineer_003', email: 'engineer@authforge.dev', name: 'David Chen (Software Engineer)', role: 'user', permissions: ROLE_PERMISSIONS.user, authProvider: 'local' },
          { id: 'usr_auditor_004', email: 'auditor@authforge.dev', name: 'Elena Rostova (Compliance Auditor)', role: 'auditor', permissions: ROLE_PERMISSIONS.auditor, authProvider: 'local' },
        ]);
        setSelectedUserId('usr_engineer_003');
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tokens?.accessToken]);

  // Quick switch identity / login
  const handleQuickLoginAs = async (email: string, role: string) => {
    setIsLoggingIn(email);
    const passwordMap: Record<string, string> = {
      'admin@authforge.dev': 'AdminPassword123!',
      'manager@authforge.dev': 'ManagerPassword123!',
      'engineer@authforge.dev': 'UserPassword123!',
      'auditor@authforge.dev': 'AuditorPassword123!'
    };

    const password = passwordMap[email] || 'Password123!';

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.tokens && data.data?.user) {
        onApplyTokens(data.data.tokens, data.data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(null);
    }
  };

  // Assign role action
  const handleAssignRole = async () => {
    if (!selectedUserId) return;
    setIsAssigning(true);
    setAssignStatus(null);

    try {
      const res = await fetch('/api/v1/protected/admin/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken || ''}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: targetRole
        })
      });
      const data = await res.json();
      setAssignStatus({ status: res.status, data });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err: any) {
      setAssignStatus({ status: 500, data: { error: err.message } });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-purple-50 text-purple-700 rounded-md border border-purple-200">
              Role-Based Access Control
            </span>
            <span className="text-xs text-slate-700">Multi-Role Security Model</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            RBAC Permission Matrix &amp; Directory Security Policy
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Strict granular permissions mapped across Admin, Manager, Auditor, and User roles with server middleware enforcement.
          </p>
        </div>
      </div>

      {/* RBAC Permission Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Canonical Role-Permission Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-semibold">Permission Flag</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-center text-rose-700">Admin</th>
                <th className="py-3 px-4 font-semibold text-center text-amber-700">Manager</th>
                <th className="py-3 px-4 font-semibold text-center text-blue-700">Auditor</th>
                <th className="py-3 px-4 font-semibold text-center text-slate-700">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {PERMISSIONS.map(perm => (
                <tr key={perm.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{perm.label}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 text-[11px]">{perm.desc}</td>
                  {['admin', 'manager', 'auditor', 'user'].map(role => {
                    const hasPerm = ROLE_PERMISSIONS[role].includes(perm.id);
                    return (
                      <td key={role} className="py-2.5 px-4 text-center">
                        {hasPerm ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Section: User Directory & Role Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: User Directory & Quick Switch */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Repository Security Principals ({users.length})
            </h3>
            <button
              id="btn-refresh-users"
              onClick={fetchUsers}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {users.map(u => {
              const isActive = session?.id === u.id || session?.email === u.email;
              return (
                <div
                  key={u.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      u.role === 'admin' 
                        ? 'bg-rose-100 text-rose-800' 
                        : u.role === 'manager' 
                        ? 'bg-amber-100 text-amber-800' 
                        : u.role === 'auditor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {u.role.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{u.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-700">{u.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                      {u.role}
                    </span>
                    <button
                      id={`btn-impersonate-${u.id}`}
                      onClick={() => handleQuickLoginAs(u.email, u.role)}
                      disabled={isLoggingIn === u.email}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50"
                    >
                      {isLoggingIn === u.email ? 'Logging in...' : 'Sign In As'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dynamic Role Assignment Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-purple-600" />
              Admin Privilege Assignment
            </h3>
            <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Role: Admin Guard
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              Updates a principal's authorization level via <code className="text-slate-800 font-mono text-[11px]">POST /api/v1/protected/admin/assign-role</code>. This requires the caller to possess the <code className="text-rose-700 font-mono text-[11px]">admin</code> role.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Principal:
              </label>
              <select
                id="select-target-user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - Current: {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Target Role:
              </label>
              <select
                id="select-target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="admin">Admin (Full System Privileges)</option>
                <option value="manager">Manager (Operations &amp; Reporting)</option>
                <option value="auditor">Auditor (Compliance &amp; Logs)</option>
                <option value="user">User (Standard Profile Access)</option>
              </select>
            </div>

            <button
              id="btn-submit-assign-role"
              onClick={handleAssignRole}
              disabled={isAssigning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isAssigning ? 'Updating Role...' : 'Dispatch Role Update (RBAC)'}
            </button>

            {assignStatus && (
              <div className={`p-3 rounded-xl text-xs font-mono border ${
                assignStatus.status === 200
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}>
                <div className="font-bold mb-1">
                  HTTP {assignStatus.status} {assignStatus.status === 200 ? 'SUCCESS' : 'FORBIDDEN / ERROR'}:
                </div>
                <div className="text-[11px] leading-relaxed">
                  {assignStatus.data?.message || assignStatus.data?.error?.message}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
