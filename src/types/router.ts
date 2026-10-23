export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface Device {
  id: string;
  name: string;
  customName?: string;
  ip: string;
  mac: string;
  isOnline: boolean;
  isBlocked: boolean;
  connectionType: 'wifi_2.4g' | 'lan_ethernet';
  signalStrength?: number;
  firstSeen?: number;
  lastSeen?: number;
  vendor?: string;
  speedLimit?: {
    enabled: boolean;
    maxDownloadKbps: number;
    maxUploadKbps: number;
  };
}

export interface RouterStatus {
  model: string;
  firmwareVersion: string;
  hardwareVersion?: string;
  isReachable: boolean;
  uptimeSeconds?: number;
  
  // WAN details
  internetStatus: 'connected' | 'disconnected' | 'unavailable';
  wanIp?: string;
  wanGateway?: string;
  wanNetmask?: string;
  primaryDns?: string;
  secondaryDns?: string;
  wanMac?: string;
  connectionType?: 'DHCP' | 'PPPoE' | 'Static';

  // LAN details
  lanIp: string;
  lanNetmask?: string;
  lanMac?: string;

  // Wireless details
  wifiSsid?: string;
  wifiSecurity?: 'WPA2-PSK' | 'WPA/WPA2-PSK' | 'OPEN';
  wifiChannel?: number | 'auto';
  wifiChannelWidth?: '20MHz' | '40MHz' | 'auto';
  isRadioOn?: boolean;
  isSsidBroadcastOn?: boolean;
  wirelessMode?: string;

  // Bandwidth control (QoS)
  bandwidthControlEnabled?: boolean;
  totalUplinkKbps?: number;
  totalDownlinkKbps?: number;
}

export interface BandwidthRule {
  id: string;
  ipStart: string;
  ipEnd: string;
  minUploadKbps: number;
  maxUploadKbps: number;
  minDownloadKbps: number;
  maxDownloadKbps: number;
  comment: string;
  enabled: boolean;
}

export interface ConnectionConfig {
  routerUrl: string; // "http://192.168.2.254"
  username: string; // e.g. "admin"
  password?: string;
}

export interface DeviceHistoryRecord {
  id: string;
  mac: string;
  name: string;
  customName?: string;
  ip: string;
  firstSeen: number;
  lastSeen: number;
  isOnline: boolean;
  isBlocked: boolean;
  connectionType: 'wifi_2.4g' | 'lan_ethernet';
}

export interface PingResult {
  host: string;
  success: boolean;
  packetsSent: number;
  packetsReceived: number;
  avgLatencyMs?: number;
  logs: string[];
}
