import React from 'react';
import { Wifi, RefreshCw, Sun, Moon } from 'lucide-react';
import { ConnectionStatus } from '../types/router';
import { strings } from '../utils/translations';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isRefreshing,
  onRefresh,
  isDark,
  onToggleDark,
}) => {
  const isLive = connectionStatus === 'connected';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/60 px-4 py-2.5 transition-colors">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Netis WF2409E
              </span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 py-0.5 rounded leading-none">
                V4
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              V1.0.1.1834
            </span>
          </div>
        </div>

        {/* Right Actions: Status & Controls */}
        <div className="flex items-center gap-1.5">
          {/* Connection status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isLive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>{isLive ? 'Connected' : 'Not Connected'}</span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors android-interactive"
            aria-label={strings.refresh}
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
            />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDark}
            className="w-8 h-8 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors android-interactive"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
