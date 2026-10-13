import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import localstayLogo from '../assets/localstay_icon_with_text.png';
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
  Globe,
} from 'lucide-react';
import { useCurrencyStore, CurrencyCode } from '../stores/currencyStore';

interface NavbarProps {
  currentTab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin';
  onNavigate: (tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin', hotelSlug?: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const { user, logout, quickLogin } = useAuthStore();
  const { currency, setCurrency, symbols, fetchRates } = useCurrencyStore();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

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
              ? 'mt-3 sm:mt-4 w-[94%] sm:w-[90%] max-w-5xl rounded-full bg-[#FAF8F5]/95 backdrop-blur-2xl border border-[#E8E2D8] shadow-[0_12px_36px_rgba(33,37,41,0.12)] py-2 sm:py-2.5 px-4 sm:px-6'
              : 'w-full rounded-none bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E2D8] shadow-sm py-3 sm:py-3.5 px-4 sm:px-6 lg:px-8'
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
                className="flex items-center cursor-pointer group"
                onClick={() => onNavigate('marketplace')}
              >
                <img
                  src={localstayLogo}
                  alt="LocalStay"
                  className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>

              {/* Vertical Hairline Divider */}
              <div className="h-4 sm:h-5 w-px bg-[#E8E2D8] mx-3 sm:mx-4 shrink-0"></div>

              {/* Desktop Nav Links (Center / Center-Left) */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onNavigate('marketplace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentTab === 'marketplace'
                      ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-bold'
                      : 'text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5'
                  }`}
                >
                  Browse Inns
                </button>

                <button
                  onClick={() => onNavigate('partner_register')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentTab === 'partner_register'
                      ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-bold'
                      : 'text-[#8F611A] hover:text-[#1E3A2B] hover:bg-black/5 font-semibold'
                  }`}
                >
                  Partner With Us
                </button>

                {user && (
                  <button
                    onClick={() => onNavigate('guest_bookings')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'guest_bookings'
                        ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-bold'
                        : 'text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5'
                    }`}
                  >
                    <span>My Stays</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D49B41] animate-pulse"></span>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => onNavigate('platform_admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'platform_admin'
                        ? 'text-purple-800 bg-purple-100 border border-purple-200 font-bold'
                        : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                    }`}
                  >
                    <span>Platform SaaS</span>
                    <span className="text-[9px] font-bold bg-purple-200/70 text-purple-800 px-1.5 py-0.2 rounded">
                      Admin
                    </span>
                  </button>
                )}

