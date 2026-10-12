import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useBookingDraftStore } from './stores/bookingDraftStore';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Marketplace } from './routes/Marketplace';
import { InnDetail } from './routes/InnDetail';
import { GuestPortal } from './routes/GuestPortal';
import { StaffDashboard } from './routes/StaffDashboard';

export function App() {
  const { user, loadUser } = useAuthStore();
  const { draft, openBookingModal } = useBookingDraftStore();

  const [currentTab, setCurrentTab] = useState<'marketplace' | 'inn_detail' | 'guest_bookings' | 'staff_dashboard'>('marketplace');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const handleNavigate = (tab: 'marketplace' | 'guest_bookings' | 'staff_dashboard' | 'admin_reports') => {
    if (tab === 'marketplace') {
      setSelectedSlug(null);
      setCurrentTab('marketplace');
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab === 'inn_detail' ? 'marketplace' : currentTab}
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'marketplace' && (
          <Marketplace onSelectHotel={handleSelectHotel} />
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

        {currentTab === 'staff_dashboard' && <StaffDashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2 font-bold text-slate-700">
          <span>CheckInn Malaybalay City</span>
          <span>•</span>
          <span>Digital Lodging & Front Desk Marketplace</span>
        </div>
        <p className="max-w-md mx-auto text-[11px] text-slate-400">
          Serving Pine Hills Hotel, 1st Inn Malaybalay, Bukidnon Mountain View Inn, and local hospitality partners.
        </p>
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
