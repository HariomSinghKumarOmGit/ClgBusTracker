// client/src/components/Modals/InstallPWAModal.tsx
import React from 'react';
import { Download, X, Smartphone, CheckCircle, Share, PlusSquare } from 'lucide-react';

interface InstallPWAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => Promise<void>;
  deferredPromptAvailable: boolean;
}

export const InstallPWAModal: React.FC<InstallPWAModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall,
  deferredPromptAvailable
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200/80 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Install Mobile App</h2>
              <p className="text-[11px] text-slate-500">Add to Home Screen (PWA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits list */}
        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Instant 1-tap launch from phone home screen</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Full screen experience without browser address bar</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Offline support & lightning-fast caching</span>
          </div>
        </div>

        {/* Android / Desktop Install Button */}
        {deferredPromptAvailable ? (
          <button
            onClick={onTriggerInstall}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Install BusTracker App</span>
          </button>
        ) : (
          <div className="space-y-3 pt-1">
            {/* iOS Safari Instructions */}
            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-xs text-blue-950 space-y-2">
              <span className="font-bold block flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                iPhone / Safari Users:
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-900">
                <li>Tap the <strong className="font-semibold">Share</strong> button (<Share className="w-3 h-3 inline text-blue-600" />) at the bottom.</li>
                <li>Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong> (<PlusSquare className="w-3 h-3 inline text-blue-600" />).</li>
                <li>Tap <strong className="font-semibold">Add</strong> in the top right.</li>
              </ol>
            </div>

            {/* Android Chrome Instructions */}
            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold block">Android / Chrome Users:</span>
              <p className="text-[11px] text-slate-600">
                Tap the 3 dots (⋮) in Chrome menu, then select <strong className="font-semibold text-slate-900">"Install app"</strong> or <strong className="font-semibold text-slate-900">"Add to Home screen"</strong>.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
