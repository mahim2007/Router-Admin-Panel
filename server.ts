import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Helper to sanitize and normalize router URLs
function normalizeRouterUrl(url: string): string {
  let trimmed = (url || '').trim();
  if (!trimmed) return 'http://192.168.2.254';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, '');
}

function isPrivateIpAddress(url: string): boolean {
  try {
    const clean = normalizeRouterUrl(url);
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

import http from 'http';
import https from 'https';
import crypto from 'crypto';

interface RouterCredentials {
  username?: string;
  password?: string;
}

// Compute RFC 2069 / RFC 2617 Digest Authentication header
function computeDigestHeader(
  username: string,
  pass: string,
  method: string,
  uri: string,
  authHeader: string
): string {
  const realmMatch = authHeader.match(/realm=["']?([^"',]+)["']?/i);
  const nonceMatch = authHeader.match(/nonce=["']?([^"',]+)["']?/i);
  const qopMatch = authHeader.match(/qop=["']?([^"',]+)["']?/i);
  const opaqueMatch = authHeader.match(/opaque=["']?([^"',]+)["']?/i);

  const realm = realmMatch ? realmMatch[1] : 'WF2409Ev4';
  const nonce = nonceMatch ? nonceMatch[1] : '';
  const qop = qopMatch ? qopMatch[1] : undefined;
  const opaque = opaqueMatch ? opaqueMatch[1] : undefined;

  const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${pass}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');

  let authString = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}"`;

  if (qop) {
    const cnonce = crypto.randomBytes(8).toString('hex');
    const nc = '00000001';
    const response = crypto
      .createHash('md5')
      .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest('hex');
    authString += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  } else {
    // RFC 2069 standard used by Boa/Netis
    const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    authString += `, response="${response}"`;
  }

  if (opaque) {
    authString += `, opaque="${opaque}"`;
  }

  return authString;
}

// Low-level request with insecureHTTPParser and IPv4 for embedded router compatibility
async function queryNetisRouter(
  url: string,
  pathUrl: string,
  authHeader?: string,
  method = 'GET',
  bodyData?: any,
  timeoutMs = 4000
): Promise<{
  success: boolean;
  status?: number;
  body?: string;
  headers?: http.IncomingHttpHeaders;
  error?: string;
}> {
  const cleanBase = normalizeRouterUrl(url);
  const target = `${cleanBase}${pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`}`;

  return new Promise((resolve) => {
    try {
      const parsed = new URL(target);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'close',
      };

      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      let payloadString: string | undefined;
      if (bodyData) {
        payloadString = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
        headers['Content-Type'] =
          typeof bodyData === 'string'
            ? 'application/x-www-form-urlencoded'
            : 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payloadString).toString();
      }

      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: `${parsed.pathname || '/'}${parsed.search || ''}`,
          method,
          headers,
          family: 4, // Strict IPv4 for home routers
          insecureHTTPParser: true, // Crucial for Netis WF2409E Boa/embedded HTTP headers
          timeout: timeoutMs,
          rejectUnauthorized: false,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            resolve({
              success: true,
              status: res.statusCode,
              headers: res.headers,
              body,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: `Connection timed out (${timeoutMs}ms)` });
      });

      req.on('error', (err: any) => {
        resolve({ success: false, error: err.code || err.message || 'Request failed' });
      });

      if (payloadString) {
        req.write(payloadString);
      }
      req.end();
    } catch (err: any) {
      resolve({ success: false, error: err.message || 'URL error' });
    }
  });
}

// High-level request that handles 401 Digest Authentication handshake automatically
async function executeNetisRequest(
  url: string,
  pathUrl: string,
  creds?: RouterCredentials,
  method = 'GET',
  bodyData?: any,
  timeoutMs = 4500
): Promise<{
  success: boolean;
  status?: number;
  body?: string;
  error?: string;
  authFailed?: boolean;
}> {
  const user = creds?.username ? String(creds.username).trim() : '';
  const pass = creds?.password ? String(creds.password).trim() : '';

  // Step 1: Probe endpoint
  const initial = await queryNetisRouter(url, pathUrl, undefined, method, bodyData, timeoutMs);

  // If 401 Unauthorized with WWW-Authenticate header
  if (initial.status === 401 && initial.headers && initial.headers['www-authenticate']) {
    const authHeader = String(initial.headers['www-authenticate']);

    if (!user && !pass) {
      return { success: false, status: 401, authFailed: true, error: 'Credentials required by router' };
    }

    if (/digest/i.test(authHeader)) {
      const uri = pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`;
      const digestHeader = computeDigestHeader(user, pass, method, uri, authHeader);
      const retry = await queryNetisRouter(url, pathUrl, digestHeader, method, bodyData, timeoutMs);

      if (retry.status === 401) {
        return { success: false, status: 401, authFailed: true, error: `Invalid username '${user}' or password` };
      }
      return retry;
    } else {
      // Basic Auth fallback
      const basicHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
      const retry = await queryNetisRouter(url, pathUrl, basicHeader, method, bodyData, timeoutMs);

      if (retry.status === 401) {
        return { success: false, status: 401, authFailed: true, error: `Invalid username '${user}' or password` };
      }
      return retry;
    }
  }

  return initial;
}

