// client/src/components/Admin/AdminDashboard.tsx
import React, { useState } from 'react';
import { Bus, BusRoute, RouteStop, Trip, PassengerActivity, StudentProfile, Driver, NetworkInfo } from '../../types';
import { api } from '../../services/api';
import { BusMap } from '../Map/BusMap';
import { 
  ShieldCheck, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Users, 
  Radio, 
  Bell, 
  QrCode, 
  Check, 
  X,
  Compass,
  Bus as BusIcon,
  Clock,
  Sparkles
} from 'lucide-react';

interface AdminDashboardProps {
  bus: Bus | null;
  route: BusRoute | null;
  stops: RouteStop[];
  activity: PassengerActivity | null;
  students: StudentProfile[];
  drivers: Driver[];
  networkInfo: NetworkInfo | null;
  onRefreshData: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bus,
  route,
  stops,
  activity,
  students,
  drivers,
  networkInfo,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'stops' | 'fleet' | 'students' | 'broadcast'>('stops');

  // Stoppage management state
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [mapClickMode, setMapClickMode] = useState(false);

  // Form states for adding/editing stoppage
  const [stopName, setStopName] = useState('');
  const [stopDesc, setStopDesc] = useState('');
  const [stopLat, setStopLat] = useState<number>(28.5300);
  const [stopLng, setStopLng] = useState<number>(77.2500);
  const [stopTime, setStopTime] = useState('08:00 AM');
  const [isSaving, setIsSaving] = useState(false);

  // Broadcast state
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'INFO' | 'DELAYED'>('INFO');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Start adding a stop
  const handleOpenAddStop = () => {
    setIsAddingStop(true);
    setEditingStopId(null);
    setStopName(`Stop 0${stops.length + 1} (Placeholder)`);
    setStopDesc('Enter stop details');
    setStopLat(stops.length > 0 ? stops[stops.length - 1].latitude + 0.01 : 28.5204);
    setStopLng(stops.length > 0 ? stops[stops.length - 1].longitude + 0.05 : 77.2014);
    setStopTime('08:15 AM');
    setMapClickMode(true);
  };

  // Start editing a stop
  const handleOpenEditStop = (stop: RouteStop) => {
    setEditingStopId(stop.id);
    setIsAddingStop(false);
    setStopName(stop.name);
    setStopDesc(stop.description || '');
    setStopLat(stop.latitude);
    setStopLng(stop.longitude);
    setStopTime(stop.scheduled_time);
    setMapClickMode(true);
  };

  const handleCancelStopForm = () => {
    setIsAddingStop(false);
    setEditingStopId(null);
    setMapClickMode(false);
  };

