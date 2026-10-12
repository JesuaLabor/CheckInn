import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { X, Lock, Mail, User, Phone, Sparkles, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const { login, loginWithGoogle, quickLogin, isLoading, error } = useAuthStore();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleSimulator, setShowGoogleSimulator] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    try {
      await api.post('/auth/register/', regData);
      setRegSuccess(true);
      // Auto login after register
      setTimeout(async () => {
        const ok = await login(regData.username, regData.password);
        if (ok) {
          onClose();
          if (onSuccess) onSuccess();
        }
      }, 1000);
    } catch (err: any) {
      const errors = err.response?.data;
      if (typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        setRegError(`${firstKey}: ${errors[firstKey]}`);
      } else {
        setRegError('Registration failed. Please check your information.');
      }
    }
  };

  const handleQuickDemo = async (key: 'guest' | 'pine_staff' | 'firstinn_staff' | 'pine_admin') => {
    const ok = await quickLogin(key);
    if (ok) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const google = (window as any).google;

    if (clientId && google?.accounts?.id) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              setGoogleLoading(true);
              const ok = await loginWithGoogle(response.credential);
              setGoogleLoading(false);
              if (ok) {
                onClose();
                if (onSuccess) onSuccess();
              }
            }
          },
        });
        google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn('Google One Tap prompt warning:', e);
      }
    }

    // If Google Client ID is not configured yet or in local demo mode:
    setShowGoogleSimulator(true);
  };

  const handleGoogleSimulate = async (email: string, firstName: string, lastName: string) => {
    setGoogleLoading(true);
    const ok = await loginWithGoogle('demo_google_token_' + Date.now(), {
      email,
      first_name: firstName,
      last_name: lastName,
    });
    setGoogleLoading(false);
    setShowGoogleSimulator(false);
    if (ok) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {tab === 'login' ? 'Sign In to CheckInn' : 'Register Guest Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Malaybalay City Lodging Platform • Instant Soft-Hold Passes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="p-2 bg-slate-50 border-b border-slate-100 flex gap-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold text-center transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold text-center transition-all ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            New Guest Registration
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {tab === 'login' ? (
            <div>
              {error && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-shake">
                  {error}
                </div>
              )}

              {/* 1. Official Google One-Click Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading || isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] mb-4 group hover:border-slate-300"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold">
                  <span className="bg-white px-3 text-slate-400">or sign in with password</span>
                </div>
              </div>

              {/* 2. Password Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. juandelacruz"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-2"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              {/* 1-Click Quick Demo Personas */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                  <span>Instant Quick Demo Access</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('guest')}
                    className="p-3 text-left rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-xs active:scale-95"
                  >
                    <div className="font-bold text-slate-900">Juan Dela Cruz</div>
                    <div className="text-[10px] text-slate-500 font-medium">Demo Guest (juandelacruz)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('pine_staff')}
                    className="p-3 text-left rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-300 transition-all text-xs active:scale-95"
                  >
                    <div className="font-bold text-slate-900">Pine Hills Front Desk</div>
                    <div className="text-[10px] text-blue-600 font-bold">Staff Operations</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {regError && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-shake">
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Account registered! Logging you in automatically...</span>
                </div>
              )}

              {/* Google Sign-up Shortcut */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading || isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] mb-4 group hover:border-slate-300"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Instant Sign Up with Google</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold">
                  <span className="bg-white px-3 text-slate-400">or register with form</span>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      value={regData.first_name}
                      onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dela Cruz"
                      value={regData.last_name}
                      onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="juan@example.com"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="0917 123 4567"
                    value={regData.phone_number}
                    onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="juandelacruz2026"
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-4"
                >
                  Create Guest Account
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Google Sign-In Quick Simulator Dialog (Active when Google Client ID is pending setup) */}
      {showGoogleSimulator && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Sign In with Google</h3>
                <p className="text-[11px] text-slate-500">Choose Google account to proceed</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSimulate('jesua.labor@gmail.com', 'Jesua', 'Labor')}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition-all text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">Jesua Labor</div>
                  <div className="text-[11px] text-slate-500">jesua.labor@gmail.com</div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">Select</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSimulate('guest.traveler@gmail.com', 'Guest', 'Traveler')}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition-all text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">Guest Traveler</div>
                  <div className="text-[11px] text-slate-500">guest.traveler@gmail.com</div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">Select</span>
              </button>
            </div>

            {/* Custom Google Email input */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold text-slate-600">Or test with your own Google email:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customGoogleEmail.trim()) {
                      const name = customGoogleEmail.split('@')[0];
                      handleGoogleSimulate(customGoogleEmail.trim(), name, 'GoogleUser');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Go
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Once you paste your real Google Cloud Client ID into <code>frontend/.env</code>, this dialog will seamlessly open Google's official account popup!
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowGoogleSimulator(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
