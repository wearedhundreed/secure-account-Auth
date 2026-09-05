import React, { useState } from 'react';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';

interface PWAInstallButtonProps {
  onOpenMobileModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenMobileModal }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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

  // Chromium / Android flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
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

  // Default fallback button when on desktop or browser hasn't fired beforeinstallprompt yet
  return (
    <button
      id="btn-mobile-apk-modal"
      onClick={onOpenMobileModal}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
    >
      <Smartphone className="w-3.5 h-3.5" />
      <span>Install App / APK</span>
    </button>
  );
};
