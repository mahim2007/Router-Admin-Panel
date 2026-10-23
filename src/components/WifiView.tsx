import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Radio,
  CheckCircle2,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import { ConnectionStatus, RouterStatus } from '../types/router';
import { strings } from '../utils/translations';

interface WifiViewProps {
  status: RouterStatus;
  connectionStatus: ConnectionStatus;
  onUpdateWifi: (payload: {
    ssid: string;
    password?: string;
    channel?: number | 'auto';
    channelWidth?: '20MHz' | '40MHz' | 'auto';
    isRadioOn?: boolean;
    isSsidBroadcastOn?: boolean;
  }) => Promise<{ success: boolean; message: string }>;
  onRetryConnection: () => Promise<void> | void;
}

export const WifiView: React.FC<WifiViewProps> = ({
  status,
  connectionStatus,
  onUpdateWifi,
  onRetryConnection,
}) => {
  const isConnected = connectionStatus === 'connected';

  const [ssid, setSsid] = useState(status.wifiSsid || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [channel, setChannel] = useState<number | 'auto'>(status.wifiChannel ?? 'auto');
  const [channelWidth, setChannelWidth] = useState<'20MHz' | '40MHz' | 'auto'>(
    status.wifiChannelWidth ?? 'auto'
  );
  const [isRadioOn, setIsRadioOn] = useState(status.isRadioOn ?? true);
  const [isSsidBroadcastOn, setIsSsidBroadcastOn] = useState(status.isSsidBroadcastOn ?? true);
  const [securityMode, setSecurityMode] = useState(status.wifiSecurity || 'WPA2-PSK');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync if router returns live data
  useEffect(() => {
    if (status.wifiSsid) {
      setSsid(status.wifiSsid);
    }
    if (status.wifiChannel !== undefined) {
      setChannel(status.wifiChannel);
    }
  }, [status.wifiSsid, status.wifiChannel]);

  // Confirmation dialog
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const handleInitiateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssid.trim()) return;
    if (!isConnected) {
      setFeedback({
        success: false,
        text: 'Cannot save: Router at 192.168.2.254 is disconnected.',
      });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteSave = async () => {
    setIsApplying(true);
    try {
      const res = await onUpdateWifi({
        ssid: ssid.trim(),
        password: password.trim() || undefined,
        channel,
        channelWidth,
        isRadioOn,
        isSsidBroadcastOn,
      });
      setShowConfirmModal(false);
      setFeedback({
        success: res.success,
        text: res.message,
      });
      if (res.success) {
        setPassword('');
      }
    } catch {
      setFeedback({
        success: false,
        text: 'Communication with Netis router failed.',
      });
    } finally {
      setIsApplying(false);
      setTimeout(() => setFeedback(null), 4000);
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
            Wi-Fi configuration cannot be read or changed while the Netis router at <span className="font-mono font-semibold">http://192.168.2.254</span> is unreachable.
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
            feedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleInitiateSave} className="space-y-3">
        {/* 1. Wireless Radio Master Card */}
        <div className="android-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {strings.wirelessRadio}
              </span>
              <span className="text-[10px] text-slate-400">
                {isConnected
                  ? isRadioOn
                    ? '2.4GHz Wi-Fi Broadcasting (802.11b/g/n)'
                    : 'Radio Turned Off'
                  : 'Unavailable (Router Not Connected)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isConnected}
            onClick={() => setIsRadioOn(!isRadioOn)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              !isConnected
                ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700'
                : isRadioOn
                ? 'bg-sky-600 justify-end'
                : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
          </button>
        </div>

        {/* 2. Primary Network Identity */}
        <div className="android-card rounded-2xl p-4 space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            Network Identity
          </span>

          {/* SSID */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              {strings.wifiName}
            </label>
            <input
              type="text"
              value={ssid}
              disabled={!isConnected}
              onChange={(e) => setSsid(e.target.value)}
              placeholder={isConnected ? 'e.g. netis_2.4G' : 'Unavailable (Not Connected)'}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              New {strings.wifiPassword} (Optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={!isConnected}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isConnected ? 'Leave empty to keep existing password' : 'Unavailable'}
                minLength={8}
                className="w-full pl-3 pr-9 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Router passwords are never stored or exposed in plain text.
            </span>
          </div>
        </div>

        {/* 3. Advanced Wireless Settings (Collapsible) */}
        <div className="android-card rounded-2xl p-4 space-y-3">
          <div
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Radio & Channel Settings
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </div>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
              {/* Hide SSID Switch */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {strings.hideSsid}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Invisible to public scan
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!isConnected}
                  onClick={() => setIsSsidBroadcastOn(!isSsidBroadcastOn)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    !isConnected
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700'
                      : !isSsidBroadcastOn
                      ? 'bg-sky-600 justify-end'
                      : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                </button>
              </div>

              {/* Security Mode */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {strings.securityMode}
                </label>
                <select
                  value={securityMode}
                  disabled={!isConnected}
                  onChange={(e) => setSecurityMode(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="WPA2-PSK">WPA2-PSK (AES) - Recommended</option>
                  <option value="WPA/WPA2-PSK">WPA/WPA2-PSK Mixed</option>
                  <option value="OPEN">Open (No Security)</option>
                </select>
              </div>

              {/* Channel */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    {strings.channel}
                  </label>
                  <select
                    value={channel}
                    disabled={!isConnected}
                    onChange={(e) =>
                      setChannel(e.target.value === 'auto' ? 'auto' : Number(e.target.value))
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="auto">Auto (Default)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((ch) => (
                      <option key={ch} value={ch}>
                        Channel {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    {strings.channelWidth}
                  </label>
                  <select
                    value={channelWidth}
                    disabled={!isConnected}
                    onChange={(e) => setChannelWidth(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="40MHz">40 MHz (300Mbps)</option>
                    <option value="20MHz">20 MHz (Standard)</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!isConnected}
            className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-sm transition-all android-interactive disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {strings.saveChanges}
          </button>
        </div>
      </form>

      {/* CONFIRMATION COMPACT DIALOG */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Confirm Wi-Fi Update
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Applying new Wi-Fi settings will temporarily disconnect all active devices. Are you sure you want to proceed?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {strings.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteSave}
                disabled={isApplying}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm"
              >
                {isApplying ? 'Applying...' : strings.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