                {isStaffOrAdmin && !isSuperAdmin && (
                  <button
                    onClick={() => onNavigate('staff_dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentTab === 'staff_dashboard'
                        ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-bold'
                        : 'text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5'
                    }`}
                  >
                    <span>{user?.role === 'admin' ? 'Hotel Admin' : 'Front Desk'}</span>
                    {user?.hotel_name && (
                      <span className="text-[10px] font-bold text-[#8F611A] bg-[#FAF3E0] border border-[#D49B41]/30 px-1.5 py-0.2 rounded">
                        {user.hotel_name.split(' ')[0]}
                      </span>
                    )}
                  </button>
                )}

                {/* Persona Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDemoMenu(!showDemoMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5 transition-colors"
                  >
                    <span>Demo Role</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showDemoMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDemoMenu(false)}></div>
                      <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#212529]">
                        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-[#E8E2D8] flex items-center justify-between">
                          <span>Switch Active Persona</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">1-Click</span>
                        </div>

                        <div className="space-y-1 mt-1">
                          <button
                            onClick={() => handleRoleSwitch('superadmin')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#212529]">Platform Super Admin</div>
                              <div className="text-[10px] text-slate-500">You • Review & approve hotel vendors</div>
                            </div>
                            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">Super Admin</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('breeze_owner')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#212529]">Breeze Eco Lodge Owner</div>
                              <div className="text-[10px] text-slate-500">Owner • Pending approval review flow</div>
                            </div>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Pending Owner</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('pine_admin')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#212529]">Pine Hills Hotel Owner</div>
                              <div className="text-[10px] text-slate-500">Approved Owner • Add staff & inventory</div>
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Approved Owner</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('pine_staff')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#212529]">Pine Hills Front Desk</div>
                              <div className="text-[10px] text-slate-500">Staff • Approvals, walk-ins, & QR</div>
                            </div>
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">Staff</span>
                          </button>

                          <button
                            onClick={() => handleRoleSwitch('guest')}
                            className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#212529]">Juan Dela Cruz</div>
                              <div className="text-[10px] text-slate-500">Guest • Marketplace & QR bookings</div>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">Guest</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* Right Group: Action Pill Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Currency Picker Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                  className="flex items-center gap-1 bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1.5 rounded-full border border-[#E8E2D8] transition-colors"
                  title="Change Currency"
                >
                  <Globe className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#3B5E43]" />
                  <span>{currency}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {showCurrencyMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-1.5 z-50 text-[#212529] animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                        <span>Currency</span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold">Auto FX</span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {(['PHP', 'USD', 'JPY', 'EUR', 'SGD', 'AUD', 'GBP'] as CurrencyCode[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setCurrency(c);
                              setShowCurrencyMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                              currency === c
                                ? 'bg-[#1E3A2B]/10 text-[#1E3A2B] font-bold'
                                : 'hover:bg-[#FAF8F5] text-[#212529]'
                            }`}
                          >
                            <span>{c}</span>
                            <span className="text-slate-400 text-[11px]">{symbols[c]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Secondary Action: Login Pill Button */}
              {user ? (
                <div className="flex items-center gap-1.5 bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 px-3 py-1.5 rounded-full border border-[#E8E2D8] transition-colors">
                  <span className="text-xs font-bold text-[#212529] max-w-[100px] sm:max-w-[140px] truncate">
                    {user.first_name ? user.first_name : user.username}
                  </span>
                  <button
                    onClick={logout}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] text-xs font-semibold px-4 py-2 rounded-full border border-[#E8E2D8] transition-all active:scale-95 shadow-sm"
                >
                  Login
                </button>
              )}

              {/* Primary Action: Warm Ochre 'Get Started ↗' Pill Button */}
              <button
                onClick={() => {
                  if (user && isStaffOrAdmin) {
                    onNavigate('staff_dashboard');
                  } else {
                    onNavigate('marketplace');
                  }
                }}
                className="bg-[#D49B41] hover:bg-[#BF8832] text-[#212529] text-xs font-black px-4 sm:px-5 py-2 rounded-full shadow-md shadow-[#D49B41]/25 flex items-center gap-1 transition-all active:scale-95 shrink-0"
              >
                <span>Get Started</span>
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Floating Bottom Navigation Dock for Mobile Thumbs */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-40 bg-[#FAF8F5]/95 backdrop-blur-2xl text-slate-600 rounded-3xl p-1.5 shadow-[0_12px_40px_rgba(33,37,41,0.12)] border border-[#E8E2D8] flex items-center justify-around">
        <button
          onClick={() => onNavigate('marketplace')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'marketplace'
              ? 'text-[#1E3A2B] bg-[#1E3A2B]/10'
              : 'text-slate-600 hover:text-[#1E3A2B]'
          }`}
        >
          <Compass className={`w-5 h-5 ${currentTab === 'marketplace' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
          <span>Explore</span>
        </button>

        <button
          onClick={() => onNavigate('guest_bookings')}
          className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'guest_bookings'
              ? 'text-[#1E3A2B] bg-[#1E3A2B]/10'
              : 'text-slate-600 hover:text-[#1E3A2B]'
          }`}
        >
          <CalendarCheck className={`w-5 h-5 ${currentTab === 'guest_bookings' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
          <span>My Stays</span>
          {user && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#D49B41] ring-2 ring-[#FAF8F5]"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('staff_dashboard')}
          className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'staff_dashboard'
              ? 'text-[#1E3A2B] bg-[#1E3A2B]/10'
              : 'text-slate-600 hover:text-[#1E3A2B]'
          }`}
        >
          <Building2 className={`w-5 h-5 ${currentTab === 'staff_dashboard' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
          <span>Front Desk</span>
        </button>

        <button
          onClick={() => (user ? setShowDemoMenu(!showDemoMenu) : onOpenAuth())}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
        >
          <UserIcon className="w-5 h-5 text-slate-500" />
          <span>{user ? 'Profile' : 'Login'}</span>
        </button>
      </nav>
    </>
  );
};
