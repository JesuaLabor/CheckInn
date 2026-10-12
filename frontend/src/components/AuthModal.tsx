import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { X, Lock, Mail, User, Phone, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const { login, quickLogin, isLoading, error } = useAuthStore();

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

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('firstinn_staff')}
                    className="p-3 text-left rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-300 transition-all text-xs active:scale-95"
                  >
                    <div className="font-bold text-slate-900">1st Inn Malaybalay</div>
                    <div className="text-[10px] text-slate-500 font-medium">Tenant Isolation</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('pine_admin')}
                    className="p-3 text-left rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-purple-50 hover:border-purple-300 transition-all text-xs active:scale-95"
                  >
                    <div className="font-bold text-slate-900">Pine Hills Owner</div>
                    <div className="text-[10px] text-purple-600 font-bold">Admin & Analytics</div>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="choose_username"
                      value={regData.username}
                      onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="juan@example.com"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="+63 917 123 4567"
                      value={regData.phone_number}
                      onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-2"
                >
                  Register & Continue to Booking
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
