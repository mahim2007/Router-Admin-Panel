import React from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Gauge,
  Wifi,
  Settings,
} from 'lucide-react';
import { strings } from '../utils/translations';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'dashboard', label: strings.home, icon: LayoutDashboard },
    { id: 'devices', label: strings.devices, icon: Smartphone },
    { id: 'speed', label: strings.speed, icon: Gauge },
    { id: 'wifi', label: strings.wifi, icon: Wifi },
    { id: 'settings', label: strings.settings, icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/70 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 transition-colors">
      <nav className="max-w-lg mx-auto flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all android-interactive"
              aria-label={tab.label}
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
