import React, { useState } from 'react';
import {
  KeyRound,
  RotateCw,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Cpu,
  History,
  Download,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  ConnectionConfig,
  ConnectionStatus,
  DeviceHistoryRecord,
  PingResult,
  RouterStatus,
} from '../types/router';
import {
  changeAdminPassword,
  isPrivateIpAddress,
  rebootRouter,
  runPingTest,
  testRouterConnection,
} from '../services/netisApi';
import { strings } from '../utils/translations';

interface SettingsViewProps {
  status: RouterStatus;
  config: ConnectionConfig;
  onSaveConfig: (cfg: ConnectionConfig) => void;
  connectionStatus: ConnectionStatus;
  historyRecords: DeviceHistoryRecord[];
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  config,
  onSaveConfig,
  connectionStatus,
  historyRecords,
  onClearHistory,
}) => {
  const isConnected = connectionStatus === 'connected';

  // Connection config
  const [routerUrl, setRouterUrl] = useState(config.routerUrl);
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState(config.password || '');
  const [showConfigPass, setShowConfigPass] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    authFailed?: boolean;
    diagnostics?: {
      targetUrl?: string;
      isPrivateLan?: boolean;
      code?: string;
      explanation?: string;
    };
  } | null>(null);

  // Admin password
  const [oldAdminPass, setOldAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Reboot state
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootCountdown, setRebootCountdown] = useState(45);

  // Ping state
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [pingRunning, setPingRunning] = useState(false);
  const [pingOutput, setPingOutput] = useState<PingResult | null>(null);

  // History sheet
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const normalizeUrl = (raw: string) => {
    let trimmed = raw.trim();
    if (!trimmed) return 'http://192.168.2.254';
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
    }
    return trimmed.replace(/\/+$/, '');
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = normalizeUrl(routerUrl);
    setRouterUrl(cleanUrl);
    onSaveConfig({
      ...config,
      routerUrl: cleanUrl,
      username: username.trim(),
      password: password.trim(),
    });
    setTestResult({
      success: true,
      message: 'Connection configuration saved locally.',
    });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const cleanUrl = normalizeUrl(routerUrl);
    setRouterUrl(cleanUrl);
    const res = await testRouterConnection(cleanUrl, username.trim(), password.trim());
    setTestingConnection(false);
    setTestResult({
      success: res.success,
      message: res.message,
      authFailed: res.authFailed,
      diagnostics: res.diagnostics,
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setPassFeedback({
        type: 'error',
        text: 'Router is not connected. Connect to router at 192.168.2.254 first.',
      });
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setPassFeedback({
        type: 'error',
        text: 'New passwords do not match.',
      });
      return;
    }

    setIsChangingPass(true);
    const res = await changeAdminPassword(oldAdminPass, newAdminPass);
    setIsChangingPass(false);

    if (res.success) {
      setPassFeedback({ type: 'success', text: res.message });
      setOldAdminPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setTimeout(() => setPassFeedback(null), 3500);
    } else {
      setPassFeedback({ type: 'error', text: res.message });
    }
  };

  const handleTriggerReboot = async () => {
    setShowRebootModal(false);
    setIsRebooting(true);
    setRebootCountdown(45);
    await rebootRouter();

    const interval = setInterval(() => {
      setRebootCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRebooting(false);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRunPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingHost.trim()) return;
    setPingRunning(true);
    setPingOutput(null);
    const result = await runPingTest(pingHost.trim());
    setPingRunning(false);
    setPingOutput(result);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(historyRecords, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netis_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 pb-20">
      {/* 1. Router Specifications Card */}
      <div className="android-card rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {status.model}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {status.firmwareVersion}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isConnected ? 'Verified Live' : 'Not Connected'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-[10px] text-slate-400 block">{strings.routerAddress}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
              {config.routerUrl}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-[10px] text-slate-400 block">{strings.uptime}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
              {status.uptimeSeconds !== undefined
                ? `${Math.floor(status.uptimeSeconds / 86400)}d ${Math.floor((status.uptimeSeconds % 86400) / 3600)}h`
                : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Admin Security Password */}
      <div className="android-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {strings.adminSecurity}
          </span>
        </div>

        {passFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 font-medium ${
              passFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {passFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>{passFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              {strings.oldPassword}
            </label>
            <input
              type="password"
              value={oldAdminPass}
              disabled={!isConnected}
              onChange={(e) => setOldAdminPass(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {strings.newPassword}
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={newAdminPass}
                  disabled={!isConnected}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  required
                  minLength={4}
                  className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {strings.confirmPassword}
              </label>
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={confirmAdminPass}
                disabled={!isConnected}
                onChange={(e) => setConfirmAdminPass(e.target.value)}
                required
                minLength={4}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isChangingPass || !isConnected}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-sm transition-colors disabled:opacity-50"
            >
              {isChangingPass ? 'Saving...' : strings.saveChanges}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Router Connection Configuration */}
      <div className="android-card rounded-2xl p-4 space-y-3">
        <span className="text-xs font-bold text-slate-900 dark:text-white block">
          Gateway Connection Setup
        </span>

        <form onSubmit={handleSaveConnection} className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Gateway Address (Router URL)
            </label>
            <input
              type="text"
              value={routerUrl}
              onChange={(e) => setRouterUrl(e.target.value)}
              placeholder="http://192.168.2.254"
              required
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (e.g. Mahim)"
                required
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showConfigPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfigPass(!showConfigPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfigPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 block">
            All router communications strictly use the exact Gateway URL, Username, and Password saved here.
          </span>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{testingConnection ? 'Testing...' : strings.testConnection}</span>
            </button>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900"
            >
              Save Config
            </button>
          </div>
        </form>

        {testResult && (
          testResult.success ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-2 border border-emerald-200/80 dark:border-emerald-800/60 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-2xl text-xs space-y-2 border border-amber-200/80 dark:border-amber-800/60">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{testResult.message}</span>
              </div>

              {testResult.authFailed ? (
                <div className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                  <p className="font-semibold text-rose-700 dark:text-rose-400">
                    Authentication Rejected (401 Unauthorized)
                  </p>
                  <p className="mt-0.5">
                    The router at {routerUrl} rejected the credentials for username &apos;{username}&apos;. Please verify the exact username and password configured on your router.
                  </p>
                </div>
              ) : testResult.diagnostics?.isPrivateLan || isPrivateIpAddress(routerUrl) ? (
                <div className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 space-y-2">
                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/70 rounded-xl space-y-1 border border-amber-200/50 dark:border-amber-900/40">
                    <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 text-xs">
                      <span>⚠️ কেন Vercel থেকে কানেক্ট হচ্ছে না?</span>
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">192.168.2.254</span> হচ্ছে আপনার বাসার ওয়াইফাই নেটওয়ার্কের নিজস্ব প্রাইভেট আইপি (Local LAN)। আপনি অ্যাপটি <strong className="text-slate-900 dark:text-white">Vercel ক্লাউড সার্ভারে</strong> ডিপ্লয় করেছেন। ইন্টারনেটের ক্লাউড সার্ভার থেকে সরাসরি আপনার বাসার ভেতরের লোকাল আইপিতে রিকোয়েস্ট পৌঁছাতে পারে না।
                    </p>
                  </div>

                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/70 rounded-xl space-y-2 border border-amber-200/50 dark:border-amber-900/40">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      কানেক্ট করার ২টি সহজ উপায়:
                    </p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="p-2 bg-sky-50/80 dark:bg-sky-950/40 rounded-lg border border-sky-200/60 dark:border-sky-800/50">
                        <p className="font-bold text-sky-900 dark:text-sky-200">
                          ১. লোকালি চালানো (সবচেয়ে সহজ ও সেরা)
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-[10.5px]">
                          বাসার একই ওয়াইফাইয়ে সংযুক্ত ল্যাপটপ/পিসিতে বা মোবাইলের Termux-এ <code className="px-1 py-0.5 bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 rounded font-mono font-semibold">npm run dev</code> চালিয়ে ব্রাউজারে খুললে সরাসরি আপনার রাউটারের সাথে কাজ করবে।
                        </p>
                      </div>

                      <div className="p-2 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50">
                        <p className="font-bold text-indigo-900 dark:text-indigo-200">
                          ২. Remote Management চালু করা (Vercel থেকে চালাতে চাইলে)
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-[10.5px]">
                          রাউটার অ্যাডমিনে (<code className="font-mono">192.168.2.254</code>) গিয়ে <strong>Advanced &gt; System Tools &gt; Remote Management</strong> অন করে Port 8080 দিন। এরপর আপনার পাবলিক WAN IP এখানে দিয়ে সেভ করুন (যেমন: <code className="font-mono font-bold">http://[পাবলিক_আইপি]:8080</code>)।
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Direct Open in Browser Button */}
              <div className="pt-1">
                <a
                  href={routerUrl.startsWith('http') ? routerUrl : `http://${routerUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>সরাসরি ব্রাউজারে রাউটার অ্যাডমিন ওপেন করুন ({routerUrl})</span>
                </a>
              </div>
            </div>
          )
        )}
      </div>

      {/* 4. Tools & Actions: Ping, Device History & Reboot */}
      <div className="android-card rounded-2xl p-4 space-y-3">
        <span className="text-xs font-bold text-slate-900 dark:text-white block">
          Tools & Diagnostics
        </span>

        {/* Diagnostic Ping */}
        <form onSubmit={handleRunPing} className="flex gap-2">
          <input
            type="text"
            value={pingHost}
            onChange={(e) => setPingHost(e.target.value)}
            placeholder="8.8.8.8"
            className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={pingRunning}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800"
          >
            {pingRunning ? 'Pinging...' : strings.pingTest}
          </button>
        </form>

        {pingOutput && (
          <div className="p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
            {pingOutput.success ? (
              <div>
                {pingOutput.packetsReceived}/{pingOutput.packetsSent} packets (avg {pingOutput.avgLatencyMs || 0}ms)
              </div>
            ) : (
              <div className="text-rose-400">
                Ping unavailable: Router at {config.routerUrl} is not connected.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* View Device History */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Observed History ({historyRecords.length})</span>
          </button>

          {/* Reboot Button */}
          <button
            type="button"
            onClick={() => setShowRebootModal(true)}
            disabled={isRebooting || !isConnected}
            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin' : ''}`} />
            <span>{isRebooting ? `${rebootCountdown}s` : strings.rebootRouter}</span>
          </button>
        </div>
      </div>

      {/* DEVICE HISTORY BOTTOM SHEET MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 space-y-3.5 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Observed Device History
                </h3>
                <span className="text-[10px] text-slate-400">
                  Devices observed while connected
                </span>
              </div>
              <div className="flex items-center gap-1">
                {historyRecords.length > 0 && (
                  <>
                    <button
                      onClick={handleExportJson}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
                      title="Export JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onClearHistory();
                        setShowHistoryModal(false);
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      title="Clear History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {historyRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-500">No History Recorded</p>
                <p className="text-[11px]">
                  Real devices will be logged here once the router is connected and reporting active DHCP leases.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {historyRecords.map((rec) => (
                  <div key={rec.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {rec.customName || rec.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.ip} · {rec.mac}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rec.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REBOOT CONFIRM MODAL */}
      {showRebootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Reboot Netis Router
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              The router will restart. Network connection will drop for approximately 45 seconds. Confirm reboot?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRebootModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {strings.cancel}
              </button>
              <button
                type="button"
                onClick={handleTriggerReboot}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm"
              >
                Reboot Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
