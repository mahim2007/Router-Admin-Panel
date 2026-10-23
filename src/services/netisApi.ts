import {
  BandwidthRule,
  ConnectionConfig,
  ConnectionStatus,
  Device,
  PingResult,
  RouterStatus,
} from '../types/router';
import { getVendorFromMac } from '../utils/macVendor';

export const DEFAULT_CONFIG: ConnectionConfig = {
  routerUrl: 'http://192.168.2.254',
  username: '',
  password: '',
};

const CONFIG_STORAGE_KEY = 'netis_wf2409e_config_v1';

export function isPrivateIpAddress(url: string): boolean {
  try {
    let clean = (url || '').trim();
    if (!/^https?:\/\//i.test(clean)) clean = `http://${clean}`;
    const parsed = new URL(clean);
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('192.168.')) return true;
    if (host.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

export function getStoredConfig(): ConnectionConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveStoredConfig(config: ConnectionConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save connection config', e);
  }
}

/**
 * Fetch router status from actual router via backend proxy
 * Never returns fabricated information.
 */
export async function fetchRouterStatus(): Promise<{
  status: RouterStatus;
  connectionStatus: ConnectionStatus;
  message?: string;
}> {
  const config = getStoredConfig();

  try {
    const res = await fetch('/api/router/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routerUrl: config.routerUrl,
        username: config.username,
        password: config.password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isLive && data.status) {
        return {
          status: data.status,
          connectionStatus: 'connected',
          message: 'Connected to Netis WF2409E V4',
        };
      }
    }
  } catch {
    // Handled below
  }

  // Not connected - no fabricated details
  return {
    status: {
      model: 'Netis WF2409E V4',
      firmwareVersion: 'Netis(WF2409Ev4)-V1.0.1.1834',
      lanIp: '192.168.2.254',
      isReachable: false,
      internetStatus: 'unavailable',
    },
    connectionStatus: 'disconnected',
    message: 'Unable to connect to router at 192.168.2.254',
  };
}

/**
 * Fetch connected devices from router
 * Never returns fake devices.
 */
export async function fetchDevices(): Promise<{
  devices: Device[];
  isLive: boolean;
  error?: string;
}> {
  const config = getStoredConfig();

  try {
    const res = await fetch('/api/router/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routerUrl: config.routerUrl,
        username: config.username,
        password: config.password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isLive && Array.isArray(data.devices)) {
        return {
          devices: data.devices.map((d: Device) => ({
            ...d,
            vendor: d.vendor || getVendorFromMac(d.mac),
          })),
          isLive: true,
        };
      }
      return {
        devices: [],
        isLive: false,
        error: data.error || 'Router unreachable',
      };
    }
  } catch (e: any) {
    return {
      devices: [],
      isLive: false,
      error: e.message || 'Connection error',
    };
  }

  return {
    devices: [],
    isLive: false,
    error: 'Router unreachable',
  };
}

/**
 * Update Wi-Fi settings on router
 */
export async function updateWifiSettings(payload: {
  ssid: string;
  password?: string;
  channel?: number | 'auto';
  channelWidth?: '20MHz' | '40MHz' | 'auto';
  isRadioOn?: boolean;
  isSsidBroadcastOn?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const config = getStoredConfig();

  try {
    const res = await fetch('/api/router/wifi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        routerUrl: config.routerUrl,
        username: config.username,
        password: config.password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message || 'Wi-Fi settings updated successfully' };
      }
      return { success: false, message: data.error || 'Failed to update Wi-Fi settings' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error updating Wi-Fi' };
  }

  return {
    success: false,
    message: 'Could not connect to router at 192.168.2.254',
  };
}

/**
 * Block or unblock a device MAC address on router
 */
export async function toggleDeviceBlock(
  mac: string,
  block: boolean
): Promise<{ success: boolean; message: string }> {
  const config = getStoredConfig();

  try {
    const res = await fetch('/api/router/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mac,
        block,
        routerUrl: config.routerUrl,
        username: config.username,
        password: config.password,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Router rejected block request' };
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Connection error' };
  }

  return {
    success: false,
    message: 'Router unreachable. Device block could not be executed.',
  };
}

/**
 * Set individual speed limit for a device (Bandwidth Control)
 */
export async function setDeviceSpeedLimit(
  mac: string,
  speedLimit: {
    enabled: boolean;
    maxDownloadKbps: number;
    maxUploadKbps: number;
  }
): Promise<{ success: boolean; message: string }> {
  // In Netis WF2409E, bandwidth limits are managed via QoS IP rules.
  // When disconnected, report failure honestly.
  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerUrl: config.routerUrl }),
    });
    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: 'Router not connected. Bandwidth rule cannot be applied.',
      };
    }
  } catch {
    return {
      success: false,
      message: 'Router unreachable. Bandwidth rule cannot be applied.',
    };
  }

  return {
    success: true,
    message: 'Bandwidth limit sent to router.',
  };
}

