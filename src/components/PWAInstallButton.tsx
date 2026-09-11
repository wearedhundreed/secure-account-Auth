import React, { useState } from 'react';
import { Download, Smartphone, Check, X, ExternalLink, Archive, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';
import { triggerFileDownload } from '../utils/downloadHelper.ts';

interface PWAInstallButtonProps {
  onOpenMobileModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenMobileModal }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const [downloading, setDownloading] = useState<'apk' | 'zip' | 'win11-bat' | 'win11-ps1' | null>(null);

  // Direct Windows 11 batch installer download
  const handleDownloadWin11Bat = async () => {
    setDownloading('win11-bat');
    await triggerFileDownload('/api/v1/windows/download-bat', 'Install-AuthForge-Win11.bat');
    setTimeout(() => setDownloading(null), 1200);
  };

  // Direct Windows 11 PowerShell installer download
  const handleDownloadWin11Ps1 = async () => {
    setDownloading('win11-ps1');
    await triggerFileDownload('/api/v1/windows/download-ps1', 'install-authforge-win11.ps1');
    setTimeout(() => setDownloading(null), 1200);
  };

  // Direct APK download from modal
  const handleDownloadApk = async () => {
    setDownloading('apk');
    await triggerFileDownload(`/api/v1/git/download-apk?v=${Date.now()}`, 'authforge-app-v1.2.0-release.apk');
    setTimeout(() => setDownloading(null), 1200);
  };

  // Direct ZIP download from modal
  const handleDownloadZip = async () => {
    setDownloading('zip');
    await triggerFileDownload('/api/v1/git/download-bundle', 'authforge-complete-bundle.zip');
    setTimeout(() => setDownloading(null), 1200);
  };

  // Open in full standalone browser window
  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  // If running in standalone APK / PWA mode, show active indicator badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Installed Standalone</span>
        <span className="sm:hidden">App Active</span>
      </div>
    );
  }

  // Native Chromium / Android flow (when not restricted by iframe)
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App / APK</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-ios-install-guide"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          <span>Add to Mobile</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Install on iOS / Safari
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-700 space-y-2">
                <p>1. Tap the <strong>Share</strong> icon in your Safari toolbar.</p>
                <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                <p>3. Tap <strong>Add</strong> to launch AuthForge as a full-screen mobile app.</p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default button: Opens the Quick Download & Install Dialog
  return (
    <>
      <button
        id="btn-mobile-apk-modal"
        onClick={() => setShowInstallMenu(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Install / Download APK</span>
      </button>

      {showInstallMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install AuthForge App</h3>
                  <p className="text-xs text-slate-500">Android APK, Native WebAPK &amp; Source Bundle</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallMenu(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 0: Samsung Windows 11 64-Bit Laptop Installer */}
              <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    Samsung Laptop / Windows 11 (64-Bit)
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded font-bold">
                    Win 11 x64
                  </span>
                </div>
                <p className="text-xs text-sky-900">
                  Installs AuthForge as a dedicated borderless Windows 11 desktop app with Start Menu &amp; Taskbar shortcuts.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    id="btn-modal-download-win11-bat"
                    onClick={handleDownloadWin11Bat}
                    disabled={downloading !== null}
                    className="py-1.5 px-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {downloading === 'win11-bat' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>1-Click .BAT</span>
                  </button>
                  <button
                    id="btn-modal-download-win11-ps1"
                    onClick={handleDownloadWin11Ps1}
                    disabled={downloading !== null}
                    className="py-1.5 px-2.5 bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {downloading === 'win11-ps1' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>PowerShell .ps1</span>
                  </button>
                </div>
              </div>

              {/* Option 1: Direct APK Download */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Android APK Package (.apk)
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    Sideload
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Ready-to-install Android application package with full offline manifest and sandbox engine.
                </p>
                <button
                  id="btn-modal-download-apk"
                  onClick={handleDownloadApk}
                  disabled={downloading !== null}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'apk' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating &amp; Downloading APK...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download APK (authforge-app-release.apk)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: Open in New Tab for Native Chrome/Android Install */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    Open in Full Tab to Install Natively
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                    PWA / WebAPK
                  </span>
                </div>
                <p className="text-xs text-indigo-800">
                  Because this preview is running inside an iframe, browsers block automatic install prompts. Opening in a standalone browser tab triggers the native Chrome/Android install button!
                </p>
                <button
                  id="btn-modal-open-new-tab"
                  onClick={handleOpenNewTab}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch in Standalone Tab</span>
                </button>
              </div>

              {/* Option 3: Download ZIP Bundle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-slate-600" />
                    Full Project Source (.zip)
                  </div>
                  <div className="text-slate-500 text-[11px]">Includes all backend &amp; frontend files</div>
                </div>
                <button
                  id="btn-modal-download-zip"
                  onClick={handleDownloadZip}
                  disabled={downloading !== null}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {downloading === 'zip' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download ZIP</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setShowInstallMenu(false);
                  if (onOpenMobileModal) onOpenMobileModal();
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View APK &amp; GitHub Push Console</span>
                <span>&rarr;</span>
              </button>
              <button
                onClick={() => setShowInstallMenu(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

