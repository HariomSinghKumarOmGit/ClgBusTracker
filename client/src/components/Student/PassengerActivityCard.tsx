// client/src/components/Student/PassengerActivityCard.tsx
import React, { useState } from 'react';
import { PassengerActivity, StudentProfile, RouteStop } from '../../types';
import { Users, Eye, Clock, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';

interface PassengerActivityCardProps {
  activity: PassengerActivity | null;
  student: StudentProfile | null;
  selectedStop: RouteStop | null;
  onUpdateActivity: (data: { is_waiting?: boolean; is_boarded?: boolean }) => Promise<void>;
}

export const PassengerActivityCard: React.FC<PassengerActivityCardProps> = ({
  activity,
  student,
  selectedStop,
  onUpdateActivity
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isWaiting = student?.is_waiting ?? false;
  const isBoarded = student?.is_boarded ?? false;

  const handleToggleWaiting = async () => {
    setLoadingAction('waiting');
    try {
      await onUpdateActivity({ is_waiting: !isWaiting });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBoarding = async () => {
    setLoadingAction('boarding');
    try {
      await onUpdateActivity({ is_boarded: !isBoarded, is_waiting: isBoarded });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">Live Passenger Activity</h3>
            <p className="text-[11px] text-slate-500">Real-time status for Route 01</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Sync
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Active Trackers */}
        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold mb-1">
            <Eye className="w-3 h-3 text-blue-500" />
            <span>Tracking</span>
          </div>
          <span className="text-xl font-extrabold text-slate-800">
            {activity?.active_trackers ?? 0}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">App Viewers</span>
        </div>

        {/* Waiting at Stops */}
        <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-100/80 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold mb-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Waiting</span>
          </div>
          <span className="text-xl font-extrabold text-amber-800">
            {activity?.waiting_count ?? 0}
          </span>
          <span className="text-[9px] text-amber-600/80 mt-0.5">At Stoppages</span>
        </div>

        {/* Confirmed Boarded */}
        <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100/80 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold mb-1">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            <span>On Board</span>
          </div>
          <span className="text-xl font-extrabold text-emerald-800">
            {activity?.boarded_count ?? 0}
          </span>
          <span className="text-[9px] text-emerald-600/80 mt-0.5">Confirmed</span>
        </div>
      </div>

      {/* Accuracy Disclaimer Note */}
      <div className="text-[11px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Tracking numbers show active app sessions. Occupancy is based on confirmed boardings.</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* I'm Waiting at Stop Button */}
        <button
          onClick={handleToggleWaiting}
          disabled={loadingAction !== null || isBoarded}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
            isWaiting
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
              : 'bg-white hover:bg-amber-50/50 text-slate-700 border-slate-200'
          } ${isBoarded ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-4 h-4" />
            <span>{isWaiting ? "Waiting (Tap to Cancel)" : "I'm Waiting at Stop"}</span>
          </div>
          <span className="text-[10px] font-normal opacity-80">
            {selectedStop ? selectedStop.name : 'Choose stop'}
          </span>
        </button>

        {/* I'm Boarding This Bus Button */}
        <button
          onClick={handleToggleBoarding}
          disabled={loadingAction !== null}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
            isBoarded
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
              : 'bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isBoarded ? "On Board (Tap to Exit)" : "I'm Boarding Bus"}</span>
          </div>
          <span className="text-[10px] font-normal opacity-80">
            {isBoarded ? "Checked in as Passenger" : "Confirm Attendance"}
          </span>
        </button>
      </div>
    </div>
  );
};
