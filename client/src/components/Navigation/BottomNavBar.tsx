// client/src/components/Navigation/BottomNavBar.tsx
import React from 'react';
import { NavTab } from '../../types';
import { Home, Map, Users, User, ShieldCheck } from 'lucide-react';

interface BottomNavBarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  driverCount?: number;
  isLoggedIn?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onTabChange,
  driverCount = 2,
  isLoggedIn = false
}) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home
    },
    {
      id: 'map',
      label: 'Explore Map',
      icon: Map
    },
    {
      id: 'driver',
      label: 'Drivers',
      icon: Users,
      badge: driverCount > 0 ? driverCount : undefined
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      badge: isLoggedIn ? 'Active' : undefined
    }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] px-3 py-1.5 max-w-md mx-auto"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Main Navigation"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[#1d4ed8] scale-105 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Active subtle pill background */}
              {isActive && (
                <span className="absolute inset-0 bg-blue-50 rounded-2xl -z-10 animate-fade-in" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />

                {/* Optional Badge */}
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white leading-tight shadow-xs ${
                      isActive
                        ? 'bg-[#1d4ed8] text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>

              {/* Indicator dot */}
              {isActive && (
                <span className="w-1.5 h-1.5 bg-[#1d4ed8] rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