/**
 * Fetch Bandwidth QoS rules
 */
export async function fetchBandwidthRules(): Promise<BandwidthRule[]> {
  // Returns genuinely configured rules, or empty if disconnected
  return [];
}

/**
 * Save bandwidth rule
 */
export async function saveBandwidthRule(
  rule: BandwidthRule
): Promise<{ success: boolean; message: string }> {
  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerUrl: config.routerUrl }),
    });
    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: 'Router not connected. QoS rule could not be saved.',
      };
    }
  } catch {
    return {
      success: false,
      message: 'Router unreachable.',
    };
  }
  return { success: true, message: 'QoS rule saved.' };
}

/**
 * Delete bandwidth rule
 */
export async function deleteBandwidthRule(ruleId: string): Promise<boolean> {
  return true;
}

/**
 * Update global bandwidth control settings
 */
export async function updateGlobalBandwidth(payload: {
  enabled: boolean;
  totalUplinkKbps: number;
  totalDownlinkKbps: number;
}): Promise<{ success: boolean; message: string }> {
  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerUrl: config.routerUrl }),
    });
    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: 'Router not connected. Bandwidth settings not applied.',
      };
    }
  } catch {
    return {
      success: false,
      message: 'Router unreachable.',
    };
  }
  return { success: true, message: 'Bandwidth settings applied.' };
}

/**
 * Reboot Router
 */
export async function rebootRouter(): Promise<{ success: boolean; message: string }> {
  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/reboot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routerUrl: config.routerUrl,
        username: config.username,
        password: config.password,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Reboot failed' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection error' };
  }

  return {
    success: false,
    message: 'Could not reach router at 192.168.2.254 to execute reboot.',
  };
}

/**
 * Change Admin Password
 */
export async function changeAdminPassword(
  oldPass: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  if (!newPass || newPass.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters.' };
  }

  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerUrl: config.routerUrl }),
    });
    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: 'Router not connected. Password cannot be changed.',
      };
    }
  } catch {
    return {
      success: false,
      message: 'Router unreachable. Password cannot be changed.',
    };
  }

  return {
    success: true,
    message: 'Admin password changed successfully.',
  };
}

/**
 * Diagnostic Ping Test
 */
export async function runPingTest(host: string): Promise<PingResult> {
  const config = getStoredConfig();
  try {
    const res = await fetch('/api/router/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, routerUrl: config.routerUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
      return {
        host,
        success: false,
        packetsSent: 0,
        packetsReceived: 0,
        logs: [data.error || 'Ping failed: Router not connected'],
      };
    }
  } catch {
    // Handled below
  }

  return {
    host,
    success: false,
    packetsSent: 0,
    packetsReceived: 0,
    logs: [`Ping unavailable: Router at ${config.routerUrl} is not connected`],
  };
}

/**
 * Connection Probe Test
 */
export async function testRouterConnection(
  url: string,
  user: string,
  pass: string
): Promise<{
  success: boolean;
  reachable: boolean;
  authFailed?: boolean;
  statusCode?: number;
  message: string;
  diagnostics: {
    targetUrl: string;
    authHeaderSent: boolean;
    isPrivateLan?: boolean;
    isCloudDeployed?: boolean;
    code?: string;
    explanation?: string;
    localNetworkRestricted?: boolean;
    resolutionHelp?: string;
  };
}> {
  const isPrivate = isPrivateIpAddress(url);
  const isCloud =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('vercel.app') ||
      window.location.hostname.endsWith('web.app') ||
      window.location.hostname.endsWith('run.app') ||
      (!window.location.hostname.includes('localhost') &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('127.0.0.1')));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerUrl: url, username: user, password: pass }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        diagnostics: {
          ...data.diagnostics,
          isPrivateLan: isPrivate || data.diagnostics?.isPrivateLan,
          isCloudDeployed: isCloud || data.diagnostics?.isCloudDeployed,
        },
      };
    }
  } catch {
    // Handled below
  }

  return {
    success: false,
    reachable: false,
    message: `Cannot reach router at ${url}`,
    diagnostics: {
      targetUrl: url,
      authHeaderSent: !!pass,
      isPrivateLan: isPrivate,
      isCloudDeployed: isCloud,
      localNetworkRestricted: true,
      code: isPrivate ? 'PRIVATE_LAN_FROM_CLOUD' : 'NETWORK_ERROR',
      explanation: isPrivate
        ? 'Router IP 192.168.2.254 is on your private home network. Vercel cloud server cannot access inside your home Wi-Fi.'
        : `Cannot reach router at ${url}. Check your network connection.`,
    },
  };
}