  // Save Add/Edit Stoppage
  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route) return;
    setIsSaving(true);
    try {
      if (isAddingStop) {
        await api.addStop(route.id, {
          name: stopName,
          description: stopDesc,
          latitude: Number(stopLat),
          longitude: Number(stopLng),
          scheduled_time: stopTime,
          is_terminal: false
        });
      } else if (editingStopId) {
        await api.updateStop(editingStopId, {
          name: stopName,
          description: stopDesc,
          latitude: Number(stopLat),
          longitude: Number(stopLng),
          scheduled_time: stopTime
        });
      }
      handleCancelStopForm();
      await onRefreshData();
    } catch (err: any) {
      alert('Error saving stop: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete stoppage
  const handleDeleteStop = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from Route 01?`)) return;
    try {
      await api.deleteStop(id);
      await onRefreshData();
    } catch (err: any) {
      alert('Error deleting stop: ' + err.message);
    }
  };

  // Reorder stoppages (Move up / Move down)
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    if (!route) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const newOrder = [...stops];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const orderedIds = newOrder.map(s => s.id);
    try {
      await api.reorderStops(route.id, orderedIds);
      await onRefreshData();
    } catch (err: any) {
      alert('Failed to reorder stops: ' + err.message);
    }
  };

  // Map click coordinate picker
  const handleMapCoordSelected = (lat: number, lng: number) => {
    if (mapClickMode) {
      setStopLat(lat);
      setStopLng(lng);
    }
  };

  // Broadcast Alert
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle || !alertMessage) return;
    try {
      await api.broadcastNotification(alertTitle, alertMessage, alertType);
      setBroadcastSent(true);
      setAlertTitle('');
      setAlertMessage('');
      setTimeout(() => setBroadcastSent(false), 3000);
      await onRefreshData();
    } catch (err: any) {
      alert('Failed to broadcast alert: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-y-auto bg-slate-100 text-slate-900 pb-28 max-w-md mx-auto w-full">
      {/* Admin Top Header */}
      <div className="bg-slate-900 text-white px-4 py-3 pt-safe sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">Admin Console</h1>
              <p className="text-[11px] text-slate-400">Route & Fleet Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded-full">
              Full Privileges
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-800 text-xs overflow-x-auto">
          {[
            { id: 'stops', label: 'Route Stoppages', icon: MapPin },
            { id: 'fleet', label: 'Fleet & Map', icon: BusIcon },
            { id: 'students', label: 'Students & Check-ins', icon: Users },
            { id: 'broadcast', label: 'Broadcast Alert', icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3.5 max-w-2xl mx-auto w-full space-y-4">
        {/* TAB 1: ROUTE & STOPPAGES MANAGEMENT */}
        {activeTab === 'stops' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Active Route
                </span>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                  {route?.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stops.length} stoppages configured • {route?.distance_km} km
                </p>
              </div>

              {!isAddingStop && !editingStopId && (
                <button
                  onClick={handleOpenAddStop}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stop</span>
                </button>
              )}
            </div>

            {/* Interactive Map preview with click coordinates */}
            <div className="h-[260px] w-full rounded-2xl overflow-hidden shadow-sm">
              <BusMap
                bus={bus}
                route={route}
                stops={stops}
                adminClickMode={mapClickMode}
                onMapClickCoord={handleMapCoordSelected}
              />
            </div>

            {/* ADD OR EDIT STOPPAGE FORM */}
            {(isAddingStop || editingStopId) && (
              <form onSubmit={handleSaveStop} className="bg-white rounded-2xl p-4 shadow-md border-2 border-indigo-500 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    <span>{isAddingStop ? 'Add New Route Stoppage' : 'Edit Stoppage Details'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancelStopForm}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Stoppage Name (Editable Placeholder or Verified Name):
                    </label>
                    <input
                      type="text"
                      required
                      value={stopName}
                      onChange={(e) => setStopName(e.target.value)}
                      placeholder="e.g. Stop 02 (Placeholder) or Saket Metro"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Landmark / Description:
                    </label>
                    <input
                      type="text"
                      value={stopDesc}
                      onChange={(e) => setStopDesc(e.target.value)}
                      placeholder="e.g. Near Metro Gate 2 / Expressway bus shelter"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Latitude (click map to set):
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={stopLat}
                        onChange={(e) => setStopLat(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Longitude:
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={stopLng}
                        onChange={(e) => setStopLng(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Scheduled Arrival Time:
                    </label>
                    <input
                      type="text"
                      required
                      value={stopTime}
                      onChange={(e) => setStopTime(e.target.value)}
                      placeholder="e.g. 08:15 AM"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow transition-all"
                  >
                    {isSaving ? 'Calculating Route Geometry...' : (isAddingStop ? 'Save New Stoppage' : 'Update Stoppage')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelStopForm}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* STOPPAGES SEQUENCE LIST WITH REORDER & EDIT CONTROLS */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Stoppage Sequence ({stops.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Use arrows to reorder
                </span>
              </div>

              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors"
                  >
                    {/* Left: Sequence badge & Stop details */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {stop.sequence_order}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {stop.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{stop.scheduled_time}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">
                            {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Reorder & Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveStop(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStop(index, 'down')}
                        disabled={index === stops.length - 1}
                        title="Move Down"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditStop(stop)}
                        title="Edit Stop"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 flex items-center justify-center border border-slate-200 ml-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStop(stop.id, stop.name)}
                        disabled={stops.length <= 2}
                        title="Delete Stop"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 text-red-600 flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLEET & LIVE MAP */}
        {activeTab === 'fleet' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Assigned Bus Fleet</h3>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{bus?.number}</span>
                    <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                      {bus?.plate_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Driver: {drivers[0]?.name || 'Rajesh Kumar'} ({drivers[0]?.phone})
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                  bus?.status === 'MOVING' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {bus?.status || 'IDLE'}
                </span>
              </div>
            </div>

            <div className="h-[340px] rounded-2xl overflow-hidden shadow-sm">
              <BusMap bus={bus} route={route} stops={stops} />
            </div>
          </div>
        )}

        {/* TAB 3: STUDENTS & BOARDING CHECK-INS */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Passenger counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">TRACKING NOW</span>
                <span className="text-xl font-black text-blue-600">{activity?.active_trackers || 0}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">WAITING AT STOP</span>
                <span className="text-xl font-black text-amber-600">{activity?.waiting_count || 0}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">BOARDED (ON BUS)</span>
                <span className="text-xl font-black text-emerald-600">{activity?.boarded_count || 0}</span>
              </div>
            </div>

            {/* Students list */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Registered College Students ({students.length})
              </h3>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {students.map((stu) => {
                  const stop = stops.find(s => s.id === stu.preferred_stop_id);
                  return (
                    <div
                      key={stu.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{stu.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {stu.roll_no} • Stop: {stop ? stop.name : 'Not set'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {stu.is_boarded ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ Boarded
                          </span>
                        ) : stu.is_waiting ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Waiting
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BROADCAST ALERT */}
        {activeTab === 'broadcast' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Broadcast Alert to Students</h3>
              <p className="text-xs text-slate-500">
                Instantly push a live notification to all students tracking Route 01.
              </p>
            </div>

            {broadcastSent && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Alert broadcasted successfully to all devices!</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alert Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bus Delay Notice / Weather Alert"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Bus 01 is currently held up at Mahamaya flyover due to heavy traffic. Estimated delay is 15 minutes."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow transition-all"
              >
                Send Broadcast Notification
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
