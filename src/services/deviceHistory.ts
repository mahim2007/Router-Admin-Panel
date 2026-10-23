import { Device, DeviceHistoryRecord } from '../types/router';

const STORAGE_KEY = 'netis_wf2409e_verified_device_history_v2';
const CUSTOM_NAMES_KEY = 'netis_wf2409e_custom_names_v2';

export function getStoredDeviceHistory(): DeviceHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse device history from storage', e);
    return [];
  }
}

export function saveStoredDeviceHistory(records: DeviceHistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save device history to storage', e);
  }
}

export function getCustomDeviceNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomDeviceName(mac: string, customName: string): void {
  try {
    const names = getCustomDeviceNames();
    if (customName.trim()) {
      names[mac.toUpperCase()] = customName.trim();
    } else {
      delete names[mac.toUpperCase()];
    }
    localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(names));
  } catch (e) {
    console.error('Failed to save custom device name', e);
  }
}

/**
 * Synchronizes genuinely discovered devices from the router into history.
 * Never stores or invents fake historical devices.
 */
export function syncDevicesWithHistory(currentDevices: Device[], isLiveConnected: boolean): DeviceHistoryRecord[] {
  if (!isLiveConnected || currentDevices.length === 0) {
    return getStoredDeviceHistory();
  }

  const existingHistory = getStoredDeviceHistory();
  const historyMap = new Map<string, DeviceHistoryRecord>();
  const customNames = getCustomDeviceNames();

  existingHistory.forEach((rec) => {
    historyMap.set(rec.mac.toUpperCase(), rec);
  });

  const now = Date.now();
  const currentMacs = new Set<string>();

  currentDevices.forEach((dev) => {
    const macUpper = dev.mac.toUpperCase();
    currentMacs.add(macUpper);
    const custom = customNames[macUpper] || dev.customName;

    if (historyMap.has(macUpper)) {
      const existing = historyMap.get(macUpper)!;
      historyMap.set(macUpper, {
        ...existing,
        name: dev.name || existing.name,
        customName: custom || existing.customName,
        ip: dev.ip || existing.ip,
        lastSeen: now,
        isOnline: dev.isOnline,
        isBlocked: dev.isBlocked,
        connectionType: dev.connectionType,
      });
    } else {
      historyMap.set(macUpper, {
        id: dev.id || `dev-${macUpper.replace(/:/g, '')}`,
        mac: dev.mac,
        name: dev.name || 'Device',
        customName: custom,
        ip: dev.ip,
        firstSeen: now,
        lastSeen: now,
        isOnline: dev.isOnline,
        isBlocked: dev.isBlocked,
        connectionType: dev.connectionType,
      });
    }
  });

  const updatedHistory = Array.from(historyMap.values()).sort(
    (a, b) => b.lastSeen - a.lastSeen
  );

  saveStoredDeviceHistory(updatedHistory);
  return updatedHistory;
}

export function clearDeviceHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
  // Also clean up any legacy keys
  localStorage.removeItem('netis_wf2409e_device_history_v1');
}
