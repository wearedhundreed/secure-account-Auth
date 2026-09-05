import React, { useState } from 'react';
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
  Layers, 
  CheckCircle2, 
  Cpu
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';

export const ApkDeploymentTab: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const sharedAppUrl = 'https://ais-pre-2lwonm6okuyvn36wjjwyms-365889169571.us-east1.run.app';

  const gitCliCommands = `# 1. Initialize local Git repository
git init
git add .
git commit -m "feat: complete RESTful auth service with APK pipeline, webhooks & worker dispatcher"

# 2. Add your GitHub remote repository
git remote add origin https://github.com/dhundreed/authforge-service.git

# 3. Rename branch to main & push
git branch -M main
git push -u origin main`;

  const bubblewrapCommands = `# Install Bubblewrap CLI globally
npm install -g @bubblewrap/cli

# Generate Android project from PWA Manifest
bubblewrap init --manifest=public/manifest.json

# Build signed Android APK
bubblewrap build

# Result: app-release-signed.apk ready for direct installation on Android phones`;

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
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-slate-900 text-white rounded-md">
              Deployment &amp; Mobile Hub
            </span>
            <span className="text-xs text-slate-700">Repository: authforge-service</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Publish to GitHub &amp; Android APK Build Pipeline
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Production-ready export to GitHub with automated CI/CD APK generation, WebAPK standalone installation, and native Android Studio configurations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isInstalled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Standalone App Active</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Install WebAPK Now</span>
            </button>
          ) : (
            <a
              href={sharedAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open on Mobile Browser</span>
            </a>
          )}
        </div>
      </div>

      {/* 3 Core Deployment Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: GitHub */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">1. Publish to GitHub</h3>
            <p className="text-xs text-slate-700 mt-1">
              Export the full repository directly using AI Studio export tools or push via standard Git CLI.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Includes full TypeScript source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>GitHub Actions workflow bundled</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Automated APK */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">2. Automated CI/CD APK</h3>
            <p className="text-xs text-slate-700 mt-1">
              GitHub Actions automatically compiles a signed release <code className="font-mono text-indigo-700">.apk</code> on push.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bubblewrap TWA Builder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Downloadable under Actions Artifacts</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: WebAPK Instant */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">3. Instant WebAPK Install</h3>
            <p className="text-xs text-slate-700 mt-1">
              Android OS automatically mints an official WebAPK with home screen icon and hardware acceleration.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full offline service worker cache</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Maskable 512x512 adaptive icon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Publishing Instructions & Terminal Blocks */}
      <div className="space-y-6">
        {/* Method 1: Direct Git CLI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-600" />
                Publish Codebase to GitHub (Git CLI)
              </h3>
              <p className="text-xs text-slate-700 mt-0.5">
                Execute these commands in your cloned terminal to initialize and push your repository:
              </p>
            </div>
            <button
              onClick={() => handleCopy(gitCliCommands, 'git-cli')}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              {copiedSection === 'git-cli' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Git Commands</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
            {gitCliCommands}
          </pre>
        </div>

        {/* Method 2: AI Studio One-Click Export */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Github className="w-4 h-4 text-slate-900" />
            AI Studio One-Click GitHub Export
          </h3>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              You can also export directly without using the terminal:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-800 font-medium">
              <li>
                Click the <strong>Settings Menu</strong> or <strong>Share</strong> button in the top navigation bar of Google AI Studio.
              </li>
              <li>
                Select <strong>Export to GitHub</strong> (or <strong>Download as ZIP</strong>).
              </li>
              <li>
                Authorize your GitHub account and choose or create the repository <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">authforge-service</code>.
              </li>
              <li>
                AI Studio pushes the entire branch with all config files, test suites, and APK workflows automatically.
              </li>
            </ol>
          </div>
        </div>

        {/* Method 3: APK Build Methods (Bubblewrap & Capacitor) */}
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

        {/* Ready-to-go Configuration Artifacts Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Configured APK &amp; Repository Files
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
    </div>
  );
};
