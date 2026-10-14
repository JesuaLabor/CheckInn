import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  ShieldCheck,
  QrCode,
  Clock,
  CreditCard,
  Building2,
  ChevronDown,
  PhoneCall,
  Mail,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListProperty?: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  onListProperty,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does the 45-Minute Soft Hold work?',
      a: 'When you submit a room booking request, LocalStay immediately locks the room inventory so no one else can book it. The inn’s front-desk desk team is notified instantly to review and confirm your stay. You won’t be charged upfront—your hold is guaranteed for 45 minutes while the inn prepares your arrival.',
      icon: Clock,
      badge: 'Guest Guarantee',
    },
    {
      q: 'How do I use my Instant QR Mobile Pass?',
      a: 'Once your reservation is confirmed, your digital pass is generated in "My Bookings". When you arrive at the property, simply display your QR pass from your phone. Front-desk staff scan it for instant, paperless check-in in under 30 seconds.',
      icon: QrCode,
      badge: 'Fast Check-In',
    },
    {
      q: 'What currencies and payment methods are supported?',
      a: 'LocalStay supports multi-currency browsing with real-time exchange rates (PHP, USD, JPY, EUR, SGD, AUD, GBP). Guests can settle room balances via local electronic payments (GCash, Maya), credit/debit cards, or cash directly at the front desk.',
      icon: CreditCard,
      badge: 'Flexible Pay',
    },
    {
      q: 'How can hoteliers and inn owners list a property?',
      a: 'Independent hotels, boutique resorts, and heritage lodges across the Philippines and abroad can join LocalStay. Apply through "List Your Property" to set up your front-desk dashboard, room categories, and soft-hold rules.',
      icon: Building2,
      badge: 'For Hosts',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-[#212529]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#16271E] text-white px-6 py-6 sm:px-8 sm:py-7 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D49B41]/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-[#D49B41]">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Help & Support
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#D49B41]/20 text-[#D49B41] border border-[#D49B41]/30">
                    24/7 Concierge
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                  Answers to soft holds, instant QR passes, and property host onboarding.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Feature Highlights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#1E3A2B]/5 border border-[#1E3A2B]/10 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#3B5E43] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#1E3A2B]">45-Minute Soft Hold Guarantee</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Zero immediate charge. Rooms are held while the front desk reviews your request.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#D49B41]/10 border border-[#D49B41]/20 flex items-start gap-3">
              <QrCode className="w-5 h-5 text-[#8F611A] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#8F611A]">Fast QR Mobile Pass</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Show your mobile pass upon arrival for effortless 30-second desk check-in.
                </p>
              </div>
            </div>
          </div>

          {/* Accordion FAQ */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Frequently Asked Questions
            </h3>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const IconComponent = faq.icon;
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-[#E8E2D8] rounded-2xl bg-white overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[#FAF8F5] transition-colors"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] flex items-center justify-center text-[#1E3A2B] shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-[#212529]">
                          {faq.q}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180 text-[#1E3A2B]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#E8E2D8]/50 text-xs text-slate-600 leading-relaxed bg-[#FAF8F5]/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Property Host Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#16271E] to-[#1E3A2B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[#D49B41] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Host Onboarding</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">Want to list your hotel or inn?</h4>
              <p className="text-[11px] text-white/75 mt-0.5">
                Join our curated network across the Philippines and worldwide.
              </p>
            </div>
            {onListProperty && (
              <button
                onClick={() => {
                  onClose();
                  onListProperty();
                }}
                className="bg-[#D49B41] hover:bg-[#BF8832] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-md"
              >
                <span>List Your Property</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Contact Support Footer */}
          <div className="pt-2 border-t border-[#E8E2D8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 hover:text-[#1E3A2B]">
                <PhoneCall className="w-3.5 h-3.5 text-[#3B5E43]" />
                <span>+63 (88) 813-LOCAL</span>
              </span>
              <span className="inline-flex items-center gap-1.5 hover:text-[#1E3A2B]">
                <Mail className="w-3.5 h-3.5 text-[#3B5E43]" />
                <span>support@localstay.ph</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Response time: &lt; 5 minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
