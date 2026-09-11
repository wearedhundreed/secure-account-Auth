import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Link as LinkIcon, 
  Users, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Copy, 
  Check, 
  ShieldAlert, 
  Settings2,
  FileText,
  Smartphone,
  Laptop,
  CheckSquare,
  Square,
  Utensils
} from 'lucide-react';
import { AOL_TEST_ACCOUNTS, AOL_TEST_EMAILS_TEXT, TestAccount } from '../data/testAccounts.ts';

interface SendGridDispatcherTabProps {
  userEmail?: string;
}

interface DispatchHistoryItem {
  id: string;
  timestamp: string;
  recipients: string[];
  subject: string;
  urgency: 'critical' | 'high' | 'medium' | 'standard';
  callbackUrl: string;
  customMessage: string;
  status: 'delivered' | 'delivered_sandbox' | 'failed' | 'queued';
  sendgridMessageId?: string;
  latencyMs: number;
  provider: 'sendgrid_live' | 'sendgrid_sandbox';
  previewHtml?: string;
}

export const SendGridDispatcherTab: React.FC<SendGridDispatcherTabProps> = ({ 
  userEmail = 'weare@dhundreed.com' 
}) => {
  // Input states - preloaded with the user-supplied test accounts
  const [rawEmailsText, setRawEmailsText] = useState<string>(
    `${userEmail}\n${AOL_TEST_EMAILS_TEXT}`
  );
  const [subject, setSubject] = useState<string>(
    '🚨 [URGENT - ACTION REQUIRED] Complete Your Security Callback Redirect Verification'
  );
  const [urgency, setUrgency] = useState<'critical' | 'high' | 'medium' | 'standard'>('critical');
  const [expiresInMinutes, setExpiresInMinutes] = useState<number>(15);
  
  const devAppUrl = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://ais-dev-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';

  const [callbackUrl, setCallbackUrl] = useState<string>(
    `${devAppUrl}/api/v1/auth/callback?source=sendgrid_dispatch&urgency=critical&verify=true`
  );
  const [customMessage, setCustomMessage] = useState<string>(
    `Your session callback redirect endpoint requires immediate verification to prevent authentication service suspension.\n\nPlease click the button below to confirm your redirect callback URL and validate your single sign-on access parameters before this link expires.`
  );
  
  // Status and view states
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [activePreviewDevice, setActivePreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [history, setHistory] = useState<DispatchHistoryItem[]>([]);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showAolDirectory, setShowAolDirectory] = useState<boolean>(true);
  const [aolCategoryFilter, setAolCategoryFilter] = useState<string>('all');

  // Toggle individual AOL test account
  const toggleAolAccount = (email: string) => {
    const target = email.toLowerCase();
    if (parsedEmails.includes(target)) {
      // Remove it
      const updated = parsedEmails.filter(e => e !== target);
      setRawEmailsText(updated.join('\n'));
    } else {
      // Add it
      const updated = [...parsedEmails, target];
      setRawEmailsText(updated.join('\n'));
    }
  };

  // Select all 27 AOL test accounts
  const selectAllAolAccounts = () => {
    const combined = new Set([...parsedEmails, ...AOL_TEST_ACCOUNTS.map(a => a.email.toLowerCase())]);
    setRawEmailsText(Array.from(combined).join('\n'));
  };

  // Deselect all AOL test accounts
  const removeAllAolAccounts = () => {
    const aolSet = new Set(AOL_TEST_ACCOUNTS.map(a => a.email.toLowerCase()));
    const remaining = parsedEmails.filter(e => !aolSet.has(e));
    setRawEmailsText(remaining.join('\n'));
  };

  // Parse recipient emails whenever raw text changes
  useEffect(() => {
    const tokens = rawEmailsText.split(/[\r\n,;]+/).map(t => t.trim()).filter(Boolean);
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const valid = new Set<string>();
    for (const t of tokens) {
      const match = t.match(/<([^>]+)>/);
      const cand = match ? match[1].trim() : t.trim();
      if (emailRegex.test(cand)) valid.add(cand.toLowerCase());
    }
    setParsedEmails(Array.from(valid));
  }, [rawEmailsText]);

  // Fetch status and history
  const fetchStatusAndHistory = async () => {
    try {
      const [stRes, histRes] = await Promise.all([
        fetch('/api/v1/sendgrid/status'),
        fetch('/api/v1/sendgrid/history')
      ]);
      const stData = await stRes.json();
      const histData = await histRes.json();
      if (stData.success) setStatusInfo(stData.data);
      if (histData.success) setHistory(histData.data.history || []);
    } catch (err) {
      console.error('Failed to load SendGrid status:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndHistory();
  }, []);

  // Update live preview when inputs change
  useEffect(() => {
    const updatePreview = async () => {
      try {
        const res = await fetch('/api/v1/sendgrid/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            customMessage,
            callbackUrl,
            urgency,
            expiresInMinutes,
            recipientEmail: parsedEmails[0] || userEmail
          })
        });
        const data = await res.json();
        if (data.success) {
          setPreviewHtml(data.data.previewHtml);
        }
      } catch (err) {
        console.error('Failed to generate preview:', err);
      }
    };
    const timer = setTimeout(updatePreview, 300);
    return () => clearTimeout(timer);
  }, [subject, customMessage, callbackUrl, urgency, expiresInMinutes, parsedEmails, userEmail]);

  // Dispatch emails via SendGrid endpoint
  const handleDispatch = async () => {
    if (parsedEmails.length === 0) {
      alert('Please paste at least one valid recipient email.');
      return;
    }
    setIsSending(true);
    setDispatchResult(null);

    try {
      const res = await fetch('/api/v1/sendgrid/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: parsedEmails,
          subject,
          customMessage,
          callbackUrl,
          urgency,
          expiresInMinutes,
          senderName: 'AuthForge Security Dispatcher'
        })
      });

      const data = await res.json();
      setDispatchResult(data);
      if (data.success) {
        fetchStatusAndHistory();
      }
    } catch (err: any) {
      setDispatchResult({ success: false, error: err.message || 'Dispatch network error' });
    } finally {
      setIsSending(false);
    }
  };

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  SendGrid Urgent Email &amp; Callback Dispatcher
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  SendGrid v3 REST
                </span>
                {statusInfo?.isConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Live SendGrid Key Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    High-Fidelity Sandbox Ready
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Paste your target text emails and subjects below to dispatch high-urgency notifications. Each email is configured with your custom redirect callback link, deadline countdown badges, and click-through tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              <span>SendGrid Config</span>
            </button>
            <button
              onClick={fetchStatusAndHistory}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Config Modal / Helper Drawer */}
        {showConfigModal && (
          <div className="mt-6 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-blue-600" />
                SendGrid API Key Configuration
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AuthForge is configured to read <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">SENDGRID_API_KEY</code> from the environment. When provided, messages are submitted directly to SendGrid's live v3 endpoint (<code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">https://api.sendgrid.com/v3/mail/send</code>). When omitted, AuthForge runs in high-fidelity sandbox simulation mode so you can preview, format, and test callbacks without delay.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-700 pt-1">
              <div>Sender: <strong>{statusInfo?.senderEmail || 'notifications@authforge.dev'}</strong></div>
              <div>Mode: <strong>{statusInfo?.mode || 'high_fidelity_sandbox'}</strong></div>
              <div>Total Dispatches: <strong>{history.length}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Composer on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Composer Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Paste Emails Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  1. Paste Your Email List
                </h2>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {parsedEmails.length} Valid {parsedEmails.length === 1 ? 'Email' : 'Emails'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Paste your target emails here (separated by newlines, commas, or semicolons). You can also paste formatted lines like <code className="bg-slate-100 px-1 py-0.5 rounded">User &lt;user@example.com&gt;</code>.
            </p>
            <textarea
              id="sendgrid-recipients-textarea"
              rows={4}
              value={rawEmailsText}
              onChange={(e) => setRawEmailsText(e.target.value)}
              placeholder="Paste email list here (one per line, comma separated, or CSV)..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all resize-y"
            />
            {/* Parsed Chips */}
            {parsedEmails.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Recognized Recipients:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {parsedEmails.map((email, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Quick Add Helpers & AOL Directory Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Quick Insert:</span>
                <button
                  type="button"
                  onClick={() => setRawEmailsText(prev => prev ? `${prev}\n${userEmail}` : userEmail)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-mono text-[11px] cursor-pointer"
                >
                  + {userEmail}
                </button>
                <button
                  type="button"
                  onClick={selectAllAolAccounts}
                  className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Select All 27 AOL Accounts
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAolDirectory(!showAolDirectory)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer"
                >
                  {showAolDirectory ? 'Hide AOL Directory' : 'Show AOL Directory (27)'}
                </button>
                <button
                  type="button"
                  onClick={() => setRawEmailsText('')}
                  className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-[11px] cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* AOL Test Accounts Interactive Directory */}
            {showAolDirectory && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-800">
                      User Test Accounts (AOL Restaurant &amp; Catering Partner Directory)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                      27 Accounts
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllAolAccounts}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Check All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={removeAllAolAccounts}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Uncheck AOL
                    </button>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {['all', 'Pizzeria', 'Catering Services', 'Italian Deli', 'Artisan Bakery'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAolCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        aolCategoryFilter === cat
                          ? 'bg-slate-800 text-white font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'all' ? 'All (27)' : cat}
                    </button>
                  ))}
                </div>

                {/* Accounts Chips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {AOL_TEST_ACCOUNTS
                    .filter(a => aolCategoryFilter === 'all' || a.category.toLowerCase().includes(aolCategoryFilter.toLowerCase()))
                    .map((item) => {
                      const isSelected = parsedEmails.includes(item.email.toLowerCase());
                      return (
                        <button
                          key={item.email}
                          type="button"
                          onClick={() => toggleAolAccount(item.email)}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-300 text-blue-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/80'
                          }`}
                        >
                          <span className="mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold truncate leading-tight">
                              {item.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              {item.email}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Urgency Level & Expiration */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  2. Urgency Level &amp; Click Incentives
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Adds high-priority headers &amp; timer badges
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setUrgency('critical');
                  setExpiresInMinutes(15);
                  setSubject('🚨 [URGENT - ACTION REQUIRED] Complete Your Security Callback Redirect Verification');
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  urgency === 'critical'
                    ? 'border-red-500 bg-red-50/80 text-red-900 ring-2 ring-red-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>⚡</span>
                  <span>Critical (15m)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Red banner, countdown deadline, X-Priority: 1
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrgency('high');
                  setExpiresInMinutes(60);
                  setSubject('⚠️ [HIGH PRIORITY] Action Required: Callback Confirmation');
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  urgency === 'high'
                    ? 'border-orange-500 bg-orange-50/80 text-orange-900 ring-2 ring-orange-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>⏳</span>
                  <span>High (1 Hour)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Amber alert, 1-hour expiration warning
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrgency('medium');
                  setExpiresInMinutes(1440);
                  setSubject('⏰ [TIME-SENSITIVE] Please Complete Callback Verification');
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  urgency === 'medium'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>ℹ️</span>
                  <span>Medium (24h)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Blue notification, 24-hour expiration
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrgency('standard');
                  setExpiresInMinutes(10080);
                  setSubject('AuthForge Notification: Security Callback Link');
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  urgency === 'standard'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>✉️</span>
                  <span>Standard</span>
                </div>
                <p className={`text-[10px] mt-1 ${urgency === 'standard' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Standard notification format
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Subject & Custom Message */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  3. Subject Line &amp; Custom Message
                </h2>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Subject Line</label>
              <input
                id="sendgrid-subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSubject(prev => `🚨 [CRITICAL - ACTION REQUIRED] ${prev.replace(/🚨.*\]\s*/, '')}`)}
                  className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded cursor-pointer"
                >
                  + Add Urgent Tag
                </button>
                <button
                  type="button"
                  onClick={() => setSubject(prev => `⏳ [EXPIRES IN 15 MINS] ${prev.replace(/⏳.*\]\s*/, '')}`)}
                  className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded cursor-pointer"
                >
                  + Add Expiry Tag
                </button>
                <button
                  type="button"
                  onClick={() => setSubject(prev => `⚡ [CONFIRMATION NEEDED] ${prev.replace(/⚡.*\]\s*/, '')}`)}
                  className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded cursor-pointer"
                >
                  + Add Confirm Tag
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Custom Message Content</label>
              <textarea
                id="sendgrid-message-textarea"
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter custom instructions for recipients..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-y"
              />
            </div>
          </div>

          {/* Section 4: Configured Redirect Callback Link */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  4. Redirect Callback Link to Your App
                </h2>
              </div>
              <button
                type="button"
                onClick={copyCallbackUrl}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              The primary CTA button in the email will direct users to this URL:
            </p>

            <input
              id="sendgrid-callback-url-input"
              type="text"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-500 self-center">Presets:</span>
              <button
                type="button"
                onClick={() => setCallbackUrl(`${devAppUrl}/api/v1/auth/callback?action=verify&urgency=critical`)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-mono text-[11px] cursor-pointer"
              >
                /api/v1/auth/callback
              </button>
              <button
                type="button"
                onClick={() => setCallbackUrl(`${devAppUrl}/__/auth/handler`)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-mono text-[11px] cursor-pointer"
              >
                /__/auth/handler
              </button>
              <button
                type="button"
                onClick={() => setCallbackUrl(`${devAppUrl}/download-apk`)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-mono text-[11px] cursor-pointer"
              >
                /download-apk
              </button>
            </div>
          </div>

          {/* Section 5: Dispatch Button */}
          <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="text-sm font-bold flex items-center gap-2">
                <span>⚡ Ready to Dispatch via SendGrid</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                  {parsedEmails.length} Recipients
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Sends personalized email notifications with your urgent redirect callback link.
              </p>
            </div>

            <button
              id="btn-dispatch-sendgrid-now"
              onClick={handleDispatch}
              disabled={isSending || parsedEmails.length === 0}
              className="w-full sm:w-auto px-6 py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message Now ({parsedEmails.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Dispatch Result Feedback */}
          {dispatchResult && (
            <div className={`p-5 rounded-2xl border ${
              dispatchResult.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                {dispatchResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Dispatch Succeeded ({dispatchResult.data?.status})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Dispatch Failed: {dispatchResult.error}</span>
                  </>
                )}
              </div>
              {dispatchResult.success && (
                <div className="text-xs space-y-1 font-mono text-emerald-900 mt-2">
                  <div>ID: {dispatchResult.data?.dispatchId}</div>
                  <div>Message ID: {dispatchResult.data?.sendgridMessageId}</div>
                  <div>Recipients: {dispatchResult.data?.recipientsCount}</div>
                  <div>Latency: {dispatchResult.data?.latencyMs}ms</div>
                  <div className="text-[11px] text-emerald-700 pt-1 font-sans">{dispatchResult.message}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Real-Time Live Email Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recipient Live Email Preview
                </h3>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActivePreviewDevice('desktop')}
                  className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    activePreviewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Desktop View"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewDevice('mobile')}
                  className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    activePreviewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Live HTML rendering of what recipients will see in Gmail, Outlook, Apple Mail, or Samsung Email:
            </p>

            {/* Email Shell Preview */}
            <div className={`mx-auto transition-all border border-slate-300 rounded-2xl overflow-hidden shadow-inner bg-slate-100 ${
              activePreviewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
            }`}>
              {/* Fake Email Client Chrome */}
              <div className="bg-slate-200 border-b border-slate-300 px-3 py-2 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">From: AuthForge Security &lt;notifications@authforge.dev&gt;</span>
                  <span className="text-[10px] text-slate-500">Just now</span>
                </div>
                <div className="truncate">
                  To: <span className="font-mono text-slate-800">{parsedEmails[0] || userEmail}</span>
                </div>
                <div className="font-bold text-slate-900 truncate">
                  Subject: {subject}
                </div>
              </div>

              {/* Rendered HTML inside iframe or sanitized container */}
              <div className="max-h-[520px] overflow-y-auto bg-slate-50 p-2">
                {previewHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewHtml }} 
                    className="email-render-container"
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Generating preview...
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Click Action:</div>
              <div className="text-[11px] font-mono break-all text-blue-600">
                {callbackUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DISPATCH HISTORY & AUDIT LOGS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Recent Dispatches &amp; Delivery Audit
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {history.length} {history.length === 1 ? 'Dispatch' : 'Dispatches'} Logged
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No emails dispatched yet. Fill in the composer above and click "Send Message Now".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Subject &amp; Urgency</th>
                  <th className="py-2.5 px-3">Recipients</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 max-w-xs truncate">{item.subject}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          item.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                          item.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.urgency.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-bold">{item.recipients.length}</span> recipient{item.recipients.length > 1 ? 's' : ''}
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {item.recipients.join(', ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {item.sendgridMessageId || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
