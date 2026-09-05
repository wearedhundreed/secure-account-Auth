import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Smartphone, 
  Download, 
  Terminal, 
  Copy, 
  Check, 
  FileCode2, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  Cpu,
  UploadCloud,
  QrCode,
  Archive,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Laptop
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from './usePWAInstall.ts';

interface GitStatusData {
  branch: string;
  lastCommit: string;
  remoteUrl: string;
  isClean: boolean;
  statusSummary: string;
}

export const ApkDeploymentTab: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Push to GitHub state
  const [repoUrl, setRepoUrl] = useState('https://github.com/dhundreed/authforge-service.git');
  const [token, setToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{
    success: boolean;
    message: string;
    stdout?: string;
    stderr?: string;
    guidance?: string;
  } | null>(null);

  // Git repo status
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loadingGitStatus, setLoadingGitStatus] = useState(false);

  // QR Code state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const sharedAppUrl = 'https://ais-pre-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';

  // Load Git Status
  const fetchGitStatus = async () => {
    setLoadingGitStatus(true);
    try {
      const res = await fetch('/api/v1/git/status');
      const json = await res.json();
      if (json.success) {
        setGitStatus(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGitStatus(false);
    }
  };

  useEffect(() => {
    fetchGitStatus();

    // Generate QR Code for live mobile install
    QRCode.toDataURL(sharedAppUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR code generation error:', err));
  }, []);

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushing(true);
    setPushResult(null);

    try {
      const res = await fetch('/api/v1/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          token: token.trim() || undefined,
          branch
        })
      });
      const data = await res.json();

      if (data.success) {
        setPushResult({
          success: true,
          message: data.message,
          stdout: data.data?.stdout,
          stderr: data.data?.stderr
        });
        fetchGitStatus();
      } else {
        setPushResult({
          success: false,
          message: data.error?.message || 'Push operation failed',
          guidance: data.error?.guidance
        });
      }
    } catch (err: any) {
      setPushResult({
        success: false,
        message: err.message || 'Network error while attempting git push'
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleDownloadZip = () => {
    window.location.href = '/api/v1/git/download-bundle';
  };

  const gitCliCommands = `# 1. Verify commit history
git log -1 --oneline

# 2. Add your GitHub remote repository
git remote add origin ${repoUrl}

# 3. Rename branch to main & push
git branch -M main
git push -u origin main`;

  const bubblewrapCommands = `# Install Bubblewrap CLI globally
npm install -g @bubblewrap/cli

# Generate Android project from PWA Manifest
bubblewrap init --manifest=public/manifest.json

# Build signed Android APK
bubblewrap build

# Output: app-release-signed.apk ready for sideloading or Google Play deployment`;

  const capacitorCommands = `# Install Capacitor Android platform
npm install @capacitor/core @capacitor/cli @capacitor/android

# Build the web bundle
npm run build

# Add Android native project & sync assets
npx cap add android
npx cap copy

# Open Android Studio to build & export APK (Build > Build Bundle(s) / APK(s) > Build APK(s))
npx cap open android`;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Installation & Push Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                1-Click Deployment &amp; Install Center
              </span>
              <span className="text-xs text-slate-300 font-mono">Branch: main (Clean)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Push to GitHub &amp; Install Directly From Here
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Eliminate manual setup mistakes. Push to your GitHub repository with one click, or install AuthForge as a native WebAPK or desktop application directly onto your Android phone, iPhone, tablet, or workstation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isInstalled ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Installed &amp; Active Standalone</span>
              </div>
            ) : isInstallable ? (
              <button
                id="btn-install-standalone-direct"
                onClick={install}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg transition-all transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Install App on Device Now</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const el = document.getElementById('qr-code-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan QR for Mobile Install</span>
              </button>
            )}

            <button
              id="btn-download-full-bundle"
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-colors"
              title="Download full project repository as .zip"
            >
              <Archive className="w-4 h-4 text-indigo-300" />
              <span>Download Bundle (.zip)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Push to GitHub & Install Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Direct Push to GitHub Console (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Github className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Push to GitHub Repository</h3>
                <p className="text-xs text-slate-700">Automated remote synchronization &amp; branch upload</p>
              </div>
            </div>

            <button
              onClick={fetchGitStatus}
              disabled={loadingGitStatus}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh Git Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGitStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Current Local Git Status Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Active Branch:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-600 font-bold">
                  {gitStatus?.branch || 'main'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700 font-medium">
                  {gitStatus?.isClean ? 'Working tree clean (ready to push)' : gitStatus?.statusSummary || 'Ready'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-700 truncate">
              <span className="font-semibold text-slate-700">Latest Commit:</span>{' '}
              <span className="font-mono text-slate-800">{gitStatus?.lastCommit || '04d22b8 - feat: complete RESTful auth service'}</span>
            </div>
          </div>

          {/* Push Form */}
          <form onSubmit={handlePush} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>GitHub Repository URL</span>
                <span className="text-[11px] text-slate-700">Target Remote</span>
              </label>
              <input
                type="text"
                id="input-github-repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/dhundreed/authforge-service.git"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Branch</span>
                  <span className="text-[11px] text-slate-700">Default: main</span>
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Personal Access Token (PAT)</span>
                  <span className="text-[11px] text-slate-700">Optional</span>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-700 leading-relaxed">
              If your repository requires authentication, provide a GitHub Personal Access Token (with <code className="font-mono bg-slate-100 px-1 py-0.2 rounded">repo</code> scope) or use the AI Studio <strong>Export to GitHub</strong> option under the Settings menu.
            </p>

            <button
              type="submit"
              id="btn-push-to-github"
              disabled={isPushing}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Pushing to GitHub ({branch})...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Push to GitHub Repository Now</span>
                </>
              )}
            </button>
          </form>

          {/* Push Feedback Result */}
          {pushResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              pushResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {pushResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{pushResult.message}</span>
              </div>

              {pushResult.guidance && (
                <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-slate-700 leading-relaxed">
                  <strong>Guidance:</strong> {pushResult.guidance}
                </div>
              )}

              {pushResult.stdout && (
                <pre className="p-2 bg-slate-950 text-emerald-300 rounded font-mono text-[11px] overflow-x-auto">
                  {pushResult.stdout}
                </pre>
              )}
            </div>
          )}

          {/* Fallback One-Liner Git CLI Box */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Or Run CLI Commands Manually</span>
              </span>
              <button
                onClick={() => handleCopy(gitCliCommands, 'git-cli')}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
              >
                {copiedSection === 'git-cli' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'git-cli' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
              {gitCliCommands}
            </pre>
          </div>
        </div>

        {/* Right Column: Install Direct From Here (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mobile QR Code Card */}
          <div id="qr-code-section" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-center">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Install on Phone (Avoid Mistakes)
                </h3>
                <p className="text-xs text-slate-700">
                  Scan with your phone camera to launch &amp; install directly
                </p>
              </div>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                Instant WebAPK
              </span>
            </div>

            <div className="flex justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200">
                  <img 
                    src={qrDataUrl} 
                    alt="Scan to install AuthForge on mobile" 
                    className="w-44 h-44 object-contain mx-auto" 
                  />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="text-left text-xs text-slate-700 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">1.</span>
                <span>Open your phone's default <strong>Camera</strong> app.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">2.</span>
                <span>Point at the QR code and tap the notification link.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">3.</span>
                <span>
                  Tap <strong>"Install AuthForge"</strong> or <strong>"Add to Home Screen"</strong> in the browser prompt.
                </span>
              </div>
            </div>

            <a
              href={sharedAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Shared URL Directly</span>
            </a>
          </div>

          {/* Desktop & Workstation Standalone Install Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600" />
              Install on Workstation (Chrome/Edge/macOS)
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              AuthForge can run as a standalone desktop application with its own window, taskbar icon, and zero browser chrome.
            </p>

            {isInstalled ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You are already running AuthForge as a standalone application!</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Install Standalone Desktop App</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-800">Browser Install Shortcut:</div>
                <div className="text-[11px] text-slate-700">
                  Look for the <strong>Install Icon (⤓)</strong> in your browser's address bar next to the bookmark star, or click <strong>Settings (⋮) &gt; Install AuthForge Engine</strong>.
                </div>
              </div>
            )}

            <button
              onClick={handleDownloadZip}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <Archive className="w-4 h-4 text-indigo-600" />
              <span>Download Offline Source Bundle (.zip)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CI/CD APK Pipeline & Native Tools Accordion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option A: Bubblewrap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Build APK via Bubblewrap CLI (TWA)
            </h3>
            <button
              onClick={() => handleCopy(bubblewrapCommands, 'bubblewrap')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              {copiedSection === 'bubblewrap' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'bubblewrap' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-700">
            Google-recommended tool that wraps the PWA into a production Android APK:
          </p>
          <pre className="p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
            {bubblewrapCommands}
          </pre>
        </div>

        {/* Option B: Capacitor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-indigo-600" />
              Build APK via Capacitor (Native Studio)
            </h3>
            <button
              onClick={() => handleCopy(capacitorCommands, 'capacitor')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              {copiedSection === 'capacitor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'capacitor' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-700">
            Uses <code className="font-mono text-indigo-700">capacitor.config.json</code> to export an Android Studio project:
          </p>
          <pre className="p-3 bg-slate-950 text-indigo-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
            {capacitorCommands}
          </pre>
        </div>
      </div>

      {/* Verified Configuration Artifacts Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Ready-to-Deploy Configuration Files
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono font-bold text-slate-900 block">.github/workflows/build-apk.yml</span>
            <span className="text-[11px] text-slate-700 block">Automated GitHub Actions APK build on push</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono font-bold text-slate-900 block">public/manifest.json</span>
            <span className="text-[11px] text-slate-700 block">Standalone PWA &amp; WebAPK specification</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono font-bold text-slate-900 block">public/sw.js &amp; icon.svg</span>
            <span className="text-[11px] text-slate-700 block">Precache service worker &amp; 512px app icon</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono font-bold text-slate-900 block">capacitor.config.json</span>
            <span className="text-[11px] text-slate-700 block">Android Studio native build profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};
