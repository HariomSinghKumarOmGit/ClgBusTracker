// client/src/components/Modals/NotificationCenter.tsx
import React from 'react';
import { AppNotification } from '../../types';
import { Bell, X, CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onRequestPermission: () => Promise<void>;
  permissionState: NotificationPermission;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onRequestPermission,
  permissionState
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200/80 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Notifications</h2>
              <p className="text-[11px] text-slate-500">Live alerts & bus arrival notices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser Push Permission Banner */}
        {permissionState !== 'granted' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-900">
            <div>
              <span className="font-bold block">Enable Push Alerts</span>
              <span className="text-[11px] text-blue-700">Get alerted when bus nears your stop</span>
            </div>
            <button
              onClick={onRequestPermission}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] shadow-sm shrink-0 ml-2"
            >
              Allow Alerts
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => {
              const isTripStarted = n.type === 'TRIP_STARTED';
              const isDelay = n.type === 'DELAYED';
              const isArrived = n.type === 'ARRIVED_AT_STOP' || n.type === 'APPROACHING_STOP';

              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                    isTripStarted
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : isDelay
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : isArrived
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {isTripStarted && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                      {isDelay && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      {isArrived && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{n.title}</span>
                    </span>
                    <span className="text-[10px] font-normal opacity-60">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">{n.message}</p>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
