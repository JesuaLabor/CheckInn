import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useBookingDraftStore } from './stores/bookingDraftStore';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { SupportModal } from './components/SupportModal';
import { BookingModal } from './components/BookingModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Marketplace } from './routes/Marketplace';
import { InnDetail } from './routes/InnDetail';
import { GuestPortal } from './routes/GuestPortal';
import { StaffDashboard } from './routes/StaffDashboard';
import { PartnerRegister } from './routes/PartnerRegister';
import { PlatformAdmin } from './routes/PlatformAdmin';

export function App() {
  const { user, loadUser } = useAuthStore();
  const { draft, openBookingModal } = useBookingDraftStore();

  const [currentTab, setCurrentTab] = useState<
    'marketplace' | 'inn_detail' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin'
  >('marketplace');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const handleNavigate = (
    tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'partner_register' | 'platform_admin',
    hotelSlug?: string
  ) => {
    if (tab === 'marketplace') {
      setSelectedSlug(null);
      setCurrentTab('marketplace');
    } else if (tab === 'partner_register') {
      setCurrentTab('partner_register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'platform_admin') {
      if (!user || user.role !== 'superadmin') {
        setIsAuthOpen(true);
      } else {
        setCurrentTab('platform_admin');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (tab === 'guest_bookings') {
      if (!user) {
        setIsAuthOpen(true);
      } else {
        setCurrentTab('guest_bookings');
      }
    } else if (tab === 'staff_dashboard') {
      if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin')) {
        setIsAuthOpen(true);
      } else {
        setCurrentTab('staff_dashboard');
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
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#212529] selection:bg-[#1E3A2B] selection:text-white">
      {/* Navbar */}
      <Navbar
        currentTab={
          currentTab === 'inn_detail'
            ? 'marketplace'
            : currentTab
        }
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
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

        {currentTab === 'platform_admin' && <PlatformAdmin />}

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

        {currentTab === 'staff_dashboard' && <StaffDashboard />}
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
          <span>45-Min Soft Hold Protection</span>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          if (currentTab === 'marketplace' && draft?.hotel && draft?.roomType) {
            // Re-open booking modal if guest was drafting a booking
            openBookingModal(draft.hotel, draft.roomType, {
              checkIn: draft.checkIn,
              checkOut: draft.checkOut,
              guests: draft.guestCount,
            });
          }
        }}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onListProperty={() => {
          setIsSupportOpen(false);
          handleNavigate('partner_register');
        }}
      />

      <BookingModal
        onSuccess={handleBookingSuccess}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* PWA Install Prompt & Offline Banner */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
