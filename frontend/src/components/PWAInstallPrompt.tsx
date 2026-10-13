import React, { useState, useEffect } from 'react';
import { Download, X, WifiOff, RefreshCw, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // 3. Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Don't show immediately if user recently dismissed
      const dismissedUntil = localStorage.getItem('localstay_pwa_dismissed') || localStorage.getItem('checkinn_pwa_dismissed');
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 5000);
    };

    // 4. Online/Offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    // Dismiss for 24 hours
    localStorage.setItem('localstay_pwa_dismissed', (Date.now() + 24 * 60 * 60 * 1000).toString());
  };

  return (
    <>
      {/* Offline Status Bar */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-[#212529] text-[#D49B41] text-xs font-semibold py-2 px-4 shadow-md flex items-center justify-center gap-2 transition-all duration-300 border-b border-[#D49B41]/30">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>You are currently offline. LocalStay is serving cached lodging listings and offline QR passes.</span>
        </div>
      )}

      {/* Installed Toast Notification */}
      {installSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E3A2B] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#3B5E43] animate-in slide-in-from-bottom duration-300">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold">LocalStay App Installed!</p>
            <p className="text-[11px] text-white/80">Access offline listings anytime directly from your home screen.</p>
          </div>
        </div>
      )}

      {/* Modern PWA Install Banner */}
      {!isInstalled && showPrompt && (
        <div className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-40 bg-[#212529]/95 backdrop-blur-md text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1E3A2B] to-[#3B5E43] p-0.5 shadow-lg flex-shrink-0 flex items-center justify-center">
              <img
                src="/icons/pwa-192x192.png?v=2"
                alt="LocalStay Icon"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  Install LocalStay App
                  <span className="text-[10px] font-medium bg-[#D49B41]/20 text-[#D49B41] px-1.5 py-0.5 rounded-full border border-[#D49B41]/30">
                    PWA
                  </span>
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                  title="Dismiss prompt"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                Add to your device for instant room booking, offline QR check-in passes, and fast front-desk access.
              </p>

              {/* iOS instructions if expanded */}
              {showIOSInstructions && isIOS && (
                <div className="mt-2.5 p-2.5 bg-white/5 rounded-xl text-[11px] text-slate-200 border border-white/10 space-y-1">
                  <p className="font-semibold text-[#D49B41] flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" /> Instructions for Safari iOS:
                  </p>
                  <p>1. Tap the <span className="font-semibold text-white">Share</span> button (square with arrow) at the bottom.</p>
                  <p>2. Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span>.</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3.5">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-[#D49B41] hover:bg-[#BF8832] text-[#212529] text-xs font-black py-2 px-3.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-slate-400 hover:text-slate-200 py-2 px-3 rounded-xl hover:bg-white/10 transition"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
