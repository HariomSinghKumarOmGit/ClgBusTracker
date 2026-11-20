// client/src/components/Driver/DriverDetailsView.tsx
import React, { useState, useEffect } from 'react';
import { Driver, BusScheduleRecord } from '../../types';
import { api } from '../../services/api';
import { 
  Users, 
  Phone, 
  ShieldCheck, 
  Award, 
  Clock, 
  Bus as BusIcon, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Check, 
  X, 
  Search,
  ExternalLink,
  Lock,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export const DriverDetailsView: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [schedules, setSchedules] = useState<BusScheduleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'drivers' | 'schedules'>('drivers');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Driver Modal State
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    name: '',
    phone: '',
    license_no: '',
    bus_number: 'Bus 38',
    bus_plate: 'DL 1P B 3838',
    status: 'ON_DUTY',
    shift: 'Morning Express (06:00 - 14:00)',
    blood_group: 'O+'
  });

  // Add Schedule Record Modal State (Departure & Arrival ONLY)
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<BusScheduleRecord>>({
    route_name: 'Route 38: Southbound to Glade',
    route_code: '38',
    bus_number: 'Bus 38',
    driver_name: '',
    departure_time: '08:00 AM',
    arrival_time: '08:42 AM',
    passengers_served: 40,
    terminal_notes: 'All passengers boarded and arrived safely'
  });

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedDrivers, fetchedSchedules] = await Promise.all([
        api.getDrivers(),
        api.getSchedules()
      ]);
      setDrivers(fetchedDrivers);
      setSchedules(fetchedSchedules);
      if (fetchedDrivers.length > 0 && !newSchedule.driver_name) {
        setNewSchedule(prev => ({ ...prev, driver_name: fetchedDrivers[0].name }));
      }
    } catch (err) {
      console.error('Failed to load driver/schedule data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone) return;
    try {
      const created = await api.addDriver(newDriver);
      setDrivers(prev => [created, ...prev]);
      setIsAddDriverOpen(false);
      setNewDriver({
        name: '',
        phone: '',
        license_no: '',
        bus_number: 'Bus 38',
        bus_plate: 'DL 1P B 3838',
        status: 'ON_DUTY',
        shift: 'Morning Shift',
        blood_group: 'O+'
      });
      showNotification('✅ Driver details successfully saved to Vercel backend!');
    } catch (err) {
      console.error('Failed to add driver', err);
      showNotification('Failed to save driver. Please try again.');
    }
  };

  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.departure_time || !newSchedule.arrival_time) return;
    try {
      // NOTE: Strictly no GPS coordinates submitted or accepted
      const created = await api.addSchedule(newSchedule);
      setSchedules(prev => [created, ...prev]);
      setIsAddScheduleOpen(false);
      showNotification('✅ Departure & Arrival times permanently recorded to Vercel!');
    } catch (err) {
      console.error('Failed to record schedule', err);
      showNotification('Failed to record schedule.');
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.license_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.bus_plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSchedules = schedules.filter(s =>
    s.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.bus_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-blue-600">Vercel Cloud Data</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">Driver & Shift Ledger</h1>
          </div>
          <button
            onClick={() => activeTab === 'drivers' ? setIsAddDriverOpen(true) : setIsAddScheduleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'drivers' ? 'Add Driver' : 'Log Trip Time'}</span>
          </button>
        </div>

        {/* Privacy Highlight Card */}
        <div className="mt-3 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-3.5 text-white shadow-lg border border-blue-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-blue-300" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>Zero GPS Tracking Policy</span>
                <span className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-mono uppercase">Vercel Compliant</span>
              </div>
              <p className="text-blue-200/90 mt-1 leading-relaxed text-[11px]">
                No coordinates, breadcrumb logs, or bus movement paths are stored. <strong>Only starting (departure) and arrival times</strong> are stored permanently on Vercel.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl mt-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'drivers'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Drivers ({drivers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'schedules'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Start/Arrival Times ({schedules.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'drivers' ? 'Search driver, license, plate...' : 'Search route, driver, bus...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </header>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="mb-4 bg-emerald-600 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading Vercel driver records...
        </div>
      ) : activeTab === 'drivers' ? (
        <div className="space-y-3">
          {filteredDrivers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 border border-slate-200 text-xs">
              No drivers found matching your search.
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={driver.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.name}`}
                      alt={driver.name}
                      className="w-13 h-13 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        driver.status === 'ON_DUTY'
                          ? 'bg-emerald-500'
                          : driver.status === 'ON_BREAK'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                      title={driver.status}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{driver.name}</h3>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        <Award className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{driver.rating || '4.9'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>Lic:</span>
                      <span className="font-mono text-slate-700 font-semibold">{driver.license_no}</span>
                    </div>

                    {/* Bus assignment badge */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        <BusIcon className="w-3 h-3" />
                        <span>{driver.bus_number}</span>
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {driver.bus_plate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Details Grid */}
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shift</span>
                    <span className="font-semibold text-slate-700 truncate block">{driver.shift || 'Full Day'}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Blood Group</span>
                    <span className="font-semibold text-slate-700">{driver.blood_group || 'O+'}</span>
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={`tel:${driver.phone}`}
                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver ({driver.phone})</span>
                  </a>
                  <button
                    onClick={() => {
                      const newStatus = driver.status === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
                      api.updateDriver(driver.id, { status: newStatus }).then(updated => {
                        setDrivers(prev => prev.map(d => d.id === driver.id ? updated : d));
                        showNotification(`Status updated to ${newStatus}`);
                      });
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    {driver.status === 'ON_DUTY' ? 'Set Off Duty' : 'Set On Duty'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Permanent Starting & Arrival Times Ledger */
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 border border-slate-200 text-xs">
              No trip schedule logs found.
            </div>
          ) : (
            filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                      Route {schedule.route_code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{schedule.route_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bus: <span className="font-semibold text-slate-700">{schedule.bus_number}</span> • Driver: <span className="font-semibold text-slate-700">{schedule.driver_name}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    schedule.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {schedule.status}
                  </span>
                </div>

                {/* Permanent Time Stamps Display */}
                <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>Starting Time</span>
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1 font-mono">
                        {schedule.departure_time}
                      </div>
                      <span className="text-[10px] text-slate-400">Recorded Departure</span>
                    </div>

                    <div className="pl-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>Arrival Time</span>
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1 font-mono">
                        {schedule.arrival_time}
                      </div>
                      <span className="text-[10px] text-slate-400">Terminal Arrival</span>
                    </div>
                  </div>
                </div>

                {schedule.terminal_notes && (
                  <p className="mt-2 text-[11px] text-slate-500 italic">
                    "{schedule.terminal_notes}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: Add New Driver */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Register Driver on Vercel</span>
              </h3>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDriverSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sharma"
                  value={newDriver.name || ''}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98..."
                    value={newDriver.phone || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    License No.
                  </label>
                  <input
                    type="text"
                    placeholder="DL-0420..."
                    value={newDriver.license_no || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, license_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Bus Assigned
                  </label>
                  <input
                    type="text"
                    value={newDriver.bus_number || 'Bus 38'}
                    onChange={(e) => setNewDriver({ ...newDriver, bus_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={newDriver.bus_plate || 'DL 1P B 3838'}
                    onChange={(e) => setNewDriver({ ...newDriver, bus_plate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Save to Vercel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Log Starting & Arrival Time (ONLY) */}
      {isAddScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Record Trip Times</span>
              </h3>
              <button
                onClick={() => setIsAddScheduleOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 text-amber-900 text-[11px] p-2.5 rounded-xl mt-3 flex items-start gap-2 border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Only Starting and Arrival times are recorded permanently. Zero route coordinates or GPS logs are stored.</span>
            </div>

            <form onSubmit={handleAddScheduleSubmit} className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Route Name
                </label>
                <input
                  type="text"
                  required
                  value={newSchedule.route_name || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, route_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Starting Time (Departure)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08:00 AM"
                    value={newSchedule.departure_time || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, departure_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08:42 AM"
                    value={newSchedule.arrival_time || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, arrival_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={newSchedule.driver_name || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, driver_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.bus_number})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
