import React, { useState } from 'react';
import { Booking } from '../types';
import {
  X,
  CheckCircle2,
  Building,
  Calendar,
  User,
  ShieldCheck,
  Copy,
  Check,
  Bed,
  Sparkles,
} from 'lucide-react';

interface QRCodeModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ booking, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking) return null;

  const qrValue = booking.qr_token || booking.booking_reference;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrValue)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 text-center animate-in zoom-in-95 duration-200">
        
        {/* Pass Top Branding */}
        <div className="bg-gradient-to-br from-[#212529] via-[#1E3A2B] to-[#3B5E43] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D49B41]/20 text-[#D49B41] text-[11px] font-extrabold border border-[#D49B41]/30 mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#D49B41]" />
            <span>Confirmed Digital Check-in Pass</span>
          </div>

          <h3 className="text-xl font-black text-white leading-tight">{booking.hotel_name}</h3>
          <p className="text-xs text-white/80 font-medium mt-0.5">{booking.room_type_name}</p>
        </div>

        {/* Boarding Pass Perforation Bar */}
        <div className="relative flex items-center justify-between px-3 -my-3 z-10">
          <div className="w-6 h-6 rounded-full bg-[#212529]/75 -ml-6"></div>
          <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2"></div>
          <div className="w-6 h-6 rounded-full bg-[#212529]/75 -mr-6"></div>
        </div>

        {/* QR Body Container */}
        <div className="p-6 pt-7 space-y-5">
          {/* QR Code Container */}
          <div className="bg-[#FAF8F5] p-4 rounded-3xl border border-slate-200/80 inline-block shadow-inner">
            <img
              src={qrUrl}
              alt="Digital Check-in QR Code"
              className="w-48 h-48 rounded-xl mx-auto mix-blend-multiply"
            />
          </div>

          {/* Reference Pill */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
              Reservation Pass Reference
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-lg font-mono font-black text-[#212529] tracking-wider">
                {booking.booking_reference}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all"
                title="Copy reference code"
              >
                {copied ? <Check className="w-4 h-4 text-[#3B5E43]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Guest and Stay Details Card */}
          <div className="bg-[#FAF8F5] rounded-2xl p-4 text-left text-xs space-y-2.5 border border-slate-200/80">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Guest:</span>
              <span className="font-bold text-[#212529]">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Check-in:</span>
              <span className="font-bold text-[#212529]">{booking.check_in}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Check-out:</span>
              <span className="font-bold text-[#212529]">{booking.check_out}</span>
            </div>
            {booking.room_number && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Assigned Room:</span>
                <span className="font-black text-[#1E3A2B] bg-[#1E3A2B]/10 px-2.5 py-0.5 rounded-md text-xs border border-[#1E3A2B]/20">
                  Room {booking.room_number}
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#3B5E43] shrink-0" />
            <span>Present this pass or reference at the front desk.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
