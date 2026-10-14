import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import localstayLogo from '../assets/localstay_icon_with_text.png';
import {
  CalendarCheck,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Globe,
  HelpCircle,
  Compass,
  MapPin,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useCurrencyStore, CurrencyCode } from '../stores/currencyStore';

interface NavbarProps {
  currentTab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin';
  onNavigate: (tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin', hotelSlug?: string) => void;
  onOpenAuth: () => void;
  onOpenSupport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenAuth,
  onOpenSupport,
}) => {
  const { user, logout } = useAuthStore();
  const { currency, setCurrency, symbols, fetchRates } = useCurrencyStore();
  const [showBrowseMenu, setShowBrowseMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin' || user.role === 'superadmin');
  const isSuperAdmin = user && user.role === 'superadmin';

  const quickDestinations = [
    { name: 'Boracay', badge: 'Island' },
    { name: 'Siargao', badge: 'Surfing' },
    { name: 'Baguio', badge: 'Highlands' },
    { name: 'Cebu', badge: 'Heritage' },
    { name: 'Manila', badge: 'Urban' },
    { name: 'Malaybalay', badge: 'Pine Hills' },
    { name: 'Tokyo', badge: 'Intl' },
    { name: 'Bali', badge: 'Intl' },
  ];

  return (
    <>
      {/* 
        Production Header Container
        - Un-scrolled: Full-width Warm Cream (#FAF8F5) Glass matching the LocalStay palette
        - Scrolled: Centered Floating Pill Bar with Warm Cream (#FAF8F5) backdrop
      */}
      <div className="fixed top-0 inset-x-0 z-50 pointer-events-none flex justify-center transition-all duration-300 ease-out">
        <header
          className={`pointer-events-auto transition-all duration-300 ease-out ${
            isScrolled
              ? 'mt-3 sm:mt-4 w-[95%] sm:w-[92%] max-w-5xl rounded-full bg-[#FAF8F5]/95 backdrop-blur-xl border border-[#E8E2D8] shadow-[0_16px_40px_rgba(33,37,41,0.12)] py-2 sm:py-2.5 px-4 sm:px-6'
              : 'w-full rounded-none bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E2D8] shadow-sm py-3 sm:py-3.5 px-4 sm:px-6 lg:px-8'
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              isScrolled ? 'w-full' : 'max-w-7xl mx-auto'
            }`}
          >
            {/* Left Group: Logo naturally sitting on the Warm Cream background */}
            <div className="flex items-center shrink-0">
              <div
                className="flex items-center cursor-pointer group"
                onClick={() => onNavigate('marketplace')}
              >
                <img
                  src={localstayLogo}
                  alt="LocalStay"
                  className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </div>

            {/* Center / Left-Center: Main Navigation Items matching user specification */}
            <nav className="hidden md:flex items-center gap-2 sm:gap-4">
              {/* 1. Browse Stays ˅ Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBrowseMenu(!showBrowseMenu)}
                  className={`flex items-center gap-1.5 py-2 px-1 text-sm font-semibold transition-colors ${
                    currentTab === 'marketplace'
                      ? 'text-[#1E3A2B] font-bold'
                      : 'text-[#212529] hover:text-[#1E3A2B]'
                  }`}
                >
                  <span>Browse Stays</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showBrowseMenu ? 'rotate-180 text-[#D49B41]' : 'opacity-70'
                    }`}
                  />
                </button>

                {showBrowseMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBrowseMenu(false)}></div>
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-3 z-50 text-[#212529] animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-[#E8E2D8] flex items-center justify-between">
                        <span>Popular Destinations</span>
                        <span className="text-[9px] bg-[#D49B41]/20 text-[#8F611A] px-1.5 py-0.5 rounded font-bold">
                          Global
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {quickDestinations.map((dest) => (
                          <button
                            key={dest.name}
                            onClick={() => {
                              setShowBrowseMenu(false);
                              onNavigate('marketplace');
                            }}
                            className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left"
                          >
                            <span className="font-semibold text-[#212529]">{dest.name}</span>
                            <span className="text-[9px] text-slate-400">{dest.badge}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
                        <button
                          onClick={() => {
                            setShowBrowseMenu(false);
                            onNavigate('marketplace');
                          }}
                          className="w-full text-center py-1.5 rounded-lg text-xs font-bold text-[#8F611A] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>View All Inns & Stays</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 2. My Bookings */}
              <button
                onClick={() => {
                  if (!user) {
                    onOpenAuth();
                  } else {
                    onNavigate('guest_bookings');
                  }
                }}
                className={`flex items-center gap-1.5 py-2 px-1 text-sm font-semibold transition-colors ${
                  currentTab === 'guest_bookings'
                    ? 'text-[#1E3A2B] font-bold'
                    : 'text-[#212529] hover:text-[#1E3A2B]'
                }`}
              >
                <span>My Bookings</span>
                {user && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D49B41] animate-pulse"></span>
                )}
              </button>

              {/* 3. Help & Support */}
              <button
                onClick={() => {
                  if (onOpenSupport) {
                    onOpenSupport();
                  }
                }}
                className="flex items-center gap-1.5 py-2 px-1 text-sm font-semibold text-[#212529] hover:text-[#1E3A2B] transition-colors"
              >
                <span>Help & Support</span>
              </button>
            </nav>

            {/* Right Group: Currency + List Your Property + Sign In / User Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Currency Picker Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                  className="flex items-center gap-1.5 bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] text-xs font-bold px-2.5 py-2 rounded-full border border-[#E8E2D8] transition-colors"
                  title="Change Currency"
                >
                  <Globe className="w-3.5 h-3.5 text-[#3B5E43]" />
                  <span>{currency}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {showCurrencyMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-1.5 z-50 text-[#212529] animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-[#E8E2D8] flex items-center justify-between">
                        <span>Currency</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-bold">Auto FX</span>
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

              {/* 4. 'List Your Property' (Warm Ochre Solid Button) */}
              <button
                onClick={() => onNavigate('partner_register')}
                className="bg-[#D49B41] hover:bg-[#BF8832] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-xl sm:rounded-full shadow-md shadow-[#D49B41]/25 transition-all active:scale-95 shrink-0"
              >
                List Your Property
              </button>

              {/* 5. 'Sign in' (Refined Ghost Outline Button) OR Logged-in Profile Pill */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl sm:rounded-full border border-[#E8E2D8] transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#1E3A2B] text-white text-[10px] font-black flex items-center justify-center uppercase">
                      {user.first_name ? user.first_name.charAt(0) : user.username.charAt(0)}
                    </div>
                    <span className="max-w-[80px] sm:max-w-[120px] truncate font-bold">
                      {user.first_name || user.username}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-2 z-50 text-[#212529] animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-2 border-b border-[#E8E2D8]">
                          <p className="text-xs font-bold text-[#212529]">{user.first_name || user.username}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user.email || user.username}</p>
                        </div>

                        <div className="space-y-1 mt-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              onNavigate('guest_bookings');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#212529] hover:bg-[#FAF8F5] transition-colors text-left font-medium"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-[#D49B41]" />
                            <span>My Bookings</span>
                          </button>

                          {isStaffOrAdmin && !isSuperAdmin && (
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                onNavigate('staff_dashboard');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#212529] hover:bg-[#FAF8F5] transition-colors text-left font-medium"
                            >
                              <Building2 className="w-3.5 h-3.5 text-[#3B5E43]" />
                              <span>Front Desk Dashboard</span>
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                onNavigate('platform_admin');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-purple-700 hover:bg-purple-50 transition-colors text-left font-medium"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>Platform Admin</span>
                            </button>
                          )}

                          <div className="pt-1 border-t border-[#E8E2D8]">
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                logout();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="border border-[#212529]/30 hover:border-[#1E3A2B] text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-xl sm:rounded-full transition-all active:scale-95 shadow-sm"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Floating Bottom Navigation Dock for Mobile Thumbs */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-40 bg-[#FAF8F5]/95 backdrop-blur-2xl text-slate-600 rounded-3xl p-1.5 shadow-[0_16px_40px_rgba(33,37,41,0.12)] border border-[#E8E2D8] flex items-center justify-around">
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
          onClick={() => {
            if (!user) onOpenAuth();
            else onNavigate('guest_bookings');
          }}
          className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all duration-200 ${
            currentTab === 'guest_bookings'
              ? 'text-[#1E3A2B] bg-[#1E3A2B]/10'
              : 'text-slate-600 hover:text-[#1E3A2B]'
          }`}
        >
          <CalendarCheck className={`w-5 h-5 ${currentTab === 'guest_bookings' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
          <span>My Bookings</span>
          {user && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#D49B41] ring-2 ring-[#FAF8F5]"></span>
          )}
        </button>

        <button
          onClick={() => {
            if (onOpenSupport) onOpenSupport();
          }}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
        >
          <HelpCircle className="w-5 h-5 text-slate-500" />
          <span>Support</span>
        </button>

        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowUserMenu(!showUserMenu);
          }}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[11px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
        >
          <UserIcon className="w-5 h-5 text-slate-500" />
          <span>{user ? (user.first_name || 'Account') : 'Sign in'}</span>
        </button>
      </nav>
    </>
  );
};
