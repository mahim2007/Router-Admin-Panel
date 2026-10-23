import React from 'react';
import {
  Wifi,
  Globe,
  Smartphone,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { Device, RouterStatus, ConnectionStatus } from '../types/router';
import { strings } from '../utils/translations';

interface DashboardViewProps {
  status: RouterStatus;
  devices: Device[];
  totalHistoricalCount: number;
  connectionStatus: ConnectionStatus;
  onNavigateTab: (tab: string) => void;
  onOpenDeviceModal: (dev: Device) => void;
  onRetryConnection: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  status,
  devices,
  totalHistoricalCount,
  connectionStatus,
  onNavigateTab,
  onOpenDeviceModal,
  onRetryConnection,
}) => {
  const isConnected = connectionStatus === 'connected';

  const onlineDevices = devices.filter((d) => d.isOnline && !d.isBlocked);
  const offlineDevices = devices.filter((d) => !d.isOnline && !d.isBlocked);
  const blockedDevices = devices.filter((d) => d.isBlocked);

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'Unavailable';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Disconnected / Error Warning Banner */}
      {!isConnected && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                Router Not Connected
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Cannot reach Netis WF2409E V4 at http://192.168.2.254
              </span>
            </div>
          </div>

          <button
            onClick={onRetryConnection}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm shrink-0"
          >
            <RotateCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. Compact Router & Network Status Card */}
      <div className="android-card rounded-2xl p-4 transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{strings.internetStatus}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  · {status.wanIp || 'Unavailable'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {status.model} · {formatUptime(status.uptimeSeconds)}
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>{isConnected ? strings.connected : 'Not Connected'}</span>
          </div>
        </div>

        {/* Current Wi-Fi Sub-Strip */}
        <div
          onClick={() => onNavigateTab('wifi')}
          className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-100/70 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {status.wifiSsid || 'Unavailable'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isConnected
                  ? `2.4GHz · Channel ${status.wifiChannel ?? 'Auto'} · ${status.wifiSecurity ?? 'WPA2-PSK'}`
                  : 'Not Connected to Router'}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 2. Compact 2x2 Summary Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Devices */}
        <div
          onClick={() => onNavigateTab('devices')}
          className="android-card rounded-2xl p-3.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all android-interactive"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {strings.totalDevices}
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {isConnected ? devices.length : '--'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isConnected ? 'Verified from DHCP' : 'Unavailable'}
          </span>
        </div>

        {/* Online Devices */}
        <div
          onClick={() => onNavigateTab('devices')}
          className="android-card rounded-2xl p-3.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all android-interactive"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {strings.onlineDevices}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {isConnected ? onlineDevices.length : '--'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isConnected ? 'Active on WLAN/LAN' : 'Unavailable'}
          </span>
        </div>

        {/* Offline Devices */}
        <div
          onClick={() => onNavigateTab('devices')}
          className="android-card rounded-2xl p-3.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all android-interactive"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {strings.offlineDevices}
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-300 tabular-nums">
            {isConnected ? offlineDevices.length : '--'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isConnected ? 'Lease Expired' : 'Unavailable'}
          </span>
        </div>

        {/* Blocked Devices */}
        <div
          onClick={() => onNavigateTab('devices')}
          className="android-card rounded-2xl p-3.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all android-interactive"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {strings.blockedDevices}
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {isConnected ? blockedDevices.length : '--'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isConnected ? 'MAC Filter Rule' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* 3. Traffic Statistics Status Card (Honest Router Capability Notice) */}
      <div
        onClick={() => onNavigateTab('speed')}
        className="android-card rounded-2xl p-3.5 flex items-center justify-between cursor-pointer"
      >
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            Traffic Statistics
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time per-device throughput: <strong className="text-slate-700 dark:text-slate-300">Not Supported</strong> by Netis WF2409E hardware
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {/* 4. Connected Devices List */}
      <div className="android-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {strings.onlineDevices} ({isConnected ? onlineDevices.length : 0})
          </span>
          <button
            onClick={() => onNavigateTab('devices')}
            className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {!isConnected ? (
          <div className="py-6 text-center text-xs text-slate-500 space-y-2">
            <div>Unable to Load Data — Router Not Connected</div>
            <button
              onClick={onRetryConnection}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
            >
              Retry
            </button>
          </div>
        ) : onlineDevices.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No devices currently connected to router
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {onlineDevices.slice(0, 4).map((device) => (
              <div
                key={device.id}
                onClick={() => onOpenDeviceModal(device)}
                className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl px-1.5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {device.customName || device.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {device.ip} · {device.mac}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    Online
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
