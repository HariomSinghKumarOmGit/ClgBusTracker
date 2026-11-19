// client/src/components/Student/StopsTimeline.tsx
import React from 'react';
import { RouteStop, Bus } from '../../types';
import { MapPin, Check, Clock, Sparkles } from 'lucide-react';

interface StopsTimelineProps {
  stops: RouteStop[];
  selectedStopId: string | null;
  onSelectPickup: (stopId: string) => void;
  bus: Bus | null;
}

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  selectedStopId,
  onSelectPickup,
  bus
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">Route Stoppages & Timings</h3>
          <p className="text-[11px] text-slate-500">Scheduled vs Live Dynamic ETA</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {stops.length} Stops
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 space-y-4 pt-1">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-[2px] bg-slate-200"></div>

        {stops.map((stop, index) => {
          const isPickup = stop.id === selectedStopId;
          const isTerminal = stop.is_terminal || index === stops.length - 1;
          const isPassed = stop.status === 'passed';
          const isCurrent = stop.status === 'current';

          return (
            <div key={stop.id} className="relative flex items-start justify-between group">
              {/* Timeline Node Dot */}
              <div 
                className={`absolute -left-6 mt-1 flex items-center justify-center w-5 h-5 rounded-full z-10 text-[10px] font-bold transition-all ${
                  isPassed
                    ? 'bg-slate-300 text-slate-600'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                    : isPickup
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-white text-slate-700 border-2 border-blue-500'
                }`}
              >
                {isPassed ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isTerminal ? (
                  '★'
                ) : (
                  stop.sequence_order
                )}
              </div>

              {/* Stop Information */}
              <div className="flex-1 pr-3 pl-1">
                <div className="flex items-center gap-1.5">
                  <h4 className={`text-xs font-bold leading-tight ${
                    isPassed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'
                  }`}>
                    {stop.name}
                  </h4>
                  {isPickup && (
                    <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded uppercase tracking-wider">
                      My Pickup
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded uppercase tracking-wider">
                      Bus Here
                    </span>
                  )}
                </div>

                {stop.description && (
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {stop.description}
                  </p>
                )}

                {/* Pickup Toggle link */}
                {!isPickup && !isPassed && (
                  <button
                    onClick={() => onSelectPickup(stop.id)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 inline-block"
                  >
                    Set as my pickup point
                  </button>
                )}
              </div>

              {/* Timings: Scheduled vs Estimated */}
              <div className="text-right shrink-0">
                {/* Estimated Time */}
                <div className="flex items-center justify-end gap-1">
                  {stop.estimated_time && !isPassed ? (
                    <>
                      <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" />
                      <span className="text-xs font-black text-blue-700">
                        {stop.estimated_time}
                      </span>
                    </>
                  ) : isPassed && stop.actual_time ? (
                    <span className="text-xs font-semibold text-slate-400">
                      Passed {stop.actual_time}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-700">
                      {stop.scheduled_time}
                    </span>
                  )}
                </div>

                {/* Scheduled Reference Time */}
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Sched: <span className="font-medium text-slate-500">{stop.scheduled_time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
