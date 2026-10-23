import React, { useState } from 'react';
import {
  Gauge,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { BandwidthRule, ConnectionStatus, Device, RouterStatus } from '../types/router';
import { strings } from '../utils/translations';

interface SpeedViewProps {
  status: RouterStatus;
  devices: Device[];
  rules: BandwidthRule[];
  connectionStatus: ConnectionStatus;
  onSaveRule: (rule: BandwidthRule) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onUpdateGlobalBandwidth: (payload: {
    enabled: boolean;
    totalUplinkKbps: number;
    totalDownlinkKbps: number;
  }) => Promise<void>;
  onRetryConnection: () => Promise<void> | void;
}

export const SpeedView: React.FC<SpeedViewProps> = ({
  status,
  devices,
  rules,
  connectionStatus,
  onSaveRule,
  onDeleteRule,
  onUpdateGlobalBandwidth,
  onRetryConnection,
}) => {
  const isConnected = connectionStatus === 'connected';

  const [isBwEnabled, setIsBwEnabled] = useState(status.bandwidthControlEnabled ?? false);
  const [totalUp, setTotalUp] = useState(status.totalUplinkKbps || 20480);
  const [totalDown, setTotalDown] = useState(status.totalDownlinkKbps || 51200);
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state
  const [activeModal, setActiveModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BandwidthRule | null>(null);

  // Form states
  const [selectedDeviceIp, setSelectedDeviceIp] = useState('');
  const [ipStart, setIpStart] = useState('192.168.2.100');
  const [ipEnd, setIpEnd] = useState('192.168.2.100');
  const [maxDown, setMaxDown] = useState(10240);
  const [maxUp, setMaxUp] = useState(2048);
  const [comment, setComment] = useState('');
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [isSavingRule, setIsSavingRule] = useState(false);

  const formatSpeed = (kbps: number) => {
    if (!kbps || kbps === 0) return '0 Kbps';
    if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`;
    return `${Math.round(kbps)} Kbps`;
  };

  const handleSaveMaster = async () => {
    if (!isConnected) {
      setErrorMessage('Cannot save: Router at 192.168.2.254 is disconnected.');
      return;
    }
    setErrorMessage(null);
    setIsSavingMaster(true);
    try {
      await onUpdateGlobalBandwidth({
        enabled: isBwEnabled ?? false,
        totalUplinkKbps: totalUp,
        totalDownlinkKbps: totalDown,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      setErrorMessage('Failed to update bandwidth control on router.');
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleOpenAdd = (device?: Device) => {
    setEditingRule(null);
    if (device) {
      setSelectedDeviceIp(device.ip);
      setIpStart(device.ip);
      setIpEnd(device.ip);
      setComment(device.customName || device.name);
    } else {
      setSelectedDeviceIp('');
      setIpStart('192.168.2.100');
      setIpEnd('192.168.2.100');
      setComment('');
    }
    setMaxDown(10240);
    setMaxUp(2048);
    setRuleEnabled(true);
    setActiveModal(true);
  };

  const handleOpenEdit = (rule: BandwidthRule) => {
    setEditingRule(rule);
    setSelectedDeviceIp('');
    setIpStart(rule.ipStart);
    setIpEnd(rule.ipEnd);
    setMaxDown(rule.maxDownloadKbps);
    setMaxUp(rule.maxUploadKbps);
    setComment(rule.comment);
    setRuleEnabled(rule.enabled);
    setActiveModal(true);
  };

  const handleSelectDeviceInModal = (ip: string) => {
    setSelectedDeviceIp(ip);
    if (ip) {
      setIpStart(ip);
      setIpEnd(ip);
      const dev = devices.find((d) => d.ip === ip);
      if (dev) {
        setComment(dev.customName || dev.name);
      }
    }
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setErrorMessage('Cannot save QoS rule: Router is not connected.');
      return;
    }
    setIsSavingRule(true);
    try {
      await onSaveRule({
        id: editingRule ? editingRule.id : `rule-${Date.now()}`,
        ipStart: ipStart.trim(),
        ipEnd: ipEnd.trim() || ipStart.trim(),
        minUploadKbps: Math.round(maxUp * 0.25),
        maxUploadKbps: Number(maxUp),
        minDownloadKbps: Math.round(maxDown * 0.25),
        maxDownloadKbps: Number(maxDown),
        comment: comment.trim() || 'Speed Rule',
        enabled: ruleEnabled,
      });
      setActiveModal(false);
    } catch {
      setErrorMessage('Failed to save bandwidth rule to router.');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRuleSafe = async (id: string) => {
    if (!isConnected) {
      setErrorMessage('Cannot delete rule: Router is not connected.');
      return;
    }
    await onDeleteRule(id);
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
            QoS bandwidth controls and traffic limits cannot be configured while the Netis router at <span className="font-mono font-semibold">http://192.168.2.254</span> is unreachable.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Global Bandwidth Control Card */}
      <div className="android-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {strings.bandwidthControl}
              </span>
              <span className="text-[10px] text-slate-400">
                {isConnected
                  ? status.bandwidthControlEnabled
                    ? 'Active on Netis Gateway'
                    : 'Disabled on Gateway'
                  : 'Unavailable (Router Not Connected)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isConnected}
            onClick={() => setIsBwEnabled(!isBwEnabled)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              !isConnected
                ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700'
                : isBwEnabled
                ? 'bg-sky-600 justify-end'
                : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
          </button>
        </div>

        {isBwEnabled && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Total Downlink
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalDown}
                    disabled={!isConnected}
                    onChange={(e) => setTotalDown(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    {(totalDown / 1024).toFixed(0)}M
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Total Uplink
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalUp}
                    disabled={!isConnected}
                    onChange={(e) => setTotalUp(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    {(totalUp / 1024).toFixed(0)}M
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  ISP Bandwidth Ceiling
                </span>
              )}

              <button
                onClick={handleSaveMaster}
                disabled={isSavingMaster || !isConnected}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isSavingMaster ? 'Saving...' : strings.saveChanges}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Device Speed Management List */}
      <div className="android-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Configured QoS Rules
          </span>
          {isConnected && (
            <button
              onClick={() => handleOpenAdd()}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{strings.addRule}</span>
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="py-6 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">Unavailable</p>
            <p className="text-[11px]">Cannot retrieve QoS rules from disconnected router.</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No speed limits active. Tap &quot;+ Add Rule&quot; to configure QoS for IP addresses.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rules.map((rule) => {
              const isSingleIp = rule.ipStart === rule.ipEnd;
              return (
                <div
                  key={rule.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rule.comment || 'Speed Rule'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {isSingleIp ? rule.ipStart : `${rule.ipStart} - ${rule.ipEnd}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ↓ {formatSpeed(rule.maxDownloadKbps)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                        ↑ {formatSpeed(rule.maxUploadKbps)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRuleSafe(rule.id)}
                        className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD/EDIT RULE BOTTOM SHEET MODAL */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitRule}
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 space-y-3.5 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRule ? 'Edit Speed Rule' : 'New Speed Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device select */}
            {devices.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Choose Connected Device
                </label>
                <select
                  value={selectedDeviceIp}
                  onChange={(e) => handleSelectDeviceInModal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Custom IP or Range --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.ip}>
                      {d.customName || d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* IP range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Start IP
                </label>
                <input
                  type="text"
                  value={ipStart}
                  onChange={(e) => setIpStart(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  End IP
                </label>
                <input
                  type="text"
                  value={ipEnd}
                  onChange={(e) => setIpEnd(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Max Download Speed Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Max Download</span>
                <span className="font-mono text-sky-600 dark:text-sky-400">{formatSpeed(maxDown)}</span>
              </div>
              <input
                type="range"
                min="512"
                max="30720"
                step="512"
                value={maxDown}
                onChange={(e) => setMaxDown(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            {/* Max Upload Speed Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Max Upload</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{formatSpeed(maxUp)}</span>
              </div>
              <input
                type="range"
                min="256"
                max="10240"
                step="256"
                value={maxUp}
                onChange={(e) => setMaxUp(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Label / Comment
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Office PC, Guest Limit"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {strings.cancel}
              </button>
              <button
                type="submit"
                disabled={isSavingRule}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm"
              >
                {isSavingRule ? 'Saving...' : strings.saveChanges}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
