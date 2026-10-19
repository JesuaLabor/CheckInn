import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import localstayLogo from '../assets/localstay_icon_with_text.png';
import {
  CalendarCheck,
  Building2,
  Building,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Globe,
  HelpCircle,
  Compass,
  ShieldCheck,
  ExternalLink,
  Bed,
  Users,
  TrendingUp,
  Settings,
  PlusCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Ticket,
  X,
  History,
  QrCode,
  Layers,
} from 'lucide-react';
import { useCurrencyStore, CurrencyCode } from '../stores/currencyStore';
import { toast } from '../stores/toastStore';

export type NavTab =
  | 'marketplace'
  | 'guest_bookings'
  | 'staff_dashboard'
  | 'partner_register'
  | 'platform_admin'
  | 'inn_detail';

interface NavbarProps {
  currentTab: NavTab;
  currentSubTab?: string;
  onNavigate: (tab: NavTab, hotelSlug?: string | null, subTab?: string) => void;
  onOpenAuth: () => void;
  onOpenSupport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  currentSubTab,
  onNavigate,
  onOpenAuth,
  onOpenSupport,
}) => {
  const { user, logout } = useAuthStore();
  const { currency, setCurrency, symbols, fetchRates } = useCurrencyStore();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Dropdown container refs for robust click-outside detection
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileDockRef = useRef<HTMLElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // UI/UX Standard: Auto-close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (
        showCurrencyMenu &&
        currencyMenuRef.current &&
        !currencyMenuRef.current.contains(target)
      ) {
        setShowCurrencyMenu(false);
      }

      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        (!mobileDockRef.current || !mobileDockRef.current.contains(target)) &&
        (!mobileSheetRef.current || !mobileSheetRef.current.contains(target))
      ) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCurrencyMenu(false);
        setShowUserMenu(false);
      }
    };

    if (showCurrencyMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCurrencyMenu, showUserMenu]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Scroll detection: auto-hide upper and bottom nav on mobile when scrolling down, reveal on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 30);

      // Always keep navbars visible at or near the top of the page
      if (currentY <= 40) {
        setIsNavVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      const diff = currentY - lastScrollY.current;
      // 10px delta threshold prevents jitter and momentum bounce
      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          // Scrolling down into content -> hide navigation on mobile
          setIsNavVisible(false);
        } else {
          // Scrolling up towards top -> reveal navigation
          setIsNavVisible(true);
        }
        lastScrollY.current = currentY;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure navigation is always revealed immediately when switching tabs or views
  const prevNavKey = useRef(`${currentTab}_${currentSubTab}`);
  if (prevNavKey.current !== `${currentTab}_${currentSubTab}`) {
    prevNavKey.current = `${currentTab}_${currentSubTab}`;
    if (!isNavVisible) {
      setIsNavVisible(true);
    }
  }

  const isSuperAdmin = user?.role === 'superadmin';
  const isHotelAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isGuestOrPublic = !user || user.role === 'guest';
  const isDarkConsole = false;



  const handleLogoClick = () => {
    if (isSuperAdmin) {
      onNavigate('platform_admin');
    } else if (isHotelAdmin || isStaff) {
      onNavigate('staff_dashboard');
    } else {
      onNavigate('marketplace');
    }
  };

  const handleSignOut = () => {
    setShowUserMenu(false);
    logout();
    onNavigate('marketplace');
    toast.info('Signed out successfully.');
  };

  // Auto-hide navigation on mobile when scrolling down unless a sheet/menu is currently opened
  const isNavHiddenOnMobile = !isNavVisible && !showUserMenu && !showCurrencyMenu;

  return (
    <>
      {/* 
        Production Header Container
        - Un-scrolled: Full-width Warm Cream (#FAF8F5) Glass matching the LocalStay palette
        - Scrolled: Centered Floating Pill Bar with Warm Cream (#FAF8F5) backdrop
        - Mobile Scroll: Smoothly slides up out of view on scroll down, returns on scroll up
      */}
      <div
        className={`fixed top-0 inset-x-0 z-50 pointer-events-none flex justify-center transition-all duration-300 ease-out ${
          isNavHiddenOnMobile
            ? 'max-md:-translate-y-full max-md:opacity-0'
            : 'max-md:translate-y-0 max-md:opacity-100'
        }`}
      >
        <header
          className={`pointer-events-auto transition-all duration-300 ease-out ${
            isNavHiddenOnMobile ? 'max-md:pointer-events-none' : ''
          } ${
            isDarkConsole
              ? isScrolled
                ? 'mt-[calc(env(safe-area-inset-top,0px)+0.75rem)] w-[95%] sm:w-[92%] max-w-5xl rounded-full bg-[#16191C]/95 backdrop-blur-xl border border-[#2A2E33] shadow-[0_16px_40px_rgba(0,0,0,0.5)] py-2 sm:py-2.5 px-4 sm:px-6 text-white'
                : 'w-full rounded-none bg-[#16191C]/95 backdrop-blur-md border-b border-[#2A2E33] shadow-sm pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 sm:py-3.5 px-4 sm:px-6 lg:px-8 text-white'
              : isScrolled
                ? 'mt-[calc(env(safe-area-inset-top,0px)+0.75rem)] w-[95%] sm:w-[92%] max-w-5xl rounded-full bg-[#FAF8F5]/95 backdrop-blur-xl border border-[#E8E2D8] shadow-[0_16px_40px_rgba(33,37,41,0.12)] py-2 sm:py-2.5 px-4 sm:px-6 text-[#212529]'
                : 'w-full rounded-none bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E2D8] shadow-sm pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 sm:py-3.5 px-4 sm:px-6 lg:px-8 text-[#212529]'
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              isScrolled ? 'w-full' : 'max-w-7xl mx-auto'
            }`}
          >
            {/* Left Group: Logo + Role/Hotel Context Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="flex items-center cursor-pointer group"
                onClick={handleLogoClick}
                title="Go to Home"
              >
                <img
                  src={localstayLogo}
                  alt="LocalStay"
                  className={`h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105 ${
                    isDarkConsole ? 'brightness-110 drop-shadow-[0_2px_8px_rgba(212,155,65,0.3)]' : ''
                  }`}
                />
              </div>

              {/* Contextual Role & Property Badge */}
              {isStaff && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="max-w-[130px] md:max-w-[190px] truncate">
                    {user.hotel_name || 'Front Desk'}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 font-medium hidden md:inline">
                    • Front Desk Reception
                  </span>
                </div>
              )}

              {isHotelAdmin && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-[#D49B41]/40 text-[#8F611A] text-xs font-bold shadow-2xs">
                  <span className="text-[11px]">👑</span>
                  <span className="max-w-[130px] md:max-w-[190px] truncate">
                    {user.hotel_name || 'Property'}
                  </span>
                  <span className="text-[10px] text-[#8F611A]/80 font-medium hidden md:inline">
                    • Owner Portal
                  </span>
                </div>
              )}

              {isSuperAdmin && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-white text-xs font-bold shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D49B41]" />
                  <span className="truncate">Platform Governance</span>
                  <span className="text-[10px] text-amber-400 font-extrabold hidden md:inline">
                    • Superadmin
                  </span>
                </div>
              )}
            </div>

            {/* Center: Strictly Role-Tailored Navigation Items */}
            {/* 1. FRONT DESK STAFF CENTER NAV */}
            {isStaff && (
              <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'pending')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending')
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Guest Arrivals & Reservation Queue"
                >
                  <Clock className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Arrivals Queue</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'checkin')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'checkin'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Front Desk QR Check-in Terminal"
                >
                  <QrCode className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'checkin' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>QR Check-in</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'rooms')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'rooms'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Room Status & Housekeeping Board"
                >
                  <Bed className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'rooms' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Rooms Board</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'requests')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'requests'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Active Guest Service Requests"
                >
                  <BellRing className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'requests' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Requests</span>
                </button>
              </nav>
            )}

            {/* 2. HOTEL OWNER / ADMIN CENTER NAV */}
            {isHotelAdmin && (
              <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'pending')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending' || currentSubTab === 'rooms' || currentSubTab === 'checkin' || currentSubTab === 'requests')
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Front Desk Operations Hub"
                >
                  <Building2 className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending' || currentSubTab === 'rooms' || currentSubTab === 'checkin' || currentSubTab === 'requests') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Operations</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'inventory_manage')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'inventory_manage'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Room Inventory, Pricing & Availability"
                >
                  <Layers className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'inventory_manage' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Rooms & Rates</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'reports')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'reports'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Occupancy & Financial Reports"
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'reports' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'staff_manage')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'staff_manage'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Staff Accounts & Role Permissions"
                >
                  <Users className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'staff_manage' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Staff Team</span>
                </button>

                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'audit_trail')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'staff_dashboard' && currentSubTab === 'audit_trail'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Immutable Activity Log & Rate Changes"
                >
                  <History className={`w-3.5 h-3.5 ${currentTab === 'staff_dashboard' && currentSubTab === 'audit_trail' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Audit Trail</span>
                </button>
              </nav>
            )}

            {/* 3. SUPER ADMIN CENTER NAV */}
            {isSuperAdmin && (
              <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => onNavigate('platform_admin', undefined, 'verifications')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'platform_admin' && (!currentSubTab || currentSubTab === 'verifications' || currentSubTab === 'pending' || currentSubTab === 'approved')
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Partner Verification Queue & Lodging Dossiers"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${currentTab === 'platform_admin' && (!currentSubTab || currentSubTab === 'verifications' || currentSubTab === 'pending' || currentSubTab === 'approved') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Approvals</span>
                </button>

                <button
                  onClick={() => onNavigate('platform_admin', undefined, 'audit_trail')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'platform_admin' && currentSubTab === 'audit_trail'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Platform-wide Security & Multi-Hotel Activity Logs"
                >
                  <History className={`w-3.5 h-3.5 ${currentTab === 'platform_admin' && currentSubTab === 'audit_trail' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Platform Audit Trail</span>
                </button>

                <button
                  onClick={() => onNavigate('platform_admin', undefined, 'all')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'platform_admin' && currentSubTab === 'all'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Platform Metrics & Overall Lodgings"
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${currentTab === 'platform_admin' && currentSubTab === 'all' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
                  <span>Metrics</span>
                </button>

                <button
                  onClick={() => onNavigate('marketplace')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs transition-all ${
                    currentTab === 'marketplace'
                      ? 'bg-[#1E3A2B] text-white shadow-xs font-extrabold'
                      : 'text-slate-700 hover:text-[#1E3A2B] hover:bg-[#1E3A2B]/5 font-bold'
                  }`}
                  title="Inspect Live Guest Marketplace"
                >
                  <Compass className={`w-3.5 h-3.5 ${currentTab === 'marketplace' ? 'text-[#D49B41]' : 'opacity-70'}`} />
                  <span>Marketplace</span>
                </button>
              </nav>
            )}

            {/* 4. GUEST / PUBLIC CENTER NAV */}
            {isGuestOrPublic && (
              <nav className="hidden md:flex items-center gap-2 sm:gap-4">
                {/* Explore Stays link */}
                <button
                  onClick={() => onNavigate('marketplace')}
                  className={`flex items-center gap-1.5 py-2 px-1 text-sm font-semibold transition-colors ${
                    currentTab === 'marketplace'
                      ? 'text-[#1E3A2B] font-bold'
                      : 'text-[#212529] hover:text-[#1E3A2B]'
                  }`}
                >
                  <Compass className="w-4 h-4 text-[#D49B41]" />
                  <span>Explore Stays</span>
                </button>

                {/* My Bookings link (Direct 1-click access for logged-in guests) */}
                {user && (
                  <button
                    onClick={() => onNavigate('guest_bookings')}
                    className={`flex items-center gap-1.5 py-2 px-1 text-sm font-semibold transition-colors ${
                      currentTab === 'guest_bookings'
                        ? 'text-[#1E3A2B] font-bold'
                        : 'text-[#212529] hover:text-[#1E3A2B]'
                    }`}
                  >
                    <CalendarCheck className={`w-4 h-4 ${currentTab === 'guest_bookings' ? 'text-[#1E3A2B]' : 'text-[#D49B41]'}`} />
                    <span>My Bookings</span>
                  </button>
                )}

                {/* Help & Support */}
                {onOpenSupport && (
                  <button
                    onClick={onOpenSupport}
                    className="flex items-center gap-1.5 py-2 px-1 text-sm font-semibold text-[#212529] hover:text-[#1E3A2B] transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    <span>Help & Support</span>
                  </button>
                )}
              </nav>
            )}

            {/* Right Group: Role-Tailored Actions & Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Currency Picker Dropdown (Strictly Guest & Public) */}
              {isGuestOrPublic && (
                <div className="relative" ref={currencyMenuRef}>
                  <button
                    onClick={() => {
                      setShowCurrencyMenu(!showCurrencyMenu);
                      setShowUserMenu(false);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-2 rounded-full border transition-colors ${
                      isDarkConsole
                        ? 'bg-[#22262B] hover:bg-[#2A2E33] text-slate-200 border-[#33383F]'
                        : 'bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] border-[#E8E2D8]'
                    }`}
                    title="Change Currency"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isDarkConsole ? 'text-[#D49B41]' : 'text-[#3B5E43]'}`} />
                    <span>{currency}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </button>

                  {showCurrencyMenu && (
                    <div
                      className={`absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                          isDarkConsole
                            ? 'bg-[#1E2227] border border-[#33383F] text-slate-100'
                            : 'bg-white border border-[#E8E2D8] text-[#212529]'
                        }`}
                      >
                        <div
                          className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border-b flex items-center justify-between ${
                            isDarkConsole ? 'border-[#33383F] text-slate-400' : 'border-[#E8E2D8] text-slate-400'
                          }`}
                        >
                          <span>Currency</span>
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                              isDarkConsole ? 'bg-slate-700/40 text-amber-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Live FX
                          </span>
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
                                  ? isDarkConsole
                                    ? 'bg-purple-600/30 text-purple-200 font-bold'
                                    : 'bg-[#1E3A2B]/10 text-[#1E3A2B] font-bold'
                                  : isDarkConsole
                                    ? 'hover:bg-white/5 text-slate-200'
                                    : 'hover:bg-[#FAF8F5] text-[#212529]'
                              }`}
                            >
                              <span>{c}</span>
                              <span className="opacity-60 text-[11px]">{symbols[c]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              )}

              {/* Guest / Public: 'List Your Property' Button */}
              {isGuestOrPublic && (
                <button
                  onClick={() => onNavigate('partner_register')}
                  className="hidden sm:inline-flex bg-[#D49B41] hover:bg-[#BF8832] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-xl sm:rounded-full shadow-md shadow-[#D49B41]/25 transition-all active:scale-95 shrink-0"
                >
                  List Your Property
                </button>
              )}

              {/* Staff: Direct Walk-In Quick Action Button */}
              {isStaff && (
                <button
                  onClick={() => onNavigate('staff_dashboard', undefined, 'walkin')}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-[#1E3A2B] hover:bg-[#3B5E43] text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                  title="Open fast walk-in guest check-in modal"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#D49B41]" />
                  <span>+ Walk-In</span>
                </button>
              )}

              {/* Hotel Owner: View Public Listing Quick Button */}
              {isHotelAdmin && (
                <button
                  onClick={() => {
                    if (user.hotel_slug) {
                      onNavigate('inn_detail', user.hotel_slug);
                    } else {
                      onNavigate('marketplace');
                    }
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#1E3A2B] text-slate-700 hover:text-[#1E3A2B] text-xs font-bold px-3 py-2 rounded-xl shadow-2xs transition-all active:scale-95 shrink-0"
                  title="View your public hotel listing page"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#D49B41]" />
                  <span>View Live Listing</span>
                </button>
              )}

              {/* Superadmin: Live System Status Pill */}
              {isSuperAdmin && (
                <div className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Platform Active</span>
                </div>
              )}

              {/* User Profile Pill OR Sign In Button */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      setShowCurrencyMenu(false);
                    }}
                    className={`flex items-center gap-2 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-full border transition-all ${
                      isDarkConsole
                        ? 'bg-[#22262B] hover:bg-[#2A2E33] text-slate-200 border-[#33383F]'
                        : 'bg-[#F4EFEA] hover:bg-[#E8E2D8]/60 text-[#212529] border-[#E8E2D8]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center uppercase shadow-2xs ${
                        isSuperAdmin
                          ? 'bg-[#D49B41] text-[#212529]'
                          : isHotelAdmin
                          ? 'bg-[#8F611A]'
                          : isStaff
                          ? 'bg-[#1E3A2B]'
                          : 'bg-[#212529]'
                      }`}
                    >
                      {user.first_name ? user.first_name.charAt(0) : user.username.charAt(0)}
                    </div>
                    <span className="hidden sm:inline max-w-[70px] sm:max-w-[110px] truncate font-bold">
                      {user.first_name || user.username}
                    </span>
                    <span
                      className={`hidden xl:inline text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        isSuperAdmin
                          ? isDarkConsole
                            ? 'bg-[#D49B41]/20 text-[#D49B41] border border-[#D49B41]/40'
                            : 'bg-emerald-100 text-emerald-800'
                          : isHotelAdmin
                          ? 'bg-amber-100 text-[#8F611A]'
                          : isStaff
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {user.role}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {/* Desktop Profile Shortcut Dropdown Menu (Hidden on mobile < sm, visible >= sm) */}
                  {showUserMenu && (
                    <div
                      className={`hidden sm:block absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                          isDarkConsole
                            ? 'bg-[#181B1F] border border-[#2E3339] text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                            : 'bg-white border border-[#E8E2D8] text-[#212529] shadow-[0_20px_50px_rgba(33,37,41,0.18)]'
                        }`}
                      >
                        {/* Profile Header Card */}
                        <div
                          className={`px-3 py-3 border-b rounded-xl mb-1.5 ${
                            isDarkConsole
                              ? 'bg-[#1E2228] border-[#2A2E33]'
                              : 'bg-[#FAF8F5] border-[#E8E2D8]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full text-white text-sm font-black flex items-center justify-center uppercase shrink-0 shadow-sm ${
                                isSuperAdmin
                                  ? 'bg-[#D49B41] text-[#212529]'
                                  : isHotelAdmin
                                  ? 'bg-[#8F611A]'
                                  : isStaff
                                  ? 'bg-[#1E3A2B]'
                                  : 'bg-[#212529]'
                              }`}
                            >
                              {user.first_name ? user.first_name.charAt(0) : user.username.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isSuperAdmin
                                      ? isDarkConsole
                                        ? 'bg-[#D49B41]/20 text-[#D49B41] border border-[#D49B41]/40'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isHotelAdmin
                                      ? 'bg-amber-100 text-[#8F611A] border border-[#D49B41]/30'
                                      : isStaff
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/40'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isSuperAdmin
                                    ? 'Root Administrator'
                                    : isHotelAdmin
                                    ? 'Property Owner'
                                    : isStaff
                                    ? 'Front Desk Reception'
                                    : 'Verified Traveler'}
                                </span>
                              </div>
                              <p className={`text-xs font-black truncate ${isDarkConsole ? 'text-white' : 'text-[#212529]'}`}>
                                {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                              </p>
                              <p className={`text-[10px] truncate ${isDarkConsole ? 'text-slate-400' : 'text-slate-500'}`}>
                                {user.email || user.username}
                              </p>
                            </div>
                          </div>
                          {(isStaff || isHotelAdmin) && user.hotel_name && (
                            <div
                              className={`mt-2 pt-2 border-t flex items-center gap-1.5 text-[11px] font-bold ${
                                isDarkConsole ? 'border-[#2A2E33] text-amber-300' : 'border-[#E8E2D8] text-[#1E3A2B]'
                              }`}
                            >
                              <span>🏨</span>
                              <span className="truncate">{user.hotel_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Role-Specific Shortcut Items */}
                        <div className="space-y-1">
                          {/* 1. FRONT DESK STAFF SHORTCUTS */}
                          {isStaff && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Operational Shortcuts
                              </div>

                              {/* Walk-in Fast Pass */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'walkin');
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-emerald-50 transition-colors text-left group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                                    <PlusCircle className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-emerald-950">+ Direct Walk-in Check-in</p>
                                    <p className="text-[10px] text-emerald-700/80">Fast reservation modal</p>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded">
                                  Action
                                </span>
                              </button>

                              {/* Room Status Board Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'rooms');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
                                  <Bed className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Room Status Board</p>
                                  <p className="text-[10px] text-slate-500">Live cleanliness & occupied status</p>
                                </div>
                              </button>

                              {/* Guest Service Requests Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'requests');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
                                  <BellRing className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Guest Service Requests</p>
                                  <p className="text-[10px] text-slate-500">Housekeeping & amenities queue</p>
                                </div>
                              </button>

                              {/* Operational Tools & Preview */}
                              <div className="px-2 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-[#E8E2D8] mt-1">
                                Operational Tools & Preview
                              </div>

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'checkin');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-bold text-slate-700"
                              >
                                <QrCode className="w-4 h-4 text-[#1E3A2B]" />
                                <span>Front Desk QR Terminal</span>
                              </button>

                              {user.hotel_slug && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onNavigate('inn_detail', user.hotel_slug);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                                >
                                  <ExternalLink className="w-4 h-4 text-[#D49B41]" />
                                  <span>Preview Public Hotel Page</span>
                                </button>
                              )}

                              {onOpenSupport && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onOpenSupport();
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-600"
                                >
                                  <HelpCircle className="w-4 h-4 text-slate-400" />
                                  <span>Front Desk Help & SOP</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* 2. HOTEL OWNER / ADMIN SHORTCUTS */}
                          {isHotelAdmin && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Property Management
                              </div>

                              {/* Room Categories & Rates Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'inventory_manage');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
                                  <Bed className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Room Categories & Rates</p>
                                  <p className="text-[10px] text-slate-500">Photos, nightly rates & capacity</p>
                                </div>
                              </button>

                              {/* Staff Team & Permissions Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'staff_manage');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 group-hover:scale-105 transition-transform">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Staff Team & Permissions</p>
                                  <p className="text-[10px] text-slate-500">Create & manage receptionist logins</p>
                                </div>
                              </button>

                              {/* Occupancy & Revenue Reports Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'reports');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Occupancy & Financial Reports</p>
                                  <p className="text-[10px] text-slate-500">Revenue, RevPAR & guest analytics</p>
                                </div>
                              </button>

                              {/* Property Profile & Payout Settings Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'hotel_settings');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                                  <Settings className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Property Profile & Settings</p>
                                  <p className="text-[10px] text-slate-500">Bank payouts, amenities & policies</p>
                                </div>
                              </button>

                              {/* Audit Trail & Activity Log Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('staff_dashboard', undefined, 'audit_trail');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 group-hover:scale-105 transition-transform">
                                  <History className="w-4 h-4 text-[#D49B41]" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Audit Trail & Activity Log</p>
                                  <p className="text-[10px] text-slate-500">Immutable ledger of rates, bookings & staff actions</p>
                                </div>
                              </button>

                              {/* Secondary Group */}
                              {/* Property Expansion & Listing Preview */}
                              <div className="px-2 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-[#E8E2D8] mt-1">
                                Listing Preview & Portals
                              </div>

                              {user.hotel_slug && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onNavigate('inn_detail', user.hotel_slug);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                                >
                                  <ExternalLink className="w-4 h-4 text-[#D49B41]" />
                                  <span>View Live Public Listing</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('partner_register');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                              >
                                <Building className="w-4 h-4 text-[#D49B41]" />
                                <span>+ Register Another Property</span>
                              </button>

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('guest_bookings');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                              >
                                <CalendarCheck className="w-4 h-4 text-slate-500" />
                                <span>My Personal Bookings</span>
                              </button>

                              {onOpenSupport && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onOpenSupport();
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-600"
                                >
                                  <HelpCircle className="w-4 h-4 text-slate-400" />
                                  <span>Owner Dedicated Support</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* 3. PLATFORM SUPER ADMIN SHORTCUTS */}
                          {isSuperAdmin && (
                            <>
                              <div
                                className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                                  isDarkConsole ? 'text-slate-400' : 'text-slate-400'
                                }`}
                              >
                                Platform Governance
                              </div>

                              {/* Pending Approvals Filter Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('platform_admin', undefined, 'pending');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left group ${
                                  isDarkConsole ? 'hover:bg-white/5' : 'hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className={`font-bold ${isDarkConsole ? 'text-amber-300' : 'text-amber-900'}`}>
                                      Pending Hotel Approvals
                                    </p>
                                    <p className={`text-[10px] ${isDarkConsole ? 'text-slate-400' : 'text-slate-500'}`}>
                                      Review partner applications
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                    isDarkConsole
                                      ? 'bg-amber-500/30 text-amber-200 border-amber-500/30'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  Filter
                                </span>
                              </button>

                              {/* Live Approved Lodgings Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('platform_admin', undefined, 'approved');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left group ${
                                  isDarkConsole ? 'hover:bg-white/5' : 'hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className={`font-bold ${isDarkConsole ? 'text-emerald-300' : 'text-emerald-900'}`}>
                                      Live Approved Lodgings
                                    </p>
                                    <p className={`text-[10px] ${isDarkConsole ? 'text-slate-400' : 'text-slate-500'}`}>
                                      Active marketplace properties
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                    isDarkConsole
                                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/30'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  Filter
                                </span>
                              </button>

                              {/* Platform Metrics Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('platform_admin', undefined, 'all');
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors text-left group ${
                                  isDarkConsole ? 'hover:bg-white/5' : 'hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-[#D49B41]/20 flex items-center justify-center text-[#D49B41] group-hover:scale-105 transition-transform">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className={`font-bold ${isDarkConsole ? 'text-slate-200' : 'text-slate-900'}`}>
                                    Platform Metrics & GMV
                                  </p>
                                  <p className={`text-[10px] ${isDarkConsole ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Global system overview
                                  </p>
                                </div>
                              </button>

                              {/* Platform Audit Trail Deep-link */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('platform_admin', undefined, 'audit_trail');
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors text-left group ${
                                  isDarkConsole ? 'hover:bg-white/5' : 'hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-[#1E3A2B]/10 flex items-center justify-center text-[#1E3A2B] group-hover:scale-105 transition-transform">
                                  <History className="w-4 h-4 text-[#D49B41]" />
                                </div>
                                <div>
                                  <p className={`font-bold ${isDarkConsole ? 'text-slate-200' : 'text-slate-900'}`}>
                                    Platform Audit Trail & Security
                                  </p>
                                  <p className={`text-[10px] ${isDarkConsole ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Global multi-hotel activity, security & event logs
                                  </p>
                                </div>
                              </button>

                              {/* Secondary Group */}
                              <div
                                className={`px-2 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider border-t mt-1 ${
                                  isDarkConsole ? 'border-[#2A2E33] text-slate-500' : 'border-[#E8E2D8] text-slate-400'
                                }`}
                              >
                                Directory & Tools
                              </div>

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('marketplace');
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left font-medium ${
                                  isDarkConsole
                                    ? 'hover:bg-white/5 text-slate-300'
                                    : 'hover:bg-[#FAF8F5] text-slate-700'
                                }`}
                              >
                                <Compass className="w-4 h-4 text-slate-400" />
                                <span>Public Guest Directory</span>
                              </button>

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('partner_register');
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left font-medium ${
                                  isDarkConsole
                                    ? 'hover:bg-white/5 text-slate-300'
                                    : 'hover:bg-[#FAF8F5] text-slate-700'
                                }`}
                              >
                                <Building className="w-4 h-4 text-slate-400" />
                                <span>Partner Onboarding Form</span>
                              </button>
                            </>
                          )}

                          {/* 4. GUEST / PUBLIC SHORTCUTS */}
                          {isGuestOrPublic && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Trips & Reservations
                              </div>

                              {/* Digital Passes & Reservations */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('guest_bookings');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-amber-50/60 transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-100/70 flex items-center justify-center text-[#8F611A] group-hover:scale-105 transition-transform">
                                  <Ticket className="w-4 h-4 text-[#D49B41]" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">My Bookings & Digital Passes</p>
                                  <p className="text-[10px] text-slate-500">View check-in codes & vouchers</p>
                                </div>
                              </button>

                              {/* Explore Stays */}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('marketplace');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                                  <Compass className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#212529]">Explore Stays</p>
                                  <p className="text-[10px] text-slate-500">Discover boutique inns & villas</p>
                                </div>
                              </button>

                              {/* Support & Host Group */}
                              <div className="px-2 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-[#E8E2D8] mt-1">
                                Hosting & Support
                              </div>

                              {onOpenSupport && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onOpenSupport();
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                                >
                                  <HelpCircle className="w-4 h-4 text-blue-600" />
                                  <span>Help Center & Support</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  onNavigate('partner_register');
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#FAF8F5] transition-colors text-left font-medium text-slate-700"
                              >
                                <Building className="w-4 h-4 text-[#D49B41]" />
                                <span>List Your Property (Become a Host)</span>
                              </button>
                            </>
                          )}

                          {/* Sign Out Action */}
                          <div
                            className={`pt-1.5 mt-1 border-t ${
                              isDarkConsole ? 'border-[#2A2E33]' : 'border-[#E8E2D8]'
                            }`}
                          >
                            <button
                              onClick={handleSignOut}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left ${
                                isDarkConsole
                                  ? 'text-rose-400 hover:bg-rose-950/40'
                                  : 'text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>{isStaff ? 'Sign out & End Shift' : 'Sign out'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="hidden sm:inline-flex border border-[#212529]/30 hover:border-[#1E3A2B] text-[#212529] hover:text-[#1E3A2B] hover:bg-black/5 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-xl sm:rounded-full transition-all active:scale-95 shadow-sm shrink-0"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Native iOS Edge-to-Edge Bottom Navigation Dock (Apple & Airbnb UX Standard) */}
      <nav
        ref={mobileDockRef}
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-2xl text-slate-600 rounded-none pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] px-3 shadow-[0_-8px_24px_rgba(33,37,41,0.08)] border-t border-[#E8E2D8] flex items-center justify-around transition-all duration-300 ease-out ${
          isNavHiddenOnMobile
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* STAFF MOBILE DOCK */}
        {isStaff && (
          <>
            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'pending')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending')
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <Clock className={`w-5 h-5 ${currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Arrivals</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'checkin')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && currentSubTab === 'checkin'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <QrCode className={`w-5 h-5 ${currentTab === 'staff_dashboard' && currentSubTab === 'checkin' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>QR Scan</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'walkin')}
              className="flex flex-col items-center -mt-3.5 group active:scale-95 transition-transform"
              title="Fast Walk-in Registration"
            >
              <div className="w-12 h-12 rounded-full bg-[#1E3A2B] border-2 border-[#D49B41] shadow-lg shadow-[#1E3A2B]/30 flex items-center justify-center text-white group-hover:bg-[#3B5E43] transition-colors">
                <PlusCircle className="w-6 h-6 text-[#D49B41]" />
              </div>
              <span className="text-[10px] font-black text-[#1E3A2B] mt-0.5">+ Walk-in</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'rooms')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && currentSubTab === 'rooms'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <Bed className={`w-5 h-5 ${currentTab === 'staff_dashboard' && currentSubTab === 'rooms' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Rooms</span>
            </button>

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
            >
              <UserIcon className="w-5 h-5 text-slate-500" />
              <span>{user?.first_name || 'Staff'}</span>
            </button>
          </>
        )}

        {/* HOTEL OWNER / ADMIN MOBILE DOCK */}
        {isHotelAdmin && (
          <>
            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'pending')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending' || currentSubTab === 'rooms' || currentSubTab === 'checkin' || currentSubTab === 'requests')
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <Building2 className={`w-5 h-5 ${currentTab === 'staff_dashboard' && (!currentSubTab || currentSubTab === 'pending' || currentSubTab === 'rooms' || currentSubTab === 'checkin' || currentSubTab === 'requests') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Operations</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'inventory_manage')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && currentSubTab === 'inventory_manage'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <Layers className={`w-5 h-5 ${currentTab === 'staff_dashboard' && currentSubTab === 'inventory_manage' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'reports')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && currentSubTab === 'reports'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${currentTab === 'staff_dashboard' && currentSubTab === 'reports' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => onNavigate('staff_dashboard', undefined, 'audit_trail')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'staff_dashboard' && currentSubTab === 'audit_trail'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <History className={`w-5 h-5 ${currentTab === 'staff_dashboard' && currentSubTab === 'audit_trail' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
            >
              <UserIcon className="w-5 h-5 text-slate-500" />
              <span>{user?.first_name || 'Owner'}</span>
            </button>
          </>
        )}

        {/* SUPER ADMIN MOBILE DOCK */}
        {isSuperAdmin && (
          <>
            <button
              onClick={() => onNavigate('platform_admin', undefined, 'verifications')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'platform_admin' && (!currentSubTab || currentSubTab === 'verifications' || currentSubTab === 'pending' || currentSubTab === 'approved')
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <ShieldCheck className={`w-5 h-5 ${currentTab === 'platform_admin' && (!currentSubTab || currentSubTab === 'verifications' || currentSubTab === 'pending' || currentSubTab === 'approved') ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Approvals</span>
            </button>

            <button
              onClick={() => onNavigate('platform_admin', undefined, 'audit_trail')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'platform_admin' && currentSubTab === 'audit_trail'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <History className={`w-5 h-5 ${currentTab === 'platform_admin' && currentSubTab === 'audit_trail' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => onNavigate('platform_admin', undefined, 'all')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'platform_admin' && currentSubTab === 'all'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${currentTab === 'platform_admin' && currentSubTab === 'all' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Metrics</span>
            </button>

            <button
              onClick={() => onNavigate('marketplace')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                currentTab === 'marketplace'
                  ? 'text-[#1E3A2B] bg-[#1E3A2B]/10 font-extrabold'
                  : 'text-slate-600 hover:text-[#1E3A2B]'
              }`}
            >
              <Compass className={`w-5 h-5 ${currentTab === 'marketplace' ? 'text-[#D49B41]' : 'text-slate-500'}`} />
              <span>Directory</span>
            </button>

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold text-slate-600 hover:text-[#1E3A2B] transition-all"
            >
              <UserIcon className="w-5 h-5 text-slate-500" />
              <span>Admin</span>
            </button>
          </>
        )}

        {/* GUEST / PUBLIC MOBILE DOCK */}
        {isGuestOrPublic && (
          <>
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
          </>
        )}
      </nav>

      {/* Mobile Action Sheet / Profile Bottom Drawer (iOS & Airbnb Gold-Standard UX) */}
      {showUserMenu && user && (
        <div className="sm:hidden fixed inset-0 z-[100] flex flex-col justify-end pointer-events-auto">
          {/* Dimmed Backdrop with tap-to-dismiss */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowUserMenu(false)}
            aria-hidden="true"
          />

          {/* Sliding Bottom Drawer Container */}
          <div
            ref={mobileSheetRef}
            className={`relative z-10 w-full rounded-t-[28px] border-t max-h-[82vh] flex flex-col shadow-[0_-16px_40px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom duration-250 ease-out ${
              isDarkConsole
                ? 'bg-[#181B1F] border-[#2E3339] text-slate-100'
                : 'bg-[#FAF8F5] border-[#E8E2D8] text-[#212529]'
            }`}
          >
            {/* Grab Handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Profile Header Card */}
            <div className="px-4 py-2.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full text-white text-xs font-black flex items-center justify-center uppercase shrink-0 shadow-sm ${
                    isSuperAdmin
                      ? 'bg-[#D49B41] text-[#212529]'
                      : isHotelAdmin
                      ? 'bg-[#8F611A]'
                      : isStaff
                      ? 'bg-[#1E3A2B]'
                      : 'bg-[#212529]'
                  }`}
                >
                  {user.first_name ? user.first_name.charAt(0) : user.username.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black truncate">
                      {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                    </p>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        isSuperAdmin
                          ? 'bg-[#D49B41]/20 text-[#D49B41] border border-[#D49B41]/40'
                          : isHotelAdmin
                          ? 'bg-amber-100 text-[#8F611A]'
                          : isStaff
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isSuperAdmin
                        ? 'Superadmin'
                        : isHotelAdmin
                        ? 'Owner'
                        : isStaff
                        ? 'Reception'
                        : 'Guest'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {(isStaff || isHotelAdmin) && user.hotel_name
                      ? `🏨 ${user.hotel_name}`
                      : user.email || user.username}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUserMenu(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 flex items-center justify-center text-slate-500 shrink-0 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Action Items List */}
            <div className="px-3 py-2 overflow-y-auto max-h-[calc(82vh-150px)] space-y-1">
              {/* STAFF ROLE */}
              {isStaff && (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Operational Shortcuts
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'walkin');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 active:bg-emerald-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <span className="text-emerald-950 font-bold">+ Direct Walk-in Check-in</span>
                    </div>
                    <span className="text-[9px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded">
                      Action
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'rooms');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Bed className="w-4 h-4" />
                    </div>
                    <span>Room Status Board</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'requests');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <span>Guest Service Requests</span>
                  </button>

                  <div className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-black/5 dark:border-white/10 mt-1">
                    Front Desk Tools
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'checkin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span>QR Code Check-in Terminal</span>
                  </button>

                  {user.hotel_slug && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('inn_detail', user.hotel_slug);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                    >
                      <ExternalLink className="w-4 h-4 text-[#D49B41]" />
                      <span>Preview Hotel Public Page</span>
                    </button>
                  )}

                  {onOpenSupport && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSupport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Front Desk Help & SOP</span>
                    </button>
                  )}
                </>
              )}

              {/* HOTEL OWNER / ADMIN ROLE */}
              {isHotelAdmin && (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Property Management
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'inventory_manage');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Bed className="w-4 h-4" />
                    </div>
                    <span>Room Categories & Rates</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'staff_manage');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>Staff Team & Permissions</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'reports');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span>Occupancy & Financial Reports</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'hotel_settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span>Property Profile & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('staff_dashboard', undefined, 'audit_trail');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <History className="w-4 h-4 text-[#D49B41]" />
                    </div>
                    <span>Audit Trail & Activity Log</span>
                  </button>

                  <div className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-black/5 dark:border-white/10 mt-1">
                    Listing Preview & Portals
                  </div>

                  {user.hotel_slug && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('inn_detail', user.hotel_slug);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                    >
                      <ExternalLink className="w-4 h-4 text-[#D49B41]" />
                      <span>View Live Public Listing</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('partner_register');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-black/5 transition-colors text-left"
                  >
                    <Building className="w-4 h-4 text-[#D49B41]" />
                    <span>+ Register Another Property</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('guest_bookings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-black/5 transition-colors text-left"
                  >
                    <CalendarCheck className="w-4 h-4 text-slate-500" />
                    <span>My Personal Bookings</span>
                  </button>

                  {onOpenSupport && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSupport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Owner Dedicated Support</span>
                    </button>
                  )}
                </>
              )}

              {/* SUPER ADMIN ROLE */}
              {isSuperAdmin && (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Platform Governance
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('platform_admin', undefined, 'pending');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span>Pending Hotel Approvals</span>
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Filter
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('platform_admin', undefined, 'approved');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span>Live Approved Lodgings</span>
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Filter
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('platform_admin', undefined, 'all');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#D49B41]/20 text-[#D49B41] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span>Platform Metrics & GMV</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('platform_admin', undefined, 'audit_trail');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#1E3A2B]/15 text-[#1E3A2B] flex items-center justify-center">
                      <History className="w-4 h-4 text-[#D49B41]" />
                    </div>
                    <span>Platform Audit Trail & Security Logs</span>
                  </button>

                  <div className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-black/5 dark:border-white/10 mt-1">
                    Directory & Tools
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('marketplace');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors text-left"
                  >
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span>Public Guest Directory</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('partner_register');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors text-left"
                  >
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>Partner Onboarding Form</span>
                  </button>
                </>
              )}

              {/* GUEST / PUBLIC ROLE */}
              {isGuestOrPublic && (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Trips & Reservations
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('guest_bookings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50/70 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-[#8F611A] flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-[#D49B41]" />
                    </div>
                    <span>My Bookings & Digital Passes</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('marketplace');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <span>Explore Stays Directory</span>
                  </button>

                  <div className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-black/5 mt-1">
                    Hosting & Support
                  </div>

                  {onOpenSupport && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSupport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Help Center & Support</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('partner_register');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-black/5 transition-colors text-left"
                  >
                    <Building className="w-4 h-4 text-[#D49B41]" />
                    <span>List Your Property (Become a Host)</span>
                  </button>
                </>
              )}
            </div>

            {/* Bottom Sign Out Button */}
            <div className="px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] border-t border-black/5 dark:border-white/10 mt-auto">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-extrabold text-xs border border-red-200 dark:border-red-900/50 transition-colors active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out & End Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
