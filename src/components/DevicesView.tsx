import React, { useState } from 'react';
import {
  Search,
  Smartphone,
  ShieldAlert,
  Wifi,
  Cable,
  MoreVertical,
  Edit2,
  Gauge,
  X,
  Laptop,
  Tv,
  AlertTriangle,
  RotateCw,
  Info,
} from 'lucide-react';
import { ConnectionStatus, Device } from '../types/router';
import { strings } from '../utils/translations';

interface DevicesViewProps {
  devices: Device[];
  connectionStatus: ConnectionStatus;
  onToggleBlock: (mac: string, block: boolean) => Promise<void>;
  onSaveSpeedLimit: (
    mac: string,
    limit: { enabled: boolean; maxDownloadKbps: number; maxUploadKbps: number }
  ) => Promise<void>;
  onRenameDevice: (mac: string, customName: string) => void;
  onRetryConnection: () => Promise<void> | void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  connectionStatus,
  onToggleBlock,
  onSaveSpeedLimit,
  onRenameDevice,
  onRetryConnection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'blocked'>('all');

  // Selected device for Bottom Sheet
  const [activeSheetDevice, setActiveSheetDevice] = useState<Device | null>(null);
  const [sheetView, setSheetView] = useState<'details' | 'rename' | 'speed' | 'confirm_block'>('details');

  // Form states
  const [renameInput, setRenameInput] = useState('');
  const [speedLimitEnabled, setSpeedLimitEnabled] = useState(false);
  const [maxDownLimit, setMaxDownLimit] = useState(5120);
  const [maxUpLimit, setMaxUpLimit] = useState(1024);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isConnected = connectionStatus === 'connected';

  // Filter devices
  const filtered = devices.filter((dev) => {
    const term = searchTerm.toLowerCase();
    const match =
      (dev.name && dev.name.toLowerCase().includes(term)) ||
      (dev.customName && dev.customName.toLowerCase().includes(term)) ||
      (dev.ip && dev.ip.toLowerCase().includes(term)) ||
      (dev.mac && dev.mac.toLowerCase().includes(term)) ||
      (dev.vendor && dev.vendor.toLowerCase().includes(term));

    if (!match) return false;
    if (filter === 'online') return dev.isOnline && !dev.isBlocked;
    if (filter === 'offline') return !dev.isOnline && !dev.isBlocked;
    if (filter === 'blocked') return dev.isBlocked;
    return true;
  });

