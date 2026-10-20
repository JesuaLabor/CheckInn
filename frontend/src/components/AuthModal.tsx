import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { api } from '../api/client';
import localstayIcon from '../assets/logo_icon.png';
import {
  X,
  Lock,
  User,
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Shield,
  Building2,
  Compass,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '547965168394-3cej3iirv1390lvpirr2rpv8t22upotb.apps.googleusercontent.com';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const { login, loginWithGoogle, quickLogin, isLoading, error } = useAuthStore();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Google OAuth loading state
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      toast.success('Signed in successfully! Welcome back.');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      const err = useAuthStore.getState().error || 'No active account found with the given credentials.';
      toast.error(err);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register/', regData);
      toast.success('Account created successfully! Logging you in...');
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
        toast.error(`${firstKey}: ${errors[firstKey]}`);
      } else {
        toast.error('Registration failed. Please check your information.');
      }
    }
  };

  const handleQuickDemo = async (key: 'guest' | 'pine_staff' | 'pine_admin' | 'superadmin') => {
    const ok = await quickLogin(key);
    if (ok) {
      toast.success('Demo account connected!');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error('Quick demo login failed.');
    }
  };

  const handleGoogleClick = () => {
    const google = (window as any).google;

    if (!google?.accounts?.oauth2) {
      toast.warning('Google services are still loading. Please try again in a moment.');
      return;
    }

    try {
      setGoogleLoading(true);
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            const ok = await loginWithGoogle(tokenResponse.access_token);
            setGoogleLoading(false);
            if (ok) {
              toast.success('Google authentication successful!');
              onClose();
              if (onSuccess) onSuccess();
            } else {
              const err = useAuthStore.getState().error || 'Google authentication failed.';
              toast.error(err);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: (err: any) => {
          console.warn('Google OAuth popup error:', err);
          setGoogleLoading(false);
          if (err?.type === 'popup_closed') {
            toast.info('Google sign-in was cancelled.');
            return;
          }
          toast.error(
            err?.message || 'Google sign-in was blocked or closed. Please verify domain authorization in Google Cloud.'
          );
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.warn('Google OAuth2 error:', err);
      setGoogleLoading(false);
      toast.error(err?.message || 'Could not initialize Google sign-in.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container: Bottom sheet on mobile / centered dialog on desktop */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[min(92vh,760px)] flex flex-col border border-[#E8E2D8] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-safe">
        
        {/* Header - Fixed & Pinned */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#E8E2D8]/70 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-sm border border-[#D8D1C4]/90 flex items-center justify-center shrink-0 group">
              <img
                src={localstayIcon}
                alt="LocalStay"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#212529] tracking-tight leading-tight">
                {tab === 'login' ? 'Sign In to LocalStay' : 'Create Guest Account'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Verified Boutique Hotels & Digital Passes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher - Pinned Segmented Control */}
        <div className="px-6 pt-3 pb-2 bg-white shrink-0">
          <div className="p-1 bg-[#F4EFEA] rounded-2xl flex gap-1 border border-[#E8E2D8]/60">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                tab === 'login'
                  ? 'bg-white text-[#1E3A2B] shadow-sm shadow-black/5 border border-[#E8E2D8]/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                tab === 'register'
                  ? 'bg-white text-[#1E3A2B] shadow-sm shadow-black/5 border border-[#E8E2D8]/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Registration</span>
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable content area with smooth scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          {tab === 'login' ? (
            <div>

              {/* Official Google OAuth Popup Button */}
              <div className="mb-3.5">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={googleLoading || isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl border border-[#E8E2D8] bg-white hover:bg-[#FAF8F5] text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] group hover:border-[#3B5E43]/40"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8E2D8]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-3 text-slate-400">or sign in with password</span>
                </div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Username / Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-username-input"
                      type="text"
                      required
                      placeholder="e.g. juandelacruz"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] focus:border-[#3B5E43] outline-none bg-[#FAF8F5] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-bold border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] focus:border-[#3B5E43] outline-none bg-[#FAF8F5] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-sign-in-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-black text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-[0.98] transition-all mt-1"
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Account'}
                </button>
              </form>

              {/* 1-Click Quick Demo Personas */}
              <div className="mt-5 pt-4 border-t border-[#E8E2D8]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-[#D49B41]" />
                    <span>Instant Demo Accounts</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#D49B41] bg-[#D49B41]/10 px-2 py-0.5 rounded-full">
                    1-Click Test
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('guest')}
                    className="p-2.5 text-left rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] hover:bg-[#3B5E43]/10 hover:border-[#3B5E43] transition-all text-xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[#212529] text-[11px] group-hover:text-[#1E3A2B]">
                      <User className="w-3 h-3 text-[#3B5E43]" />
                      <span>Juan Dela Cruz</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Guest Traveler</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('pine_staff')}
                    className="p-2.5 text-left rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] hover:bg-[#D49B41]/10 hover:border-[#D49B41] transition-all text-xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[#212529] text-[11px] group-hover:text-[#8F611A]">
                      <Compass className="w-3 h-3 text-[#D49B41]" />
                      <span>Pine Hills Staff</span>
                    </div>
                    <div className="text-[10px] text-[#8F611A] font-bold">Front Desk Ops</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('pine_admin')}
                    className="p-2.5 text-left rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] hover:bg-emerald-50 hover:border-emerald-300 transition-all text-xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[#212529] text-[11px] group-hover:text-emerald-700">
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span>Hotel Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Inn Owner Portal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('superadmin')}
                    className="p-2.5 text-left rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] hover:bg-purple-50 hover:border-purple-300 transition-all text-xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[#212529] text-[11px] group-hover:text-purple-700">
                      <Shield className="w-3 h-3 text-purple-600" />
                      <span>Platform Admin</span>
                    </div>
                    <div className="text-[10px] text-purple-600 font-bold">Marketplace Ops</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>

              {/* Official Google OAuth Popup Button on Register */}
              <div className="mb-3.5">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={googleLoading || isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl border border-[#E8E2D8] bg-white hover:bg-[#FAF8F5] text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] group hover:border-[#3B5E43]/40"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Instant Sign Up with Google'}</span>
                </button>
              </div>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8E2D8]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-3 text-slate-400">or register with form</span>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      value={regData.first_name}
                      onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dela Cruz"
                      value={regData.last_name}
                      onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="juan@example.ph"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="0917 123 4567"
                      value={regData.phone_number}
                      onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="juandelacruz2026"
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 text-xs font-medium border border-[#E8E2D8] rounded-xl focus:ring-2 focus:ring-[#3B5E43] outline-none bg-[#FAF8F5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-black text-xs shadow-md shadow-[#1E3A2B]/20 active:scale-[0.98] transition-all mt-2"
                >
                  Create Guest Account
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
