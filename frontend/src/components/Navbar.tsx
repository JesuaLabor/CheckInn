import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  Hotel,
  CalendarCheck,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  Compass,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin';
  onNavigate: (tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin', hotelSlug?: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const { user, logout, quickLogin } = useAuthStore();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleSwitch = async (key: 'guest' | 'pine_staff' | 'firstinn_staff' | 'pine_admin' | 'breeze_owner' | 'superadmin') => {
    await quickLogin(key);
    setShowDemoMenu(false);
    if (key === 'guest') {
      onNavigate('guest_bookings');
    } else if (key === 'superadmin') {
      onNavigate('platform_admin');
    } else {
      onNavigate('staff_dashboard');
    }
  };

  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin' || user.role === 'superadmin');
  const isSuperAdmin = user && user.role === 'superadmin';

  return (
    <>
      {/* 
        Morphing Header Container
        - Un-scrolled (Image 1): Full-width flush container at top-0 with border-b
        - Scrolled (Image 2): Centered floating pill bar with rounded-full, border, backdrop-blur and shadow
      */}
      <div className="fixed top-0 inset-x-0 z-50 pointer-events-none flex justify-center transition-all duration-300 ease-out">
        <header
          className={`pointer-events-auto transition-all duration-300 ease-out ${
            isScrolled
              ? 'mt-3 sm:mt-4 w-[94%] sm:w-[90%] max-w-5xl rounded-full bg-[#080b11]/85 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.65)] py-2 sm:py-2.5 px-4 sm:px-6'
              : 'w-full rounded-none bg-[#080b11]/95 backdrop-blur-md border-b border-white/10 py-3 sm:py-3.5 px-4 sm:px-6 lg:px-8'
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              isScrolled ? 'w-full' : 'max-w-7xl mx-auto'
            }`}
          >
            {/* Left Group: Logo + Vertical Divider */}
            <div className="flex items-center shrink-0">
              <div
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => onNavigate('marketplace')}
              >
                {/* Brand Emblem */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950/20 rounded-[10px] flex items-center justify-center">
                    <Hotel className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
                  </div>
                </div>

                {/* Brand Wordmark */}
                <div className="flex items-center">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    LocalStay
                  </span>
                </div>
              </div>

              {/* Vertical Hairline Divider (Matching Reference Image) */}
              <div className="h-4 sm:h-5 w-px bg-white/20 mx-3 sm:mx-4 shrink-0"></div>

              {/* Desktop Nav Links (Center / Center-Left) */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onNavigate('marketplace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentTab === 'marketplace'
                      ? 'text-white bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Browse Inns
                </button>

                <button
                  onClick={() => onNavigate('partner_register')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentTab === 'partner_register'
                      ? 'text-white bg-white/10'
                      : 'text-emerald-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Partner With Us
                </button>

                {user && (
                  <button
                    onClick={() => onNavigate('guest_bookings')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'guest_bookings'
                        ? 'text-white bg-white/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>My Stays</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => onNavigate('platform_admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'platform_admin'
                        ? 'text-white bg-purple-600/30 border border-purple-500/40'
                        : 'text-purple-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Platform SaaS</span>
                    <span className="text-[9px] font-bold bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded">
                      Admin
                    </span>
                  </button>
                )}

                {isStaffOrAdmin && !isSuperAdmin && (
                  <button
                    onClick={() => onNavigate('staff_dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'staff_dashboard'
                        ? 'text-white bg-white/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{user?.role === 'admin' ? 'Hotel Admin' : 'Front Desk'}</span>
                    {user?.hotel_name && (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                        {user.hotel_name.split(' ')[0]}
                      </span>
                    )}
                  </button>
                )}

                {/* Persona Switcher Dropdown (Styled like Features ▾ / Company ▾) */}
                <div className="relative">
                  <button
                    onClick={() => setShowDemoMenu(!showDemoMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span>Demo Role</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showDemoMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDemoMenu(false)}></div>
                      <div className="absolute left-0 mt-2 w-80 bg-slate-900 rounded-2xl shadow-2xl border border-white/15 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white">
                        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                          <span>Switch Active Persona</span>
                          <span className="text-[9px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded font-bold">1-Click</span>
                        </div>

                        <div className="space-y-1 mt-1">
                          <button
                            onClick={() => handleRoleSwitch('superadmin')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white">Platform Super Admin</div>
                              <div className="text-[10px] text-slate-400">You • Review & approve hotel vendors</div>
                            </div>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">Super Admin</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('breeze_owner')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white">Breeze Eco Lodge Owner</div>
                              <div className="text-[10px] text-slate-400">Owner • Pending approval review flow</div>
                            </div>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Pending Owner</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('pine_admin')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white">Pine Hills Hotel Owner</div>
                              <div className="text-[10px] text-slate-400">Approved Owner • Add staff & inventory</div>
                            </div>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Approved Owner</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('pine_staff')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white">Pine Hills Front Desk</div>
                              <div className="text-[10px] text-slate-400">Staff • Approvals, walk-ins, & QR</div>
                            </div>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">Staff</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('guest')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white">Juan Dela Cruz</div>
                              <div className="text-[10px] text-slate-400">Guest • Marketplace & QR bookings</div>
                            </div>
                            <span className="text-[10px] bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full font-bold">Guest</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* Right Group: Action Pill Buttons (Matching Reference Image) */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* Secondary Action: Login Pill Button */}
              {user ? (
                <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                  <span className="text-xs font-bold text-white max-w-[100px] sm:max-w-[140px] truncate">
                    {user.first_name ? user.first_name : user.username}
                  </span>
                  <button
                    onClick={logout}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-400 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/10 transition-all active:scale-95"
                >
                  Login
                </button>
              )}

              {/* Primary Action: Vibrant 'Get Started ↗' Pill Button */}
              <button
                onClick={() => {
                  if (user && isStaffOrAdmin) {
                    onNavigate('staff_dashboard');
                  } else {
                    onNavigate('marketplace');
                  }
                }}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold px-4 sm:px-5 py-2 rounded-full shadow-lg shadow-blue-500/25 flex items-center gap-1 transition-all active:scale-95 shrink-0"
              >
                <span>Get Started</span>
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Floating Bottom Navigation Dock for Mobile Thumbs */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-40 bg-slate-950/90 backdrop-blur-2xl text-slate-400 rounded-3xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/15 flex items-center justify-around">
        <button
          onClick={() => onNavigate('marketplace')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'marketplace'
              ? 'text-white bg-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className={`w-5 h-5 ${currentTab === 'marketplace' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Explore</span>
        </button>

        <button
          onClick={() => onNavigate('guest_bookings')}
          className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'guest_bookings'
              ? 'text-white bg-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarCheck className={`w-5 h-5 ${currentTab === 'guest_bookings' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>My Stays</span>
          {user && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('staff_dashboard')}
          className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'staff_dashboard'
              ? 'text-white bg-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className={`w-5 h-5 ${currentTab === 'staff_dashboard' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Front Desk</span>
        </button>

        <button
          onClick={() => (user ? setShowDemoMenu(!showDemoMenu) : onOpenAuth())}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold text-slate-400 hover:text-white transition-all"
        >
          <UserIcon className="w-5 h-5 text-slate-400" />
          <span>{user ? 'Profile' : 'Login'}</span>
        </button>
      </nav>
    </>
  );
};
