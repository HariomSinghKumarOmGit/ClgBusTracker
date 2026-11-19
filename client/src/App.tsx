// client/src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, Bus, BusRoute, RouteStop, Trip, PassengerActivity, StudentProfile, Driver, AppNotification, NetworkInfo } from './types';
import { api } from './services/api';
import { socket } from './services/socket';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/Student/StudentDashboard';
import { DriverDashboard } from './components/Driver/DriverDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { NotificationCenter } from './components/Modals/NotificationCenter';
import { InstallPWAModal } from './components/Modals/InstallPWAModal';
import { NetworkQRCodeModal } from './components/Modals/NetworkQRCodeModal';
import { StudentProfileModal } from './components/Modals/StudentProfileModal';
import { AuthModal } from './components/Modals/AuthModal';

// Web Audio API chime generator for bus alerts
function playChime(type: 'start' | 'near' | 'board') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'start') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'board') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    // Audio context may require user interaction first
  }
}

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [activeBus, setActiveBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activity, setActivity] = useState<PassengerActivity | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Student Profile state
  const [student, setStudent] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem('dtc_student_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      id: 'STU-LOCAL',
      name: 'Aarav Sharma',
      roll_no: 'DTC/2024/01',
      phone: '+91 98765 00001',
      route_id: 'ROUTE-01',
      preferred_stop_id: 'STOP-01',
      is_tracking: true,
      is_waiting: false,
      is_boarded: false
    };
  });

  // Driver Auth state
  const [driver, setDriver] = useState<Driver | null>(() => {
    const saved = localStorage.getItem('dtc_driver_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Admin Auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('dtc_admin_auth') === 'true';
  });

  // Modal visibility states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole | null>(null);

  // PWA Install deferred prompt
  const deferredPromptRef = useRef<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    try {
      const [busesData, routesData, driversData, studentsData, notifsData, netData] = await Promise.all([
        api.getBuses(),
        api.getRoutes(),
        api.getDrivers(),
        api.getStudents(),
        api.getNotifications(),
        api.getNetworkInfo().catch(() => null)
      ]);

      setBuses(busesData);
      const defaultBus = busesData[0] || null;
      setActiveBus(defaultBus);

      const defaultRoute = routesData[0] || null;
      setRoute(defaultRoute);

      if (defaultRoute) {
        const stopsData = await api.getStops(defaultRoute.id);
        setStops(stopsData);

        const activityData = await api.getPassengerActivity(defaultRoute.id);
        setActivity(activityData);
      }

      if (defaultBus) {
        const trip = await api.getActiveTrip(defaultBus.id);
        setActiveTrip(trip);
      }

      setDrivers(driversData);
      setStudents(studentsData);
      setNotifications(notifsData);
      if (netData) setNetworkInfo(netData);
    } catch (err) {
      console.error('Error loading initial tracker data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Register student presence on server
    if (student) {
      api.registerStudent(student).catch(() => {});
    }

    // PWA install prompt handler
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    socket.on('bus:location_update', (telemetry: any) => {
      setActiveBus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: telemetry.status,
          last_known_location: {
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            speed_kmh: telemetry.speed_kmh,
            heading: telemetry.heading,
            accuracy_meters: telemetry.accuracy_meters,
            timestamp: telemetry.last_update
          }
        };
      });

      setActiveTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          speed_kmh: telemetry.speed_kmh,
          heading: telemetry.heading,
          current_stop_id: telemetry.current_stop_id,
          next_stop_id: telemetry.next_stop_id,
          eta_to_next_stop_mins: telemetry.eta_to_next_stop_mins,
          last_update: telemetry.last_update
        };
      });
    });

    socket.on('passenger:activity_update', (act: PassengerActivity) => {
      setActivity(act);
    });

    socket.on('trip:started', ({ trip, bus }: any) => {
      setActiveTrip(trip);
      setActiveBus(bus);
      playChime('start');
    });

    socket.on('trip:ended', ({ tripId, bus }: any) => {
      setActiveTrip(null);
      setActiveBus(bus);
    });

    socket.on('route:updated', ({ route: r, stops: s }: any) => {
      if (r) setRoute(r);
      if (s) setStops(s);
    });

    socket.on('notification:new', (notif: AppNotification) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 29)]);
      if (Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/bus-icon.svg'
        });
      }
    });

    const heartbeatTimer = setInterval(() => {
      if (student) {
        socket.emit('student:heartbeat', {
          studentId: student.id,
          routeId: route?.id || 'ROUTE-01'
        });
      }
    }, 15000);

    return () => {
      socket.off('bus:location_update');
      socket.off('passenger:activity_update');
      socket.off('trip:started');
      socket.off('trip:ended');
      socket.off('route:updated');
      socket.off('notification:new');
      clearInterval(heartbeatTimer);
    };
  }, [student, route?.id]);

  const handleChangeRole = (role: UserRole) => {
    if (role === 'student') {
      setCurrentRole('student');
    } else if (role === 'driver') {
      if (driver) {
        setCurrentRole('driver');
      } else {
        setAuthModalRole('driver');
      }
    } else if (role === 'admin') {
      if (isAdminAuthenticated) {
        setCurrentRole('admin');
      } else {
        setAuthModalRole('admin');
      }
    }
  };

  const handleAuthenticate = async (pin: string): Promise<boolean> => {
    if (authModalRole === 'driver') {
      const res = await api.driverLogin(pin);
      if (res.driver) {
        setDriver(res.driver);
        localStorage.setItem('dtc_driver_profile', JSON.stringify(res.driver));
        setCurrentRole('driver');
        return true;
      }
    } else if (authModalRole === 'admin') {
      const res = await api.adminLogin(pin);
      if (res.authenticated) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('dtc_admin_auth', 'true');
        setCurrentRole('admin');
        return true;
      }
    }
    return false;
  };

  const handleUpdateStudentActivity = async (updates: {
    is_waiting?: boolean;
    is_boarded?: boolean;
    preferred_stop_id?: string;
  }) => {
    if (!student) return;

    const newStudent = { ...student, ...updates };
    setStudent(newStudent);
    localStorage.setItem('dtc_student_profile', JSON.stringify(newStudent));

    if (updates.is_boarded) {
      playChime('board');
    }

    try {
      const res = await api.updateStudentActivity({
        studentId: student.id,
        ...updates
      });
      setActivity(res.activity);
    } catch (err) {
      console.error('Error updating student activity:', err);
    }
  };

  const handleSaveStudentProfile = async (profileUpdates: Partial<StudentProfile>) => {
    if (!student) return;
    const updated = { ...student, ...profileUpdates };
    setStudent(updated);
    localStorage.setItem('dtc_student_profile', JSON.stringify(updated));
    await api.registerStudent(updated);
    const act = await api.getPassengerActivity(updated.route_id);
    setActivity(act);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('DTC Bus Tracker', {
          body: 'Notifications enabled! You will be alerted when your bus approaches.',
          icon: '/bus-icon.svg'
        });
      }
    }
  };

  const handleTriggerPWAInstall = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      deferredPromptRef.current = null;
      setIsInstallOpen(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden shadow-2xl relative">
      {/* Active Role Views */}
      <main className="flex-1 h-full w-full overflow-hidden relative">
        {currentRole === 'student' && (
          <StudentDashboard
            bus={activeBus}
            route={route}
            stops={stops}
            activeTrip={activeTrip}
            activity={activity}
            student={student}
            onUpdateActivity={handleUpdateStudentActivity}
            onOpenNotifications={() => setIsNotifOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            unreadCount={notifications.length}
          />
        )}

        {currentRole === 'driver' && (
          <DriverDashboard
            bus={activeBus}
            route={route}
            stops={stops}
            activeTrip={activeTrip}
            driver={driver}
            onTripStarted={(t) => {
              setActiveTrip(t);
              if (activeBus) {
                setActiveBus({ ...activeBus, status: 'MOVING', current_trip_id: t.id });
              }
            }}
            onTripEnded={() => {
              setActiveTrip(null);
              if (activeBus) {
                setActiveBus({ ...activeBus, status: 'IDLE', current_trip_id: null });
              }
            }}
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboard
            bus={activeBus}
            route={route}
            stops={stops}
            activity={activity}
            students={students}
            drivers={drivers}
            networkInfo={networkInfo}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onChangeRole={handleChangeRole}
        onOpenQR={() => setIsQROpen(true)}
        onOpenInstall={() => setIsInstallOpen(true)}
        isPWAInstallable={isInstallable}
      />

      {/* Modals */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onRequestPermission={handleRequestNotificationPermission}
        permissionState={notificationPermission}
      />

      <InstallPWAModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        onTriggerInstall={handleTriggerPWAInstall}
        deferredPromptAvailable={isInstallable}
      />

      <NetworkQRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        networkInfo={networkInfo}
      />

      <StudentProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        student={student}
        stops={stops}
        onSaveProfile={handleSaveStudentProfile}
      />

      {authModalRole && (
        <AuthModal
          isOpen={true}
          onClose={() => setAuthModalRole(null)}
          targetRole={authModalRole}
          onAuthenticate={handleAuthenticate}
        />
      )}
    </div>
  );
}

export default App;
