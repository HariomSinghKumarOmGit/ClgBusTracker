// client/src/components/Navigation/BottomNavBar.tsx
import React from 'react';
import { NavTab } from '../../types';
import { Home, Map, Users, User } from 'lucide-react';

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
  const tabs: {
    id: NavTab;
    label: string;
    shortLabel?: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    isBadgeActive?: boolean;
  }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home
    },
    {
      id: 'map',
      label: 'Explore Map',
      shortLabel: 'Map',
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
      isBadgeActive: isLoggedIn
    }
  ];

  return (
    <nav
      className="w-full flex-shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none touch-manipulation"
      style={{
        paddingTop: '0.375rem',
        paddingBottom: 'max(0.5rem, calc(0.35rem + env(safe-area-inset-bottom, 0px)))'
      }}
      role="tablist"
      aria-label="Main Navigation"
    >
      <div className="grid grid-cols-4 w-full items-center px-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex flex-col items-center justify-center min-h-[50px] py-1 px-0.5 rounded-2xl transition-colors duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {/* Active subtle pill background */}
              {isActive && (
                <span className="absolute inset-x-1 inset-y-0.5 bg-blue-50/80 rounded-xl -z-10 animate-fade-in border border-blue-100/60" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative inline-flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive
                      ? 'stroke-[2.5px] text-blue-700'
                      : 'stroke-[1.8px] text-slate-500 group-hover:text-slate-800'
                  }`}
                />

                {/* Driver Count Numerical Badge */}
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-black flex items-center justify-center border border-white leading-none shadow-xs ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Profile Active Status Dot */}
                {tab.isBadgeActive && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="Account Active"
                  />
                )}
              </div>

              {/* Responsive Text Label: Shows shortLabel on narrow screens */}
              <span className="text-[10px] min-[360px]:text-[11px] mt-0.5 tracking-tight truncate max-w-full text-center leading-tight">
                {tab.shortLabel ? (
                  <>
                    <span className="hidden min-[380px]:inline">{tab.label}</span>
                    <span className="inline min-[380px]:hidden">{tab.shortLabel}</span>
                  </>
                ) : (
                  tab.label
                )}
              </span>

              {/* Indicator dot: Always occupies space to avoid vertical layout shifts */}
              <span
                className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 opacity-100 scale-100'
                    : 'opacity-0 scale-0 pointer-events-none'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
