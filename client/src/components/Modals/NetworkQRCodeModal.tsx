// client/src/components/Modals/NetworkQRCodeModal.tsx
import React, { useState } from 'react';
import { NetworkInfo } from '../../types';
import { QrCode, X, Copy, Check, Wifi, Smartphone } from 'lucide-react';

interface NetworkQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo | null;
}

export const NetworkQRCodeModal: React.FC<NetworkQRCodeModalProps> = ({
  isOpen,
  onClose,
  networkInfo
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const clientUrl = networkInfo?.client_url || `http://${window.location.hostname}:5173`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200/80 space-y-4 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-left">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Phone Live Connect</h2>
              <p className="text-[11px] text-slate-500">Scan to open on your phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Graphic */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          {networkInfo?.qr_code ? (
            <img
              src={networkInfo.qr_code}
              alt="Scan to open Bus Tracker on phone"
              className="w-48 h-48 rounded-xl shadow-sm bg-white p-2"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
              Generating QR Code...
            </div>
          )}
          <span className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            Point phone camera to open app
          </span>
        </div>

        {/* Local Wi-Fi note */}
        <div className="text-xs text-slate-600 bg-blue-50/70 p-3 rounded-2xl border border-blue-100 text-left space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <Wifi className="w-4 h-4 text-blue-600" />
            <span>Wi-Fi Network Requirement</span>
          </div>
          <p className="text-[11px] text-blue-800">
            Make sure your phone is connected to the same Wi-Fi network or hotspot as your computer.
          </p>
        </div>

        {/* Direct Link & Copy */}
        <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <span className="font-mono text-slate-700 truncate max-w-[200px]">{clientUrl}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 font-bold rounded-lg border border-slate-300 shadow-xs active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