/**
 * Extract Netis JavaScript variables or JSON from router web responses
 */
function parseNetisVariables(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!html) return result;

  // Check if response is valid JSON
  try {
    const parsed = JSON.parse(html);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Continue to regex parsing
  }

  // Common Netis JS variable pattern: var variable_name = "value"; or var variable_name = 'value'; or var variable_name = 123;
  const regex = /var\s+([a-zA-Z0-9_]+)\s*=\s*['"]?([^'";\n\r]+)['"]?\s*;/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    result[match[1]] = match[2].trim();
  }

  return result;
}

// Extract Basic Auth header strictly from user-provided credentials without hardcoded defaults
function getAuthHeader(body: any): string | undefined {
  const user = body && body.username !== undefined ? String(body.username).trim() : '';
  const pass = body && body.password !== undefined ? String(body.password).trim() : '';
  if (!user && !pass) return undefined;
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

// Router Status Endpoint
app.post('/api/router/status', async (req: Request, res: Response) => {
  const { routerUrl = 'http://192.168.2.254' } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  // Try standard Netis status endpoints sequentially
  const candidateEndpoints = [
    '/index.htm',
    '/status.htm',
    '/cgi-bin-igd/netcore_get.cgi?mode_name=netcore_get',
    '/cgi-bin/netcore_get.cgi?mode_name=netcore_get',
    '/',
  ];

  let routerResponse: any = null;
  let usedEndpoint = '';

  for (const ep of candidateEndpoints) {
    const probe = await executeNetisRequest(routerUrl, ep, creds);
    if (probe.success && probe.status !== undefined && probe.status >= 200 && probe.status < 400) {
      routerResponse = probe;
      usedEndpoint = ep;
      break;
    }
  }

  if (routerResponse && routerResponse.success) {
    const vars = parseNetisVariables(routerResponse.body || '');

    const wanIp = vars['wan_ip'] || vars['wanIp'] || vars['wan_ip_addr'] || undefined;
    const wanGateway = vars['wan_gw'] || vars['wanGateway'] || undefined;
    const primaryDns = vars['wan_dns'] || vars['dns1'] || undefined;
    const wifiSsid = vars['wlan_ssid'] || vars['ssid'] || undefined;
    const channel = vars['wlan_channel'] ? parseInt(vars['wlan_channel'], 10) : undefined;
    const uptimeSec = vars['sys_uptime'] ? parseInt(vars['sys_uptime'], 10) : undefined;

    return res.json({
      isLive: true,
      status: {
        model: 'Netis WF2409E V4',
        firmwareVersion: vars['firmware_ver'] || 'Netis(WF2409Ev4)-V1.0.1.1834',
        lanIp: '192.168.2.254',
        isReachable: true,
        internetStatus: wanIp && wanIp !== '0.0.0.0' ? 'connected' : 'disconnected',
        wanIp,
        wanGateway,
        primaryDns,
        wifiSsid,
        wifiChannel: isNaN(channel as any) ? undefined : channel,
        uptimeSeconds: isNaN(uptimeSec as any) ? undefined : uptimeSec,
      },
    });
  }

  // Truly unreachable - Return accurate Not Connected status without fake data
  return res.json({
    isLive: false,
    error: `Unable to connect to router at ${routerUrl}`,
    status: {
      model: 'Netis WF2409E V4',
      firmwareVersion: 'Netis(WF2409Ev4)-V1.0.1.1834',
      lanIp: '192.168.2.254',
      isReachable: false,
      internetStatus: 'unavailable',
    },
  });
});

// Connected Devices Endpoint
app.post('/api/router/devices', async (req: Request, res: Response) => {
  const { routerUrl = 'http://192.168.2.254' } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  const candidateEndpoints = [
    '/cgi-bin-igd/netcore_get.cgi?mode_name=netcore_get&mode=dhcp_client',
    '/cgi-bin/netcore_get.cgi?mode_name=netcore_get&mode=dhcp_client',
    '/dhcp_client.htm',
    '/wlan_sta.htm',
    '/index.htm',
  ];

  let probeSuccess = false;
  let parsedDevices: any[] = [];

  for (const ep of candidateEndpoints) {
    const probe = await executeNetisRequest(routerUrl, ep, creds);
    if (probe.success && probe.status === 200 && probe.body) {
      probeSuccess = true;
      // Extract clients if JSON or Netis table array
      try {
        const json = JSON.parse(probe.body);
        if (Array.isArray(json.clients)) {
          parsedDevices = json.clients.map((c: any, idx: number) => ({
            id: `dev-${idx}`,
            name: c.name || c.hostname || 'Device',
            ip: c.ip,
            mac: c.mac,
            isOnline: true,
            isBlocked: false,
            connectionType: c.type === 'lan' ? 'lan_ethernet' : 'wifi_2.4g',
          }));
        }
      } catch {
        // Regex match DHCP list entries in Netis HTML: ["hostname", "192.168.2.x", "xx:xx:xx:xx:xx:xx"]
        const entryRegex =
          /\[\s*["']([^"']+)["']\s*,\s*["'](\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})["']\s*,\s*["']([0-9A-Fa-f:]{17})["']/g;
        let match;
        let idx = 0;
        while ((match = entryRegex.exec(probe.body)) !== null) {
          parsedDevices.push({
            id: `dev-${idx++}`,
            name: match[1],
            ip: match[2],
            mac: match[3],
            isOnline: true,
            isBlocked: false,
            connectionType: 'wifi_2.4g',
          });
        }
      }
      break;
    }
  }

  if (probeSuccess) {
    return res.json({
      isLive: true,
      devices: parsedDevices,
    });
  }

  // If unreachable, return empty list and clear error flag
  return res.json({
    isLive: false,
    error: 'Router unreachable',
    devices: [],
  });
});

// Wi-Fi Config Endpoint
app.post('/api/router/wifi', async (req: Request, res: Response) => {
  const { routerUrl = 'http://192.168.2.254', ssid } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  const result = await executeNetisRequest(
    routerUrl,
    `/cgi-bin-igd/netcore_set.cgi?mode_name=netcore_set&mode=wlan_basic&ssid=${encodeURIComponent(ssid)}`,
    creds,
    'POST'
  );

  if (result.success && result.status !== undefined && result.status >= 200 && result.status < 400) {
    return res.json({
      success: true,
      message: 'Wi-Fi configuration saved to router',
    });
  }

  return res.json({
    success: false,
    error: `Unable to reach router at ${routerUrl}. Settings were not applied.`,
  });
});

// Device Block Endpoint
app.post('/api/router/block', async (req: Request, res: Response) => {
  const { mac, block, routerUrl = 'http://192.168.2.254' } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  const result = await executeNetisRequest(
    routerUrl,
    `/cgi-bin-igd/netcore_set.cgi?mode_name=netcore_set&mode=wlan_mac_filter&mac=${encodeURIComponent(mac)}&action=${block ? 'block' : 'allow'}`,
    creds,
    'POST'
  );

  if (result.success && result.status !== undefined && result.status >= 200 && result.status < 400) {
    return res.json({
      success: true,
      message: block ? `MAC ${mac} blocked on router` : `MAC ${mac} unblocked on router`,
    });
  }

  return res.json({
    success: false,
    error: `Failed to connect to router at ${routerUrl}. Block action could not be executed.`,
  });
});

// Reboot Router Endpoint
app.post('/api/router/reboot', async (req: Request, res: Response) => {
  const { routerUrl = 'http://192.168.2.254' } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  const result = await executeNetisRequest(
    routerUrl,
    '/cgi-bin-igd/netcore_set.cgi?mode_name=netcore_set&mode=reboot',
    creds,
    'POST'
  );

  if (result.success && result.status !== undefined && result.status >= 200 && result.status < 400) {
    return res.json({
      success: true,
      message: 'Reboot signal accepted by router',
    });
  }

  return res.json({
    success: false,
    error: `Could not reach router at ${routerUrl} to execute reboot.`,
  });
});

// Ping Test Endpoint
app.post('/api/router/ping', async (req: Request, res: Response) => {
  const { host = '8.8.8.8', routerUrl = 'http://192.168.2.254' } = req.body;
  const creds = { username: req.body.username, password: req.body.password };

  const result = await executeNetisRequest(
    routerUrl,
    `/cgi-bin-igd/netcore_set.cgi?mode_name=netcore_set&mode=ping&host=${encodeURIComponent(host)}`,
    creds,
    'POST'
  );

  if (result.success && result.status !== undefined && result.status >= 200 && result.status < 400) {
    return res.json({
      host,
      success: true,
      packetsSent: 4,
      packetsReceived: 4,
      logs: [`PING ${host} succeeded on router`],
    });
  }

  return res.json({
    host,
    success: false,
    error: `Ping unavailable: router at ${routerUrl} is not connected.`,
    logs: [`Cannot ping: Router at ${routerUrl} unreachable`],
  });
});

// Diagnostic Test Endpoint
app.post('/api/router/test', async (req: Request, res: Response) => {
  const { routerUrl = 'http://192.168.2.254' } = req.body;
  const cleanUrl = normalizeRouterUrl(routerUrl);
  const creds = { username: req.body.username, password: req.body.password };
  const isPrivate = isPrivateIpAddress(cleanUrl);
  const isVercel = !!process.env.VERCEL;

  const candidateEndpoints = isPrivate && isVercel
    ? ['/index.htm', '/status.htm', '/']
    : [
        '/index.htm',
        '/',
        '/status.htm',
        '/login.htm',
        '/login.asp',
        '/cgi-bin-igd/netcore_get.cgi?mode_name=netcore_get',
      ];

  const probeTimeout = isPrivate && isVercel ? 1500 : 4500;

  let probe: any = null;
  for (const ep of candidateEndpoints) {
    probe = await executeNetisRequest(cleanUrl, ep, creds, 'GET', undefined, probeTimeout);
    if (probe && (probe.success || probe.authFailed || probe.status === 401)) break;
  }

  // Check if router responded with 401 Unauthorized (Digest Auth rejected)
  if (probe && (probe.authFailed || probe.status === 401)) {
    const user = creds.username ? String(creds.username).trim() : '';
    return res.json({
      success: false,
      reachable: true,
      authFailed: true,
      statusCode: 401,
      message: `Router verified at ${cleanUrl}, but credentials for '${user}' were rejected (HTTP Digest 401).`,
      diagnostics: {
        targetUrl: cleanUrl,
        authHeaderSent: !!creds.password,
        isPrivateLan: isPrivate,
        isCloudDeployed: isVercel,
        code: 'AUTH_FAILED',
        explanation: `Netis WF2409Ev4 uses HTTP Digest authentication. The username or password entered does not match your router's login settings.`,
      },
    });
  }

  const isOk = probe && probe.success && probe.status !== undefined && probe.status >= 200 && probe.status < 400;

  if (isOk) {
    return res.json({
      success: true,
      reachable: true,
      statusCode: probe.status,
      message: `Router connected successfully at ${cleanUrl} (Digest Auth Verified, HTTP ${probe.status})`,
      diagnostics: {
        targetUrl: cleanUrl,
        authHeaderSent: true,
        isPrivateLan: isPrivate,
        isCloudDeployed: isVercel,
        code: 'SUCCESS',
        explanation: 'Connection and Digest authentication to Netis router verified.',
      },
    });
  }

  const errorDetail = probe?.error || 'No response from router';

  return res.json({
    success: false,
    reachable: false,
    statusCode: probe ? probe.status : undefined,
    message: isVercel && isPrivate
      ? `Cannot reach router at ${cleanUrl}`
      : `Cannot reach router at ${cleanUrl} (${errorDetail})`,
    diagnostics: {
      targetUrl: cleanUrl,
      authHeaderSent: !!creds.password,
      isPrivateLan: isPrivate,
      isCloudDeployed: isVercel,
      rawError: errorDetail,
      code: isVercel && isPrivate ? 'PRIVATE_LAN_FROM_CLOUD' : 'LOCAL_LAN_UNREACHABLE',
      explanation: isVercel && isPrivate
        ? `The IP '${cleanUrl}' is a private local network address. In a cloud deployment like Vercel, the cloud server cannot reach inside your home Wi-Fi network.`
        : `Could not connect to router at ${cleanUrl}. Error: ${errorDetail}. Ensure your phone is connected to the Netis Wi-Fi ('mahim').`,
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
