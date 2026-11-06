import { sendVercelTunnelRequest } from './wsm-proxy';

let wsWorker: Worker | null = null;
let directWs: WebSocket | null = null;
let messageIdCounter = 0;
const pendingRequests = new Map<
  number,
  { resolve: (data: any) => void; reject: (err: Error) => void }
>();

let isConnected = false;

export function initWSProxy() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    if (window.Worker) {
      wsWorker = new Worker(new URL('../workers/proxyStream.worker.ts', import.meta.url), {
        type: 'module',
      });

      wsWorker.onmessage = (e) => {
        const { type, data, status, id, error } = e.data;
        if (status === 'connected') {
          isConnected = true;
          console.log('[WS Worker Proxy] Off-thread worker connected successfully');
        } else if (status === 'disconnected') {
          isConnected = false;
        }

        if (type === 'MESSAGE' && data) {
          if (data.id && pendingRequests.has(data.id)) {
            const { resolve, reject } = pendingRequests.get(data.id)!;
            if (data.error) {
              reject(new Error(data.error));
            } else {
              resolve(data.payload);
            }
            pendingRequests.delete(data.id);
          }
        } else if (type === 'ERROR' && id && pendingRequests.has(id)) {
          // Fallback to Vercel Tunnel
          const req = pendingRequests.get(id)!;
          fallbackToVercelTunnel(id, req.resolve, req.reject, { type: 'unknown' });
        }
      };

      wsWorker.postMessage({ action: 'INIT', hostUrl: wsUrl });
      return;
    }
  } catch (e) {
    console.warn('[WS Proxy] Web Worker init fallback to main-thread WS:', e);
  }

  // Fallback to direct WebSocket
  initDirectWS(wsUrl);
}

function initDirectWS(wsUrl: string) {
  if (directWs && (directWs.readyState === WebSocket.OPEN || directWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    directWs = new WebSocket(wsUrl);

    directWs.onopen = () => {
      isConnected = true;
      console.log('[Direct WS Proxy] Main thread websocket connected');
    };

    directWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id && pendingRequests.has(data.id)) {
          const { resolve, reject } = pendingRequests.get(data.id)!;
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.payload);
          }
          pendingRequests.delete(data.id);
        }
      } catch (err) {
        console.error('[Direct WS] Parse error:', err);
      }
    };

    directWs.onclose = () => {
      isConnected = false;
      directWs = null;
      setTimeout(() => initDirectWS(wsUrl), 3000);
    };
  } catch (err) {
    console.error('[Direct WS] Connection error:', err);
  }
}

async function fallbackToVercelTunnel(
  id: number,
  resolve: (data: any) => void,
  reject: (err: Error) => void,
  requestPayload: any
) {
  try {
    const res = await sendVercelTunnelRequest(requestPayload.type, requestPayload);
    if (res && res.payload) {
      resolve(res.payload);
    } else {
      resolve(res);
    }
  } catch (err: any) {
    reject(new Error('Vercel Tunnel fallback failed: ' + err.message));
  } finally {
    pendingRequests.delete(id);
  }
}

export function sendWSRequest(type: string, payload: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter;
    pendingRequests.set(id, { resolve, reject });

    const requestPayload = { type, id, ...payload };

    if (wsWorker && isConnected) {
      wsWorker.postMessage({ action: 'SEND', payload: requestPayload });
    } else if (directWs && directWs.readyState === WebSocket.OPEN) {
      directWs.send(JSON.stringify(requestPayload));
    } else {
      // Direct Vercel Serverless Tunnel Fallback
      fallbackToVercelTunnel(id, resolve, reject, requestPayload);
    }

    // Safety timeout after 15 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        fallbackToVercelTunnel(id, resolve, reject, requestPayload);
      }
    }, 15000);
  });
}
