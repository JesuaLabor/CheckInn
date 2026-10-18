import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Sparkles,
  Zap,
  ZapOff
} from 'lucide-react';

interface CameraQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const CameraQRScannerModal: React.FC<CameraQRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [status, setStatus] = useState<
    'initializing' | 'scanning' | 'success' | 'error' | 'permission_denied'
  >('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState<number>(0);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const containerId = 'checkinn-qr-reader-container';

  // Sound feedback via Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // Audio autoplay policy catch
    }
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 50, 40]);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Safely stop scanning
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Camera stop warning:', err);
      } finally {
        try {
          scannerRef.current.clear();
        } catch {
          // Ignore clear errors
        }
        scannerRef.current = null;
      }
    }
    isStoppingRef.current = false;
  }, []);

  // Toggle Torch if available
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch not supported or failed:', err);
      setHasTorch(false);
    }
  };

  // Start Scanner
  const startScanner = useCallback(
    async (cameraIndex: number) => {
      if (!isMountedRef.current) return;
      setStatus('initializing');
      setErrorMessage('');
      setScannedResult(null);

      // Stop previous instance if running
      await stopScanner();

      // Ensure DOM element is present
      const container = document.getElementById(containerId);
      if (!container) {
        setStatus('error');
        setErrorMessage('Scanner view container not found.');
        return;
      }

      try {
        // Enumerate cameras if not already done
        let availableCameras = cameras;
        if (availableCameras.length === 0) {
          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              availableCameras = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
              if (isMountedRef.current) {
                setCameras(availableCameras);
              }
            }
          } catch (camErr) {
            console.warn('Unable to list cameras:', camErr);
          }
        }

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        // Determine camera target: specific camera ID, or environment (back) camera preference
        let cameraConfig: string | { facingMode: 'environment' | 'user' } = { facingMode: 'environment' };
        if (availableCameras.length > 0 && availableCameras[cameraIndex]) {
          cameraConfig = availableCameras[cameraIndex].id;
        }

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.72);
            return { width: Math.max(200, edgeSize), height: Math.max(200, edgeSize) };
          },
          aspectRatio: 1.0,
        };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText) => {
            // Success handler
            if (!isMountedRef.current) return;
            handleDetectedCode(decodedText);
          },
          () => {
            // Scan progress (frame without QR code - silent)
          }
        );

        if (!isMountedRef.current) {
          await stopScanner();
          return;
        }

        setStatus('scanning');

        // Check if torch/flashlight is supported
        try {
          const caps = (scanner as any).getRunningTrackCameraCapabilities?.();
          if (caps && typeof caps.torch === 'boolean') {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.error('Failed to start camera QR scanner:', err);
        const errStr = String(err?.message || err);

        if (
          errStr.includes('NotAllowedError') ||
          errStr.includes('Permission denied') ||
          errStr.includes('permission')
        ) {
          setStatus('permission_denied');
          setErrorMessage('Camera access was denied. Please allow camera permissions in your browser to scan QR codes.');
        } else if (errStr.includes('NotFoundError') || errStr.includes('No cameras')) {
          setStatus('error');
          setErrorMessage('No camera hardware was detected on this device.');
        } else {
          setStatus('error');
          setErrorMessage(err?.message || 'Unable to start camera stream. Please try again.');
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameras, stopScanner]
  );

  // Handle scanned token/code
  const handleDetectedCode = useCallback(
    async (rawCode: string) => {
      // Pause scanner immediately so it doesn't fire multiple times
      try {
        if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.pause(true);
        }
      } catch {
        // Ignore
      }

      playBeep();
      triggerHaptic();

      // Clean up code if it's a URL (e.g., https://localstay.app/checkin?code=CHK-12345 or token)
      let cleaned = rawCode.trim();
      try {
        if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
          const url = new URL(cleaned);
          const paramCode = url.searchParams.get('code') ||
            url.searchParams.get('token') ||
            url.searchParams.get('ref') ||
            url.searchParams.get('booking_reference');
          if (paramCode) {
            cleaned = paramCode;
          } else {
            // Check if last path segment contains a code
            const segments = url.pathname.split('/').filter(Boolean);
            if (segments.length > 0) {
              cleaned = segments[segments.length - 1];
            }
          }
        }
      } catch {
        // Fallback to raw trimmed text
      }

      setScannedResult(cleaned);
      setStatus('success');

      // Brief pause to display the success tick animation before closing
      setTimeout(async () => {
        await stopScanner();
        onScanSuccess(cleaned);
        onClose();
      }, 550);
    },
    [onClose, onScanSuccess, playBeep, stopScanner, triggerHaptic]
  );

  // Switch to next camera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (activeCameraIndex + 1) % cameras.length;
    setActiveCameraIndex(nextIndex);
    startScanner(nextIndex);
  };

  // Mount / Unmount & Open / Close lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      // Small timeout to guarantee DOM node rendering inside the modal
      const timer = setTimeout(() => {
        startScanner(activeCameraIndex);
      }, 100);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen, activeCameraIndex, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
    >
      <div className="bg-[#FAF8F5] border border-slate-200/90 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/70 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center">
              <Camera className="w-5 h-5 text-[#1E3A2B]" />
            </div>
            <div>
              <h3 id="scanner-modal-title" className="text-sm sm:text-base font-black text-[#212529] flex items-center gap-1.5">
                Front Desk Live Scanner
                <Sparkles className="w-3.5 h-3.5 text-[#D49B41]" />
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Point camera at guest&apos;s digital CheckInn QR pass
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Canvas Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          <div className="w-full relative aspect-square bg-[#1E2522] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-300">
            {/* Html5Qrcode Reader Element */}
            <div
              id={containerId}
              className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Viewfinder Reticle Overlay (Shown when scanning) */}
            {status === 'scanning' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                {/* Targeting Box */}
                <div className="relative w-56 h-56 border-2 border-dashed border-white/30 rounded-2xl flex items-center justify-center">
                  {/* Luxury Gold Corner Brackets */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#D49B41] rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#D49B41] rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#D49B41] rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#D49B41] rounded-br-lg" />

                  {/* Animated Laser Scan Beam */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#D49B41] to-transparent shadow-[0_0_12px_#D49B41] animate-qr-scan" />

                  {/* Subtext */}
                  <div className="absolute -bottom-8 left-0 right-0 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wide backdrop-blur-xs">
                      Align QR Code Here
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Initializing Spinner */}
            {status === 'initializing' && (
              <div className="absolute inset-0 bg-[#1E2522] flex flex-col items-center justify-center text-white gap-2.5 p-4 text-center">
                <RefreshCw className="w-7 h-7 text-[#D49B41] animate-spin" />
                <span className="text-xs font-bold tracking-wide">Starting Camera...</span>
                <span className="text-[10px] text-white/60">Please allow browser camera permissions if prompted</span>
              </div>
            )}

            {/* Success Animation Overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 bg-[#1E3A2B]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 p-4 text-center animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-[#D49B41] text-[#1E3A2B] flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black tracking-wide text-white">QR Code Detected!</h4>
                <p className="text-xs font-mono font-bold text-[#D49B41] bg-black/40 px-3 py-1 rounded-lg">
                  {scannedResult}
                </p>
                <span className="text-[10px] text-white/70">Verifying booking with front desk...</span>
              </div>
            )}

            {/* Error / Permission Denied State */}
            {(status === 'error' || status === 'permission_denied') && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {status === 'permission_denied' ? 'Camera Permission Required' : 'Camera Unavailable'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">{errorMessage}</p>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => startScanner(activeCameraIndex)}
                    className="px-4 py-2 rounded-xl bg-[#1E3A2B] text-white text-xs font-bold hover:bg-[#3B5E43] transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={() => {
                      stopScanner();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Helper and Hardware Controls */}
          <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-[#D49B41]" />
              <span className="text-[11px] font-medium">Auto-detects instantly</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Torch Button if supported */}
              {hasTorch && status === 'scanning' && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                    torchOn
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle Flashlight"
                >
                  {torchOn ? <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> : <ZapOff className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              )}

              {/* Camera Switcher if multiple cameras */}
              {cameras.length > 1 && status === 'scanning' && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                  title="Switch camera lens"
                >
                  <RefreshCw className="w-3 h-3 text-[#1E3A2B]" />
                  <span>Switch ({activeCameraIndex + 1}/{cameras.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/70 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 font-medium">
            Having trouble? You can also type or paste the code into the terminal input.
          </p>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
