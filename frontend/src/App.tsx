import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useBookingDraftStore } from './stores/bookingDraftStore';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { SupportModal } from './components/SupportModal';
import { BookingModal } from './components/BookingModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';
import { toast } from './stores/toastStore';
import { Marketplace } from './routes/Marketplace';
import { InnDetail } from './routes/InnDetail';
import { GuestPortal } from './routes/GuestPortal';
import { StaffDashboard, StaffSubTab } from './routes/StaffDashboard';
import { PartnerRegister } from './routes/PartnerRegister';
import { PlatformAdmin, PlatformStatusFilter } from './routes/PlatformAdmin';

export function App() {
  const { user, loadUser } = useAuthStore();
  const { draft, openBookingModal } = useBookingDraftStore();

  const [currentTab, setCurrentTab] = useState<
    'marketplace' | 'inn_detail' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin'
  >('marketplace');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [staffSubTab, setStaffSubTab] = useState<StaffSubTab>('pending');
  const [isStaffWalkInOpen, setIsStaffWalkInOpen] = useState(false);
  const [platformStatusFilter, setPlatformStatusFilter] = useState<PlatformStatusFilter | 'audit_trail'>('pending');
  // Incremented on every navbar deep-link so repeated clicks on the same shortcut still re-apply it
  const [deepLinkNonce, setDeepLinkNonce] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    loadUser();
    if (window.location.hash === '#login') {
      setIsAuthOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!user && (currentTab === 'staff_dashboard' || currentTab === 'platform_admin')) {
      setCurrentTab('marketplace');
      setSelectedSlug(null);
    }
  }, [user, currentTab]);

  const handleNavigate = (
    tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin' | 'inn_detail',
    hotelSlug?: string | null,
    subTab?: string
  ) => {
    if (tab === 'inn_detail' || hotelSlug) {
      if (hotelSlug) {
        setSelectedSlug(hotelSlug);
        setCurrentTab('inn_detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSelectedSlug(null);
        setCurrentTab('marketplace');
      }
      return;
    }

    if (tab === 'staff_dashboard') {
      if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin')) {
        setIsAuthOpen(true);
      } else {
        if (subTab === 'walkin') {
          setIsStaffWalkInOpen(true);
        } else {
          // No sub-tab means "dashboard home" -> reset to the default queue
          setStaffSubTab((subTab as StaffSubTab) || 'pending');
          setDeepLinkNonce((n) => n + 1);
        }
        setCurrentTab('staff_dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (tab === 'platform_admin') {
      if (!user || user.role !== 'superadmin') {
        setIsAuthOpen(true);
      } else {
        setPlatformStatusFilter((subTab as PlatformStatusFilter | 'audit_trail') || 'pending');
        setDeepLinkNonce((n) => n + 1);
        setCurrentTab('platform_admin');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (tab === 'marketplace') {
      setSelectedSlug(null);
      setCurrentTab('marketplace');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'partner_register') {
      setCurrentTab('partner_register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'guest_bookings') {
      if (!user) {
        setIsAuthOpen(true);
      } else {
        setCurrentTab('guest_bookings');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSelectHotel = (slug: string) => {
    setSelectedSlug(slug);
    setCurrentTab('inn_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingSuccess = (bookingRef: string) => {
    setCurrentTab('guest_bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#212529] selection:bg-[#1E3A2B] selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Navbar */}
      <Navbar
        currentTab={
          currentTab === 'inn_detail'
            ? 'marketplace'
            : currentTab
        }
        currentSubTab={
          currentTab === 'staff_dashboard'
            ? staffSubTab
            : currentTab === 'platform_admin'
            ? platformStatusFilter
            : undefined
        }
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Main Content Area - pb accounts for mobile bottom dock + safe-area-inset-bottom */}
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:pb-0 w-full max-w-full min-w-0">
        {currentTab === 'marketplace' && (
          <Marketplace onSelectHotel={handleSelectHotel} />
        )}

        {currentTab === 'partner_register' && (
          <PartnerRegister
            onBack={() => setCurrentTab('marketplace')}
            onSuccess={() => {
              setCurrentTab('staff_dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'platform_admin' && (
          <PlatformAdmin
            initialStatus={platformStatusFilter}
            deepLinkNonce={deepLinkNonce}
            onTabChange={(tab) => setPlatformStatusFilter(tab)}
            onNavigate={(tab, slug) => {
              if (slug) setSelectedSlug(slug);
              setCurrentTab(tab as any);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'inn_detail' && selectedSlug && (
          <InnDetail
            slug={selectedSlug}
            onBack={() => {
              setSelectedSlug(null);
              setCurrentTab('marketplace');
            }}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentTab === 'guest_bookings' && <GuestPortal />}

        {currentTab === 'staff_dashboard' && (
          <StaffDashboard
            initialSubTab={staffSubTab}
            deepLinkNonce={deepLinkNonce}
            isWalkInOpenExternal={isStaffWalkInOpen}
            onCloseWalkInExternal={() => setIsStaffWalkInOpen(false)}
            onTabChange={(tab) => setStaffSubTab(tab)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#212529] border-t border-white/10 py-10 px-4 sm:px-6 lg:px-8 mt-auto text-center text-xs text-slate-400 space-y-3">
        <div className="flex items-center justify-center gap-2 font-black text-white text-sm">
          <span className="text-[#D49B41]">LocalStay</span>
          <span className="text-white/30">•</span>
          <span>Digital Lodging & Front Desk Marketplace</span>
        </div>
        <p className="max-w-md mx-auto text-[11px] text-slate-400 leading-relaxed">
          Serving verified independent hotels, heritage lodges, and boutique retreats across the Philippines and international destinations.
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-semibold pt-1">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D49B41]"></span>
            Philippines & Global Network
          </span>
          <span className="text-white/20">•</span>
          <span>Guaranteed Reservation Protection</span>
        </div>
      </footer>

      {/* Global Modals */}
      <BookingModal
        onSuccess={handleBookingSuccess}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onListProperty={() => {
          setIsSupportOpen(false);
          handleNavigate('partner_register');
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          const { isModalOpen } = useBookingDraftStore.getState();
          const loggedInUser = useAuthStore.getState().user;
          if (!isModalOpen && draft?.hotel && draft?.roomType) {
            openBookingModal(draft.hotel, draft.roomType, {
              checkIn: draft.checkIn,
              checkOut: draft.checkOut,
              guests: draft.guestCount,
            });
          } else if (loggedInUser) {
            if (loggedInUser.role === 'superadmin') {
              setCurrentTab('platform_admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (loggedInUser.role === 'staff' || loggedInUser.role === 'admin') {
              setCurrentTab('staff_dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (loggedInUser.role === 'guest' && currentTab !== 'marketplace') {
              setCurrentTab('marketplace');
            }
          }
        }}
      />

      {/* PWA Install Prompt & Offline Banner */}
      <PWAInstallPrompt />

      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Universal Responsive Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}

export default App;
