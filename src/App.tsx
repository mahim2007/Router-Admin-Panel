import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { DevicesView } from './components/DevicesView';
import { SpeedView } from './components/SpeedView';
import { WifiView } from './components/WifiView';
import { SettingsView } from './components/SettingsView';

import {
  BandwidthRule,
  ConnectionConfig,
  ConnectionStatus,
  Device,
  DeviceHistoryRecord,
  RouterStatus,
} from './types/router';
import {
  deleteBandwidthRule,
  fetchBandwidthRules,
  fetchDevices,
  fetchRouterStatus,
  getStoredConfig,
  saveBandwidthRule,
  saveStoredConfig,
  setDeviceSpeedLimit,
  toggleDeviceBlock,
  updateGlobalBandwidth,
  updateWifiSettings,
} from './services/netisApi';
import {
  clearDeviceHistory,
  getCustomDeviceNames,
  getStoredDeviceHistory,
  saveCustomDeviceName,
  syncDevicesWithHistory,
} from './services/deviceHistory';
import { X, Smartphone, Wifi, Cable, ShieldAlert } from 'lucide-react';
import { strings } from './utils/translations';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Router connection state - initially disconnected until verified
  const [config, setConfig] = useState<ConnectionConfig>(getStoredConfig);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [routerStatus, setRouterStatus] = useState<RouterStatus>({
    model: 'Netis WF2409E V4',
    firmwareVersion: 'Netis(WF2409Ev4)-V1.0.1.1834',
    lanIp: '192.168.2.254',
    isReachable: false,
    internetStatus: 'unavailable',
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [historyRecords, setHistoryRecords] = useState<DeviceHistoryRecord[]>(getStoredDeviceHistory);
  const [rules, setRules] = useState<BandwidthRule[]>([]);

  // Device Detail Modal
  const [detailModalDevice, setDetailModalDevice] = useState<Device | null>(null);

  // Dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load verified router data
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, devRes, rulesRes] = await Promise.all([
        fetchRouterStatus(),
        fetchDevices(),
        fetchBandwidthRules(),
      ]);

      setRouterStatus(statusRes.status);
      setConnectionStatus(statusRes.connectionStatus);

      const isLive = statusRes.connectionStatus === 'connected';

      // Apply locally stored custom names only if genuine devices exist
      const customNames = getCustomDeviceNames();
      const mappedDevices = devRes.devices.map((d) => ({
        ...d,
        customName: customNames[d.mac.toUpperCase()] || d.customName,
      }));

      setDevices(mappedDevices);
      setRules(rulesRes);

      // Only sync real devices if router is genuinely reachable
      const updatedHistory = syncDevicesWithHistory(mappedDevices, isLive);
      setHistoryRecords(updatedHistory);
    } catch (e) {
      console.error('Error fetching router data', e);
      setConnectionStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleToggleBlock = async (mac: string, block: boolean) => {
    const res = await toggleDeviceBlock(mac, block);
    await loadData();
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleSaveSpeedLimit = async (
    mac: string,
    limit: { enabled: boolean; maxDownloadKbps: number; maxUploadKbps: number }
  ) => {
    const res = await setDeviceSpeedLimit(mac, limit);
    await loadData();
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleRenameDevice = (mac: string, customName: string) => {
    saveCustomDeviceName(mac, customName);
    setDevices((prev) =>
      prev.map((d) =>
        d.mac.toUpperCase() === mac.toUpperCase() ? { ...d, customName } : d
      )
    );
  };

  const handleUpdateWifi = async (payload: any) => {
    const res = await updateWifiSettings(payload);
    await loadData();
    return res;
  };

  const handleSaveRule = async (rule: BandwidthRule) => {
    const res = await saveBandwidthRule(rule);
    const updatedRules = await fetchBandwidthRules();
    setRules(updatedRules);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    await deleteBandwidthRule(ruleId);
    const updatedRules = await fetchBandwidthRules();
    setRules(updatedRules);
  };

  const handleUpdateGlobalBandwidth = async (payload: any) => {
    const res = await updateGlobalBandwidth(payload);
    await loadData();
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleSaveConfig = (cfg: ConnectionConfig) => {
    setConfig(cfg);
    saveStoredConfig(cfg);
    loadData();
  };

  const handleClearHistory = () => {
    clearDeviceHistory();
    setHistoryRecords([]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 sm:shadow-lg sm:border-x sm:border-slate-200/50 dark:sm:border-slate-800 relative">
        {/* Compact Android App Bar */}
        <Header
          connectionStatus={connectionStatus}
          isRefreshing={isRefreshing}
          onRefresh={loadData}
          isDark={isDark}
          onToggleDark={() => setIsDark((prev) => !prev)}
        />

        {/* Content Body */}
        <main className="flex-1 px-4 py-3.5">
          {currentTab === 'dashboard' && (
            <DashboardView
              status={routerStatus}
              devices={devices}
              totalHistoricalCount={historyRecords.length}
              connectionStatus={connectionStatus}
              onNavigateTab={setCurrentTab}
              onOpenDeviceModal={setDetailModalDevice}
              onRetryConnection={loadData}
            />
          )}

          {currentTab === 'devices' && (
            <DevicesView
              devices={devices}
              connectionStatus={connectionStatus}
              onToggleBlock={handleToggleBlock}
              onSaveSpeedLimit={handleSaveSpeedLimit}
              onRenameDevice={handleRenameDevice}
              onRetryConnection={loadData}
            />
          )}

          {currentTab === 'speed' && (
            <SpeedView
              status={routerStatus}
              devices={devices}
              rules={rules}
              connectionStatus={connectionStatus}
              onSaveRule={handleSaveRule}
              onDeleteRule={handleDeleteRule}
              onUpdateGlobalBandwidth={handleUpdateGlobalBandwidth}
              onRetryConnection={loadData}
            />
          )}

          {currentTab === 'wifi' && (
            <WifiView
              status={routerStatus}
              connectionStatus={connectionStatus}
              onUpdateWifi={handleUpdateWifi}
              onRetryConnection={loadData}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              status={routerStatus}
              config={config}
              onSaveConfig={handleSaveConfig}
              connectionStatus={connectionStatus}
              historyRecords={historyRecords}
              onClearHistory={handleClearHistory}
            />
          )}
        </main>

        {/* Fixed Android Bottom Navigation Bar */}
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Quick Device Detail Sheet */}
        {detailModalDevice && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 space-y-3.5 animate-in slide-in-from-bottom duration-200">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {detailModalDevice.customName || detailModalDevice.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {detailModalDevice.vendor || 'Connected Device'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModalDevice(null)}
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">IP Address</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {detailModalDevice.ip}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">MAC Address</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {detailModalDevice.mac}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Connection</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {detailModalDevice.connectionType === 'lan_ethernet' ? 'Ethernet LAN' : 'Wi-Fi 2.4GHz'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Bandwidth Limit</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {detailModalDevice.speedLimit?.enabled
                      ? `${(detailModalDevice.speedLimit.maxDownloadKbps / 1024).toFixed(1)} Mbps`
                      : 'None'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    setDetailModalDevice(null);
                    setCurrentTab('devices');
                  }}
                  className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                >
                  Manage in Devices
                </button>

                <button
                  onClick={() => setDetailModalDevice(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
