/**
 * Worker Stream Module (WSM) - Secure Off-Thread Network & Stream Engine
 * Application Self-Protection (RASP), Anti-Tampering, Ephemeral Crypto,
 * Timing Anti-Debugging, and Resilient Connection Multiplexing.
 */

'use strict';

(function (globalScope) {
  // =========================================================================
  // 1. GLOBAL SCOPE INTEGRITY LOCK & ANTI-MONKEY-PATCHING
  // =========================================================================
  
  const NativePrimitives = (function () {
    const freeze = Object.freeze;
    const seal = Object.seal;
    const now = performance.now.bind(performance);
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    const SubtleCrypto = crypto.subtle;
    
    // Validate that essential APIs haven't been hooked or overridden
    const isNative = (fn) => typeof fn === 'function' && /\[native code\]/.test(Function.prototype.toString.call(fn));
    
    const integrityChecks = {
      hasSubtle: !!SubtleCrypto,
      nativeCrypto: isNative(crypto.getRandomValues),
      nativeNow: isNative(performance.now),
    };

    return freeze({
      freeze,
      seal,
      now,
      getRandomValues,
      SubtleCrypto,
      integrityChecks,
    });
  })();

  if (!NativePrimitives.integrityChecks.nativeCrypto || !NativePrimitives.integrityChecks.nativeNow) {
    self.postMessage({ type: 'WSM_INTEGRITY_ALERT', code: 'CRITICAL_SCOPE_TAMPERING_DETECTED' });
    return;
  }

  // =========================================================================
  // 2. TIMING-BASED ANTI-DEBUGGING & ANOMALY DETECTION ENGINE
  // =========================================================================

  class AntiDebugGuard {
    constructor(thresholdMs = 100) {
      this.thresholdMs = thresholdMs;
      this.lastCheck = NativePrimitives.now();
      this.anomalyCount = 0;
      this.maxAnomalies = 3;
    }

    auditExecutionDelta() {
      const current = NativePrimitives.now();
      const delta = current - this.lastCheck;
      this.lastCheck = current;

      // Delta exceeding threshold indicates thread suspension (breakpoint/debugger step)
      if (delta > this.thresholdMs) {
        this.anomalyCount++;
        if (this.anomalyCount >= this.maxAnomalies) {
          this.triggerSanitization();
          return false;
        }
      } else {
        this.anomalyCount = Math.max(0, this.anomalyCount - 1);
      }
      return true;
    }

    triggerSanitization() {
      self.postMessage({
        type: 'WSM_SECURITY_EVENT',
        event: 'THREAD_SUSPENSION_DETECTED',
        timestamp: Date.now(),
      });
    }
  }

  const guard = new AntiDebugGuard(150);

  // =========================================================================
  // 3. CRYPTOGRAPHIC ENVELOPE & GALOIS LFSR BITWISE MASKING
  // =========================================================================

  class BitwiseMaskEngine {
    /**
     * Galois 32-bit Linear Feedback Shift Register for dynamic stream obfuscation
     */
    static transform(arrayBuffer, seed = 0x811c9dc5) {
      const input = new Uint8Array(arrayBuffer);
      const output = new Uint8Array(input.length);
      let lfsr = seed >>> 0;

      for (let i = 0; i < input.length; i++) {
        lfsr = (lfsr >>> 1) ^ (-(lfsr & 1) & 0xd0000001);
        output[i] = input[i] ^ (lfsr & 0xff) ^ (i & 0xff);
      }
      return output.buffer;
    }
  }

  class EphemeralCryptoManager {
    constructor() {
      this.sessionKey = null;
      this.keyRawHex = null;
    }

    async generateSessionKey() {
      this.sessionKey = await NativePrimitives.SubtleCrypto.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const raw = await NativePrimitives.SubtleCrypto.exportKey('raw', this.sessionKey);
      this.keyRawHex = Array.from(new Uint8Array(raw))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return this.keyRawHex;
    }

    async encryptPayload(dataBuffer) {
      if (!this.sessionKey) await this.generateSessionKey();
      const iv = new Uint8Array(12);
      NativePrimitives.getRandomValues(iv);

      const cipherBuffer = await NativePrimitives.SubtleCrypto.encrypt(
        { name: 'AES-GCM', iv },
        this.sessionKey,
        dataBuffer
      );

      return { cipherBuffer, iv };
    }

    async decryptPayload(cipherBuffer, iv) {
      if (!this.sessionKey) throw new Error('NO_ACTIVE_SESSION_KEY');
      return await NativePrimitives.SubtleCrypto.decrypt(
        { name: 'AES-GCM', iv },
        this.sessionKey,
        cipherBuffer
      );
    }
  }

  const cryptoEngine = new EphemeralCryptoManager();

  // =========================================================================
  // 4. TRAFFIC SHAPING & NOISE GENERATION (ENTROPY PADDING)
  // =========================================================================

  class TrafficShaper {
    /**
     * Box-Muller Gaussian noise generation for natural timing distribution
     */
    static getGaussianJitter(meanMs, stdDevMs) {
      let u1 = 0, u2 = 0;
      while (u1 === 0) u1 = Math.random();
      while (u2 === 0) u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return Math.max(100, Math.round(z0 * stdDevMs + meanMs));
    }

    static generateDummyPadding(minBytes = 32, maxBytes = 128) {
      const size = Math.floor(minBytes + Math.random() * (maxBytes - minBytes));
      const padding = new Uint8Array(size);
      NativePrimitives.getRandomValues(padding);
      return padding;
    }
  }

  // =========================================================================
  // 5. RESILIENT WSM ENGINE & MULTIPLEXED STREAM MANAGER
  // =========================================================================

  class WSMSecureSession {
    constructor() {
      this.sessionId = 'wsm_sec_' + Math.random().toString(36).substring(2, 11);
      this.state = 'DISCONNECTED';
      this.ws = null;
      this.url = null;
      this.outboundQueue = [];
      this.reconnectAttempts = 0;
      this.maxReconnects = 10;
      this.keepAliveTimer = null;
      this.sequence = 0;

      // Fingerprint profile defaults
      this.activeProfile = NativePrimitives.freeze({
        ja3: '771,4865-4866-4867-49195-49199,0-23-65281-10-11,29-23-24,0',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
          'Sec-Ch-Ua-Platform': '"Windows"',
        },
      });
    }

    connect(targetUrl) {
      if (!guard.auditExecutionDelta()) return;

      this.url = targetUrl || this.url;
      if (!this.url) {
        this.state = 'CONNECTED';
        this.startAdaptiveHeartbeat();
        self.postMessage({ type: 'WSM_READY', session: this.getTelemetry() });
        return;
      }

      this.state = 'CONNECTING';
      self.postMessage({ type: 'WSM_STATE_CHANGE', state: this.state });

      try {
        if (typeof WebSocket !== 'undefined') {
          this.ws = new WebSocket(this.url);
          this.ws.binaryType = 'arraybuffer';

          this.ws.onopen = () => {
            this.state = 'CONNECTED';
            this.reconnectAttempts = 0;
            this.startAdaptiveHeartbeat();
            this.flushQueue();
            self.postMessage({ type: 'WSM_READY', session: this.getTelemetry() });
          };

          this.ws.onmessage = (event) => {
            this.handleInbound(event.data);
          };

          this.ws.onerror = () => {
            self.postMessage({ type: 'WSM_ERROR', code: 'SOCKET_ERROR' });
          };

          this.ws.onclose = () => {
            this.handleDisconnect();
          };
        } else {
          this.state = 'CONNECTED';
          this.startAdaptiveHeartbeat();
          self.postMessage({ type: 'WSM_READY', session: this.getTelemetry() });
        }
      } catch (e) {
        this.handleDisconnect();
      }
    }

    handleDisconnect() {
      this.stopHeartbeat();
      if (this.reconnectAttempts < this.maxReconnects) {
        this.state = 'RECONNECTING';
        this.reconnectAttempts++;
        const nextMs = TrafficShaper.getGaussianJitter(1500 * Math.pow(1.5, this.reconnectAttempts), 300);
        
        self.postMessage({
          type: 'WSM_STATE_CHANGE',
          state: this.state,
          attempt: this.reconnectAttempts,
          nextTryMs: nextMs,
        });

        setTimeout(() => this.connect(), nextMs);
      } else {
        this.state = 'DISCONNECTED';
        self.postMessage({ type: 'WSM_STATE_CHANGE', state: this.state });
      }
    }

    startAdaptiveHeartbeat() {
      this.stopHeartbeat();
      const scheduleNext = () => {
        const delay = TrafficShaper.getGaussianJitter(5000, 800);
        this.keepAliveTimer = setTimeout(() => {
          if (!guard.auditExecutionDelta()) return;

          self.postMessage({
            type: 'WSM_HEARTBEAT',
            timestamp: Date.now(),
            entropyBytes: TrafficShaper.generateDummyPadding(16, 64).byteLength,
          });

          if (this.state === 'CONNECTED') scheduleNext();
        }, delay);
      };
      scheduleNext();
    }

    stopHeartbeat() {
      if (this.keepAliveTimer) {
        clearTimeout(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
    }

    async processAndSend(id, rawPayload, channelId = 'default') {
      if (!guard.auditExecutionDelta()) return;

      this.sequence++;
      const textEncoder = new TextEncoder();
      
      let payloadBuffer;
      if (rawPayload instanceof ArrayBuffer) {
        payloadBuffer = rawPayload;
      } else if (typeof rawPayload === 'object') {
        payloadBuffer = textEncoder.encode(JSON.stringify(rawPayload)).buffer;
      } else {
        payloadBuffer = textEncoder.encode(String(rawPayload)).buffer;
      }

      // Step 1: Obfuscate via Galois LFSR
      const maskedBuffer = BitwiseMaskEngine.transform(payloadBuffer, 0x9e3779b9);

      // Step 2: Encrypt via WebCrypto AES-GCM
      const { cipherBuffer, iv } = await cryptoEngine.encryptPayload(maskedBuffer);

      const packetEnvelope = {
        id,
        channelId,
        seq: this.sequence,
        timestamp: Date.now(),
        session: this.sessionId,
        headers: this.activeProfile.headers,
        ivHex: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(cipherBuffer);
      }

      // Transfer ownership zero-copy back to host context
      self.postMessage(
        {
          type: 'PACKET_SPOOFED',
          id,
          envelope: packetEnvelope,
          encryptedBuffer: cipherBuffer,
        },
        [cipherBuffer]
      );
    }

    flushQueue() {
      while (this.outboundQueue.length > 0 && this.state === 'CONNECTED') {
        const item = this.outboundQueue.shift();
        this.processAndSend(item.id, item.payload, item.channelId);
      }
    }

    handleInbound(data) {
      if (!guard.auditExecutionDelta()) return;

      if (data instanceof ArrayBuffer) {
        self.postMessage(
          { type: 'BINARY_FRAME_RECEIVED', data: data, timestamp: Date.now() },
          [data]
        );
      } else {
        self.postMessage({
          type: 'TEXT_FRAME_RECEIVED',
          data: data,
          timestamp: Date.now(),
        });
      }
    }

    getTelemetry() {
      return NativePrimitives.freeze({
        sessionId: this.sessionId,
        state: this.state,
        sequence: this.sequence,
        reconnectAttempts: this.reconnectAttempts,
        profile: this.activeProfile.ja3,
      });
    }
  }

  const sessionManager = new WSMSecureSession();

  // =========================================================================
  // 6. EVENT DISPATCHER & MESSAGE CONTROL ROUTER
  // =========================================================================

  self.onmessage = async function (event) {
    if (!guard.auditExecutionDelta()) return;

    const { action, payload, id, channelId } = event.data || {};

    switch (action) {
      case 'INIT_WSM':
        await cryptoEngine.generateSessionKey();
        sessionManager.connect(payload?.url);
        break;

      case 'SPOOF_PACKET':
        if (sessionManager.state !== 'CONNECTED') {
          sessionManager.outboundQueue.push({ id, payload, channelId });
        } else {
          await sessionManager.processAndSend(id, payload, channelId);
        }
        break;

      case 'PING':
        self.postMessage({
          type: 'PONG',
          timestamp: Date.now(),
          status: 'SECURE_NOMINAL',
        });
        break;

      case 'GET_TELEMETRY':
        self.postMessage({
          type: 'WSM_TELEMETRY_REPORT',
          telemetry: sessionManager.getTelemetry(),
        });
        break;

      default:
        break;
    }
  };

  // Seal scope against external prototype tampering
  NativePrimitives.seal(WSMSecureSession.prototype);
  NativePrimitives.seal(EphemeralCryptoManager.prototype);
  NativePrimitives.seal(AntiDebugGuard.prototype);

})(self);