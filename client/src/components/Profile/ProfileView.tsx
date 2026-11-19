// client/src/components/Profile/ProfileView.tsx
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { 
  User, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Bell, 
  Volume2, 
  Smartphone, 
  MapPin, 
  Heart, 
  Edit3, 
  Check, 
  RefreshCw,
  Sparkles,
  Lock,
  ChevronRight
} from 'lucide-react';

interface ProfileViewProps {
  onProfileUpdate?: (profile: UserProfile) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_local_01',
  name: 'Alex Rivera',
  phone: '+1 (555) 382-9102',
  email: 'alex.rivera@example.com',
  avatar_emoji: '😎',
  role: 'commuter',
  is_logged_in: true,
  preferred_stop_id: 'STOP-01',
  preferred_stop_name: '15th',
  home_stop: 'Saket Metro',
  work_campus_stop: 'Delhi Technical Campus',
  saved_routes: ['38', '21', '140'],
  notifications_enabled: true,
  chime_alerts: true,
  vibration_alerts: true
};

export const ProfileView: React.FC<ProfileViewProps> = ({ onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('bustracker_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PROFILE;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editStop, setEditStop] = useState(profile.preferred_stop_name);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('bustracker_user_profile', JSON.stringify(profile));
      if (onProfileUpdate) onProfileUpdate(profile);
    } catch (e) {}
  }, [profile, onProfileUpdate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      showToast('🔔 Chime sound played!');
    } catch (e) {
      console.log('Audio not allowed yet', e);
    }
  };

  const handleSaveProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: editName,
      phone: editPhone,
      preferred_stop_name: editStop
    }));
    setIsEditing(false);
    showToast('✅ Profile saved to local storage!');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(prev => ({
      ...prev,
      is_logged_in: true,
      phone: loginPhone || prev.phone,
      name: loginPhone ? `User ${loginPhone.slice(-4)}` : prev.name
    }));
    setIsLoginModalOpen(false);
    showToast('🎉 Successfully signed in!');
  };

  const handleLogout = () => {
    setProfile(prev => ({
      ...prev,
      is_logged_in: false
    }));
    showToast('Logged out of passenger account');
  };

  const handleEmojiSelect = (emoji: string) => {
    setProfile(prev => ({ ...prev, avatar_emoji: emoji }));
    showToast(`Emoji avatar changed to ${emoji}`);
  };

  const availableEmojis = ['😎', '🚍', '🎓', '⚡', '🎒', '🧭', '🌟', '🚇'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-600">Local Browser Storage</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">Passenger Profile</h1>
          </div>

          {profile.is_logged_in ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>

        {/* Local Storage Privacy Banner */}
        <div className="mt-3 bg-emerald-950 text-emerald-100 rounded-2xl p-3.5 border border-emerald-800 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>Stored Locally on Device</span>
                <span className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-mono uppercase">100% Private</span>
              </div>
              <p className="text-emerald-200/80 mt-0.5 leading-relaxed text-[11px]">
                Your personal details, contact info, and preferred stops stay in your browser's <code className="font-mono bg-emerald-900 px-1 py-0.5 rounded">localStorage</code>. No account tracking.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        {/* Top background accent */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 to-[#1d4ed8]" />

        <div className="relative pt-4">
          <div className="flex items-end justify-between mb-3">
            {/* Avatar Pill */}
            <div className="relative">
              <div className="w-18 h-18 rounded-3xl bg-white shadow-lg border-2 border-white flex items-center justify-center text-4xl select-none">
                {profile.avatar_emoji}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                profile.is_logged_in ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>

            <button
              onClick={() => {
                setEditName(profile.name);
                setEditPhone(profile.phone);
                setEditStop(profile.preferred_stop_name);
                setIsEditing(!isEditing);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Info'}</span>
            </button>
          </div>

          {/* User Details */}
          {!isEditing ? (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{profile.name}</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{profile.phone}</p>
              
              {/* Linked Stop Badge (Image 1 top badge preview) */}
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-[#1d4ed8] px-3 py-1 rounded-xl text-xs font-bold border border-blue-200/70">
                <span className="text-sm">{profile.avatar_emoji}</span>
                <span>Active Top Stop: <strong>{profile.preferred_stop_name}</strong></span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Favorite Stop Name (Shown on Image 1 Badge)
                </label>
                <input
                  type="text"
                  value={editStop}
                  onChange={(e) => setEditStop(e.target.value)}
                  placeholder="e.g. 15th"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Local Changes</span>
              </button>
            </div>
          )}

          {/* Emoji Avatar Picker */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
              Choose Avatar Emoji
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {availableEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                    profile.avatar_emoji === emoji
                      ? 'bg-blue-100 scale-110 border-2 border-blue-500 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transit Preferences Section */}
      <div className="mt-4 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Alert & Sound Settings
        </h3>

        {/* Chime Setting */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1d4ed8] flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Arrival Audio Chime</div>
              <div className="text-[10px] text-slate-500">Play pleasant bell when bus arrives</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={playChime}
              className="text-[11px] font-bold text-[#1d4ed8] hover:underline px-2 py-1 bg-white rounded-lg border border-blue-200 shadow-xs"
            >
              Test
            </button>
            <button
              onClick={() => {
                setProfile(prev => ({ ...prev, chime_alerts: !prev.chime_alerts }));
                showToast(`Chimes ${!profile.chime_alerts ? 'enabled' : 'disabled'}`);
              }}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                profile.chime_alerts ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-1 ${
                profile.chime_alerts ? 'right-1' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Vibration Setting */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Haptic Vibration</div>
              <div className="text-[10px] text-slate-500">Vibrate on 32s countdown and arrival</div>
            </div>
          </div>
          <button
            onClick={() => {
              setProfile(prev => ({ ...prev, vibration_alerts: !prev.vibration_alerts }));
              showToast(`Haptics ${!profile.vibration_alerts ? 'enabled' : 'disabled'}`);
            }}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              profile.vibration_alerts ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-1 ${
              profile.vibration_alerts ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Saved Locations */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
            Frequent Stops
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Home: {profile.home_stop || '15th & Market St'}</span>
              </span>
              <span className="text-[10px] text-blue-600 font-bold">Route 38</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Work / Campus: {profile.work_campus_stop || 'Delhi Technical Campus'}</span>
              </span>
              <span className="text-[10px] text-indigo-600 font-bold">Route 38</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Local Storage Button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            if (window.confirm('Reset local preferences to default?')) {
              localStorage.removeItem('bustracker_user_profile');
              setProfile(DEFAULT_PROFILE);
              showToast('Preferences restored to default');
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 font-semibold"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Local Profile Data</span>
        </button>
      </div>

      {/* MODAL: Login / Sign In */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-up border border-slate-100">
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-[#1d4ed8] rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">
                😎
              </div>
              <h3 className="text-base font-bold text-slate-900">Passenger Login</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to sync your local transit shortcuts</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  4-Digit Transit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs tracking-widest text-center font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Sign In (Store Locally)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfile(prev => ({ ...prev, is_logged_in: true }));
                    setIsLoginModalOpen(false);
                    showToast('Quick demo login activated');
                  }}
                  className="w-full py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                >
                  1-Click Demo Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
