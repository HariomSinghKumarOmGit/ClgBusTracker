// client/src/components/Student/StudentDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Bus, BusRoute, RouteStop, Trip, PassengerActivity, StudentProfile } from '../../types';
import { BusMap } from '../Map/BusMap';
import { PassengerActivityCard } from './PassengerActivityCard';
import { StopsTimeline } from './StopsTimeline';
import { 
  Bus as BusIcon, 
  MapPin, 
  Navigation, 
  Bell, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  Users,
  Eye,
  Clock,
  CheckCircle2,
  Phone,
  GraduationCap,
  Info
} from 'lucide-react';

interface StudentDashboardProps {
  bus: Bus | null;
  route: BusRoute | null;
  stops: RouteStop[];
  activeTrip: Trip | null;
  activity: PassengerActivity | null;
  student: StudentProfile | null;
  onUpdateActivity: (data: { is_waiting?: boolean; is_boarded?: boolean; preferred_stop_id?: string }) => Promise<void>;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  unreadCount: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  bus,
  route,
  stops,
  activeTrip,
  activity,
  student,
  onUpdateActivity,
  onOpenNotifications,
  onOpenProfile,
  unreadCount
}) => {
  // Mobile Bottom Sheet state: 'collapsed' (peek), 'expanded' (full details)
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded'>('collapsed');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedStop = stops.find(s => s.id === student?.preferred_stop_id) || stops[0] || null;

  // Compute dynamic stop status and live ETAs
  const computedStops = stops.map((stop) => {
    let status: 'passed' | 'current' | 'upcoming' = 'upcoming';

    if (activeTrip?.current_stop_id === stop.id) {
      status = 'current';
    } else if (bus && bus.status !== 'IDLE' && bus.last_known_location) {
      const currentStop = stops.find(s => s.id === activeTrip?.current_stop_id);
      if (currentStop && stop.sequence_order < currentStop.sequence_order) {
        status = 'passed';
      }
    }

    // Dynamic estimated arrival time
    let estimated_time = stop.scheduled_time;
    if (activeTrip && activeTrip.eta_to_next_stop_mins !== null) {
      const nextStop = stops.find(s => s.id === activeTrip.next_stop_id);
      if (nextStop) {
        const orderDiff = stop.sequence_order - nextStop.sequence_order;
        if (orderDiff >= 0) {
          const extraMins = orderDiff * 12; // average 12 mins between corridor stops
          const totalMins = (activeTrip.eta_to_next_stop_mins || 5) + extraMins;
          const etaDate = new Date(Date.now() + totalMins * 60000);
          estimated_time = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
    }

    return {
      ...stop,
      status,
      estimated_time: status === 'passed' ? undefined : estimated_time,
      actual_time: status === 'passed' ? stop.scheduled_time : undefined
    };
  });

  const nextStop = computedStops.find(s => s.id === activeTrip?.next_stop_id) || computedStops[1] || computedStops[0];

  const handleSelectPickup = async (stopId: string) => {
    await onUpdateActivity({ preferred_stop_id: stopId });
  };

  const isWaiting = student?.is_waiting ?? false;
  const isBoarded = student?.is_boarded ?? false;

  return (
    <div className="relative w-full h-[100dvh] max-w-md mx-auto overflow-hidden bg-slate-900 select-none">
      {/* 1. FULL-SCREEN INTERACTIVE MAP (Real Google Maps Tiles + Modern HUD) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <BusMap
          bus={bus}
          route={route}
          stops={computedStops}
          selectedStopId={student?.preferred_stop_id}
          onSelectStop={(s) => handleSelectPickup(s.id)}
          waitingPerStop={activity?.waiting_per_stop}
        />
      </div>

      {/* 2. FLOATING TOP BAR (Dynamic Island Header for Delhi Technical Campus U5) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 pt-safe pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-slate-200/90 pointer-events-auto flex items-center justify-between">
          {/* Left: DTC Branding & Campus U5 Badge */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black text-slate-900 tracking-tight truncate">
                  Delhi Technical Campus
                </h1>
                <span className="text-[10px] font-black bg-gradient-to-r from-purple-700 to-indigo-700 text-amber-300 px-1.5 py-0.2 rounded shadow-xs border border-purple-500/40">
                  U5
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  bus?.status === 'MOVING' ? 'bg-emerald-500 animate-pulse' : bus?.status === 'STOPPED' ? 'bg-amber-500' : 'bg-slate-400'
                }`}></span>
                <span className="font-bold text-slate-800">{bus?.status === 'MOVING' ? 'LIVE TRACKING' : (bus?.status || 'IDLE')}</span>
                {bus?.last_known_location && bus.last_known_location.speed_kmh > 0 && (
                  <span className="text-blue-600 font-extrabold">• {Math.round(bus.last_known_location.speed_kmh)} km/h</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenNotifications}
              className="relative w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors active:scale-95"
              title="Student Profile"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                {student?.name ? student.name.charAt(0) : 'S'}
              </div>
              <span className="max-w-[55px] truncate">{student?.name || 'Profile'}</span>
            </button>
          </div>
        </div>

        {/* Floating Quick ETA & Next Stoppage Pill */}
        <div className="mt-2 flex items-center justify-between bg-slate-950/90 text-white backdrop-blur-md rounded-xl px-3 py-1.5 shadow-md border border-slate-800 text-xs pointer-events-auto">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-medium">Next:</span>
            <span className="font-bold text-white truncate text-[11px]">
              {nextStop ? nextStop.name : 'Saket Terminal'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-extrabold shrink-0">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>
              {activeTrip?.eta_to_next_stop_mins ? `${activeTrip.eta_to_next_stop_mins} mins` : 'On Schedule'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SLIDING MOBILE BOTTOM SHEET (Google Maps / Uber Sheet) */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-30 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.22)] border-t border-slate-200 flex flex-col bottom-sheet ${
          sheetState === 'expanded' ? 'h-[75vh]' : 'h-[175px]'
        }`}
      >
        {/* Grab Handle Header */}
        <div 
          onClick={() => setSheetState(s => s === 'collapsed' ? 'expanded' : 'collapsed')}
          className="pt-2 pb-1.5 px-4 flex flex-col items-center justify-center cursor-pointer active:bg-slate-50 rounded-t-3xl border-b border-slate-100 select-none"
        >
          {/* Grab Bar */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mb-1"></div>

          <div className="w-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-900">
                {sheetState === 'expanded' ? 'Route 01 (U5) • Stoppages' : 'Live Attendance & ETA'}
              </span>
              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded border border-purple-200">
                To DTC (U5)
              </span>
            </div>

            <div className="flex items-center gap-1 text-blue-600 font-black text-[11px]">
              <span>{sheetState === 'expanded' ? 'Collapse Map' : 'View All Stops'}</span>
              {sheetState === 'expanded' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Peek Buttons (Visible in Peek Mode) */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* Quick I'm Waiting Button */}
            <button
              onClick={() => onUpdateActivity({ is_waiting: !isWaiting })}
              disabled={isBoarded}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all active:scale-95 ${
                isWaiting
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                  : 'bg-white hover:bg-amber-50/60 text-slate-700 border-slate-200'
              } ${isBoarded ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{isWaiting ? "Waiting (Cancel)" : "I'm Waiting at Stop"}</span>
              </div>
              <span className="text-[10px] font-normal opacity-80 truncate max-w-[130px]">
                {selectedStop?.name || 'Select Stop'}
              </span>
            </button>

            {/* Quick I'm Boarding Button */}
            <button
              onClick={() => onUpdateActivity({ is_boarded: !isBoarded, is_waiting: isBoarded })}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all active:scale-95 ${
                isBoarded
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white hover:bg-emerald-50/60 text-slate-700 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isBoarded ? "On Board (Exit)" : "I'm Boarding Bus"}</span>
              </div>
              <span className="text-[10px] font-normal opacity-80">
                {isBoarded ? "Confirmed Boarded" : "Check-in Attendance"}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Detailed Content (Visible when Expanded) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24 overscroll-contain">
          {/* Passenger Activity Metrics Card */}
          <PassengerActivityCard
            activity={activity}
            student={student}
            selectedStop={selectedStop}
            onUpdateActivity={onUpdateActivity}
          />

          {/* Stoppages Timeline */}
          <StopsTimeline
            stops={computedStops}
            selectedStopId={student?.preferred_stop_id || null}
            onSelectPickup={handleSelectPickup}
            bus={bus}
          />

          {/* Delhi Technical Campus (U5) Info & Helpline */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-3.5 text-xs text-purple-950 flex items-center justify-between border border-purple-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-amber-300 flex items-center justify-center font-bold shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block">Delhi Technical Campus (U5)</span>
                <span className="text-[10px] text-purple-800">28/1, Knowledge Park III, Greater Noida</span>
              </div>
            </div>
            <a
              href="tel:+919811234567"
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1 text-[11px]"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
