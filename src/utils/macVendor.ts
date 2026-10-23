/**
 * Lookup common vendor name based on MAC address OUI (first 3 octets)
 */
const VENDOR_PREFIXES: Record<string, string> = {
  // Apple
  '00:03:93': 'Apple',
  '00:0A:95': 'Apple',
  '00:10:FA': 'Apple',
  '00:1C:B3': 'Apple',
  '00:26:08': 'Apple',
  '00:26:BB': 'Apple',
  '04:D3:CF': 'Apple',
  '18:65:90': 'Apple',
  '28:CF:E9': 'Apple',
  '3C:07:54': 'Apple',
  '40:6c:8f': 'Apple',
  '60:f8:1d': 'Apple',
  '78:7b:8a': 'Apple',
  '88:66:a5': 'Apple',
  'a4:83:e7': 'Apple',
  'dc:a9:04': 'Apple',
  'f0:18:98': 'Apple',
  'f4:5c:89': 'Apple',

  // Samsung
  '00:07:AB': 'Samsung',
  '00:12:47': 'Samsung',
  '00:15:99': 'Samsung',
  '00:1E:E2': 'Samsung',
  '08:EE:8B': 'Samsung',
  '24:4B:03': 'Samsung',
  '30:CD:A7': 'Samsung',
  '44:91:60': 'Samsung',
  '50:85:69': 'Samsung',
  '84:25:DB': 'Samsung',
  '90:F1:AA': 'Samsung',
  'A8:06:00': 'Samsung',
  'BC:72:B9': 'Samsung',
  'CC:07:AB': 'Samsung',
  'F4:7B:5E': 'Samsung',

  // Xiaomi / POCO / Redmi
  '00:9E:C8': 'Xiaomi',
  '04:CF:8C': 'Xiaomi',
  '14:F6:5A': 'Xiaomi',
  '28:6C:07': 'Xiaomi',
  '34:80:B3': 'Xiaomi',
  '50:64:2B': 'Xiaomi',
  '64:CC:2E': 'Xiaomi',
  '7C:49:EB': 'Xiaomi',
  'AC:C1:EE': 'Xiaomi',
  'C8:47:8C': 'Xiaomi',
  'D4:97:0B': 'Xiaomi',
  'F8:A4:5E': 'Xiaomi',

  // OnePlus / Oppo / Realme
  '2C:59:8A': 'OnePlus',
  '38:F9:D3': 'OnePlus',
  '54:6C:0E': 'OnePlus',
  '94:65:2D': 'OnePlus',
  '1C:66:AA': 'OPPO',
  '74:23:44': 'OPPO',
  'C0:A5:DD': 'Realme',

  // Intel
  '00:02:B3': 'Intel',
  '00:03:47': 'Intel',
  '00:04:23': 'Intel',
  '00:0E:35': 'Intel',
  '00:13:02': 'Intel',
  '00:1B:21': 'Intel',
  '34:13:E8': 'Intel',
  '48:51:B7': 'Intel',
  '68:05:71': 'Intel',
  '80:86:F2': 'Intel',
  'A4:4C:C8': 'Intel',

  // Realtek
  '00:00:20': 'Realtek',
  '00:07:70': 'Realtek',
  '00:08:4F': 'Realtek',
  '00:0A:CD': 'Realtek',
  '00:E0:4C': 'Realtek',
  '52:54:00': 'Realtek / QEMU',

  // TP-Link
  '00:0A:EB': 'TP-Link',
  '00:1D:0F': 'TP-Link',
  '14:CC:20': 'TP-Link',
  '30:DE:4B': 'TP-Link',
  '50:C7:BF': 'TP-Link',
  '60:E3:27': 'TP-Link',
  '98:DA:C4': 'TP-Link',
  'B0:95:75': 'TP-Link',
  'C0:25:E9': 'TP-Link',
  'C0:4A:00': 'TP-Link',

  // Netis / Netcore
  '00:11:32': 'Netcore/Netis',
  '08:40:F3': 'Netis System',
  '44:33:4C': 'Netis Technology',
  '64:51:7E': 'Netis System',

  // Espressif (IoT smart devices)
  '24:0A:C4': 'Espressif (Smart IoT)',
  '24:62:AB': 'Espressif (Smart IoT)',
  '30:AE:A4': 'Espressif (Smart IoT)',
  '84:0D:8E': 'Espressif (Smart IoT)',
  '84:F3:EB': 'Espressif (Smart IoT)',
  'A4:CF:12': 'Espressif (Smart IoT)',
  'BC:DD:C2': 'Espressif (Smart IoT)',
  'CC:50:E3': 'Espressif (Smart IoT)',

  // Google
  '00:1A:11': 'Google',
  '3C:5A:B4': 'Google (Pixel/Nest)',
  '54:60:09': 'Google',
  '94:EB:CD': 'Google (Chromecast)',
  'F4:F5:D8': 'Google',

  // Huawei
  '00:18:82': 'Huawei',
  '00:1E:10': 'Huawei',
  '00:25:9E': 'Huawei',
  '20:F3:A3': 'Huawei',
  '48:46:FB': 'Huawei',
  'AC:E2:15': 'Huawei',

  // Amazon
  '00:FC:8B': 'Amazon (Echo/Fire)',
  '38:F7:3D': 'Amazon',
  '44:65:0D': 'Amazon',
  '68:37:E9': 'Amazon',
  '74:75:48': 'Amazon',
  'AC:63:BE': 'Amazon',
};

export function getVendorFromMac(mac: string): string {
  if (!mac || mac.length < 8) return 'Generic Device';
  const prefix = mac.slice(0, 8).toUpperCase();
  return VENDOR_PREFIXES[prefix] || 'Connected Device';
}
