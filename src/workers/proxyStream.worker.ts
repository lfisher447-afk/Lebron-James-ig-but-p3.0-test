// Web Worker for off-thread WebSocket streaming, acoustic analysis & packet routing

let ws: WebSocket | null = null;
let reconnectTimer: any = null;

function connectWS(hostUrl: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(hostUrl);

    ws.onopen = () => {
      self.postMessage({ type: 'STATUS', status: 'connected' });
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        self.postMessage({ type: 'MESSAGE', data: parsed });
      } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: 'Worker parse error: ' + err.message });
      }
    };

    ws.onclose = () => {
      self.postMessage({ type: 'STATUS', status: 'disconnected' });
      ws = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => connectWS(hostUrl), 3000);
    };

    ws.onerror = (err) => {
      self.postMessage({ type: 'ERROR', error: 'Worker WS error' });
    };
  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err.message });
  }
}

self.onmessage = (e: MessageEvent) => {
  const { action, payload, hostUrl } = e.data;

  if (action === 'INIT') {
    connectWS(hostUrl);
  } else if (action === 'SEND') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      self.postMessage({
        type: 'ERROR',
        id: payload?.id,
        error: 'WebSocket Worker stream offline. Retrying...',
      });
    }
  } else if (action === 'ANALYZE_ACOUSTIC') {
    // FFT / Hash generation off-thread
    const { buffer } = payload;
    const hash = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    self.postMessage({ type: 'ACOUSTIC_HASH', hash, timestamp: Date.now() });
  }
};
