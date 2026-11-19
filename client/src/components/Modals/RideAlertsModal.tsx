// client/src/components/Modals/RideAlertsModal.tsx
import React, { useState } from 'react';
import { RouteStop } from '../../types';
import { Bell, Check, X, ShieldAlert, Sparkles, Volume2, Clock } from 'lucide-react';

interface RideAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: RouteStop[];
  routeName?: string;
  routeCode?: string;
}

export const RideAlertsModal: React.FC<RideAlertsModalProps> = ({
  isOpen,
  onClose,
  stops,
  routeName = 'Route 38: Southbound to Glade',
  routeCode = '38'
}) => {
  const [alertDistance, setAlertDistance] = useState<'1_stop' | '2_stops' | '5_mins'>('1_stop');
  const [selectedStopId, setSelectedStopId] = useState<string>(stops[0]?.id || '');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSetAlert = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-up border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1d4ed8] flex items-center justify-center">
              <Bell className="w-4 h-4 fill-[#1d4ed8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">Ride Alerts</h3>
                <span className="text-[10px] font-bold bg-blue-50 text-[#1d4ed8] px-1.5 py-0.2 rounded">
                  ดักเตือน
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Route {routeCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3.5">
          {/* Target Stop */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Destination / Alert Stop
            </label>
            <select
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.sequence_order}. {stop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Condition */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Notify Me When Bus Is:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAlertDistance('1_stop')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  alertDistance === '1_stop'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1 Stop Away
              </button>
              <button
                type="button"
                onClick={() => setAlertDistance('2_stops')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  alertDistance === '2_stops'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                2 Stops Away
              </button>
              <button
                type="button"
                onClick={() => setAlertDistance('5_mins')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  alertDistance === '5_mins'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                5 Mins Away
              </button>
            </div>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Sound & Vibration Chime</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform absolute top-0.5 ${
                soundEnabled ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Action button */}
          <button
            onClick={handleSetAlert}
            disabled={isSaved}
            className="w-full py-2.5 rounded-2xl bg-[#1d4ed8] hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Alert Active! (ดักเตือนแล้ว)</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Set Ride Alert (ตั้งดักเตือน)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
