// client/src/components/Navbar.tsx
import React from 'react';
import { UserRole } from '../types';
import { Bus, Shield, QrCode, Download, Radio } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onOpenQR: () => void;
  onOpenInstall: () => void;
  isPWAInstallable: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onChangeRole,
  onOpenQR,
  onOpenInstall,
  isPWAInstallable
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 pt-1.5 pb-safe max-w-md mx-auto select-none">
      <div className="flex items-center justify-around">
        {/* Student View Button */}
        <button
          onClick={() => onChangeRole('student')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            currentRole === 'student'
              ? 'text-blue-600 font-extrabold bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Bus className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Student Map</span>
        </button>

        {/* Driver Cockpit Button */}
        <button
          onClick={() => onChangeRole('driver')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            currentRole === 'driver'
              ? 'text-amber-500 font-extrabold bg-amber-50/80'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Radio className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Driver Cockpit</span>
        </button>

        {/* Admin Console Button */}
        <button
          onClick={() => onChangeRole('admin')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
            currentRole === 'admin'
              ? 'text-indigo-600 font-extrabold bg-indigo-50/80'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Admin Route</span>
        </button>

        {/* Phone Connect QR Code Button */}
        <button
          onClick={onOpenQR}
          title="Connect Phone via Wi-Fi QR Code"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-blue-600 font-medium transition-colors active:scale-95"
        >
          <QrCode className="w-5 h-5 mb-0.5 text-blue-600" />
          <span className="text-[10px]">Phone Sync</span>
        </button>

        {/* PWA Install Button */}
        <button
          onClick={onOpenInstall}
          title="Install App as PWA"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-emerald-600 font-medium transition-colors active:scale-95"
        >
          <Download className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span className="text-[10px]">Install PWA</span>
        </button>
      </div>
    </div>
  );
};