  const formatSpeed = (kbps: number) => {
    if (!kbps || kbps === 0) return '0 Kbps';
    if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`;
    return `${Math.round(kbps)} Kbps`;
  };

  const getDeviceIcon = (dev: Device) => {
    const name = (dev.customName || dev.name).toLowerCase();
    if (name.includes('macbook') || name.includes('laptop') || name.includes('pc')) {
      return Laptop;
    }
    if (name.includes('tv') || name.includes('media')) {
      return Tv;
    }
    return Smartphone;
  };

  const handleOpenSheet = (dev: Device, initialView: 'details' | 'rename' | 'speed' | 'confirm_block' = 'details') => {
    setActionError(null);
    setActiveSheetDevice(dev);
    setSheetView(initialView);
    setRenameInput(dev.customName || dev.name);
    setSpeedLimitEnabled(dev.speedLimit?.enabled ?? false);
    setMaxDownLimit(dev.speedLimit?.maxDownloadKbps || 5120);
    setMaxUpLimit(dev.speedLimit?.maxUploadKbps || 1024);
  };

  const handleSaveRename = () => {
    if (!activeSheetDevice) return;
    onRenameDevice(activeSheetDevice.mac, renameInput.trim());
    setActiveSheetDevice(null);
  };

  const handleSaveSpeed = async () => {
    if (!activeSheetDevice) return;
    if (!isConnected) {
      setActionError('Cannot apply speed limit: Router at 192.168.2.254 is not connected.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onSaveSpeedLimit(activeSheetDevice.mac, {
        enabled: speedLimitEnabled,
        maxDownloadKbps: maxDownLimit,
        maxUploadKbps: maxUpLimit,
      });
      setActiveSheetDevice(null);
    } catch {
      setActionError('Failed to apply QoS rule to Netis router.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteBlock = async () => {
    if (!activeSheetDevice) return;
    if (!isConnected) {
      setActionError('Cannot toggle block: Router at 192.168.2.254 is not connected.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onToggleBlock(activeSheetDevice.mac, !activeSheetDevice.isBlocked);
      setActiveSheetDevice(null);
    } catch {
      setActionError('Failed to update MAC filter on router.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Disconnected Notice */}
      {!isConnected && (
        <div className="android-card rounded-2xl p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold">Router Not Connected</span>
            </div>
            <button
              onClick={() => onRetryConnection()}
              className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Connected devices cannot be discovered while the router at <span className="font-mono font-semibold">http://192.168.2.254</span> is unreachable. Ensure your device is connected to the router&apos;s network.
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={strings.searchPlaceholder}
          className="w-full pl-9 pr-8 py-2.5 text-xs bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: strings.all, count: devices.length },
          { id: 'online', label: strings.online, count: devices.filter((d) => d.isOnline && !d.isBlocked).length },
          { id: 'offline', label: strings.offline, count: devices.filter((d) => !d.isOnline && !d.isBlocked).length },
          { id: 'blocked', label: strings.blocked, count: devices.filter((d) => d.isBlocked).length },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap android-interactive ${
              filter === chip.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800'
            }`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </div>

      {/* Device List */}
      {filtered.length === 0 ? (
        <div className="android-card rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            {isConnected ? 'No devices found' : 'No Verified Devices Available'}
          </p>
          <p className="text-[11px] text-slate-400">
            {isConnected
              ? 'No active DHCP leases or ARP entries reported by router.'
              : 'Unable to load device list while router is disconnected.'}
          </p>
        </div>
      ) : (
        <div className="android-card rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {filtered.map((device) => {
            const Icon = getDeviceIcon(device);
            return (
              <div
                key={device.id}
                onClick={() => handleOpenSheet(device, 'details')}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        device.isBlocked
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
                          : device.isOnline
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      {device.isBlocked ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    {/* Status Dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        device.isBlocked
                          ? 'bg-rose-500'
                          : device.isOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {device.customName || device.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {device.ip} · {device.mac}
                    </div>
                  </div>
                </div>

                {/* Right: Real Hardware Attributes & Menu */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 block">
                      {device.connectionType === 'lan_ethernet' ? 'LAN' : 'Wi-Fi'}
                    </span>
                    {device.speedLimit?.enabled ? (
                      <span className="text-[9px] font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 rounded block">
                        QoS Limited
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 block">
                        {device.isBlocked ? 'Blocked' : device.isOnline ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSheet(device, 'details');
                    }}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NATIVE ANDROID BOTTOM SHEET MODAL */}
      {activeSheetDevice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeSheetDevice.customName || activeSheetDevice.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeSheetDevice.vendor || 'Observed Device'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveSheetDevice(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* VIEW: DETAILS */}
            {sheetView === 'details' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">IP Address</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {activeSheetDevice.ip}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">MAC Address</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {activeSheetDevice.mac}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Connection</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeSheetDevice.connectionType === 'lan_ethernet' ? 'Ethernet LAN' : 'Wi-Fi 2.4GHz'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Bandwidth QoS</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {activeSheetDevice.speedLimit?.enabled
                        ? `${(activeSheetDevice.speedLimit.maxDownloadKbps / 1024).toFixed(1)} Mbps Down`
                        : 'Default (No Throttling)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-[11px] text-slate-400">
                    <span>Live Throughput</span>
                    <span className="italic">Not Supported by Hardware</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setSheetView('rename')}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold flex flex-col items-center gap-1 android-interactive"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={() => setSheetView('speed')}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold flex flex-col items-center gap-1 android-interactive"
                  >
                    <Gauge className="w-4 h-4 text-sky-600" />
                    <span>Speed QoS</span>
                  </button>

                  <button
                    onClick={() => setSheetView('confirm_block')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 android-interactive ${
                      activeSheetDevice.isBlocked
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{activeSheetDevice.isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: RENAME */}
            {sheetView === 'rename' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Custom Device Name
                  </label>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="e.g. My Phone, Living Room TV"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSheetView('details')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveRename}
                    className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: SPEED LIMIT */}
            {sheetView === 'speed' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Enable Speed Limit (QoS)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSpeedLimitEnabled(!speedLimitEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      speedLimitEnabled ? 'bg-sky-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                  </button>
                </div>

                {speedLimitEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Max Download</span>
                        <span className="font-mono font-bold">{formatSpeed(maxDownLimit)}</span>
                      </div>
                      <input
                        type="range"
                        min="512"
                        max="30720"
                        step="512"
                        value={maxDownLimit}
                        onChange={(e) => setMaxDownLimit(parseInt(e.target.value, 10))}
                        className="w-full accent-sky-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Max Upload</span>
                        <span className="font-mono font-bold">{formatSpeed(maxUpLimit)}</span>
                      </div>
                      <input
                        type="range"
                        min="256"
                        max="10240"
                        step="256"
                        value={maxUpLimit}
                        onChange={(e) => setMaxUpLimit(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSheetView('details')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveSpeed}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Apply to Router'}
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: CONFIRM BLOCK */}
            {sheetView === 'confirm_block' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {activeSheetDevice.isBlocked
                    ? `Unblock ${activeSheetDevice.mac}? Device will regain network access.`
                    : `Block ${activeSheetDevice.mac}? Netis router will block this MAC from Wi-Fi communication.`}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSheetView('details')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteBlock}
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm ${
                      activeSheetDevice.isBlocked ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {isSubmitting
                      ? 'Applying...'
                      : activeSheetDevice.isBlocked
                      ? 'Unblock Device'
                      : 'Block Device'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
