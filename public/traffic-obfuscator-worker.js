/**
 * Traffic Obfuscator & DPI Noise Generator Worker (traffic-obfuscator-worker.js)
 * Enterprise-Grade Synthetic Entropy Engine featuring Statistical Noise Models (Gaussian, Poisson, Uniform Jitter),
 * Variable-Length High-Entropy Payload Generation, Mimicry Frame Synthesis, and Adaptive Bandwidth Shaping.
 */

// --- Statistical Noise Generators ---
class NoiseDistribution {
  /**
   * Box-Muller transform for Gaussian (Normal) Distribution
   */
  static gaussian(mean = 0, stdDev = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Exponential distribution for Poisson process event intervals
   */
  static exponential(lambda = 1) {
    return -Math.log(1.0 - Math.random()) / lambda;
  }

  /**
   * Uniform jitter within min-max bounds
   */
  static uniform(min, max) {
    return min + Math.random() * (max - min);
  }
}

// --- Synthetic Payload & Mimicry Frame Generator ---
class MimicryFrameGenerator {
  static HEADERS_LIST = [
    'Sec-CH-UA-Mobile: ?0',
    'Accept: image/avif,image/webp,image/apng,image/svg+xml,*/*;q=0.8',
    'Accept-Encoding: gzip, deflate, br, zstd',
    'Cache-Control: max-age=0',
    'Sec-Fetch-Site: same-site',
    'Sec-Fetch-Mode: no-cors',
    'Sec-Fetch-Dest: script',
  ];

  /**
   * Generate high-entropy byte buffer with dynamic padding
   */
  static generateEntropyBuffer(minBytes = 64, maxBytes = 256, distribution = 'GAUSSIAN') {
    let targetSize = minBytes;
    if (distribution === 'GAUSSIAN') {
      const mean = (minBytes + maxBytes) / 2;
      const stdDev = (maxBytes - minBytes) / 6;
      targetSize = Math.max(minBytes, Math.min(maxBytes, Math.round(NoiseDistribution.gaussian(mean, stdDev))));
    } else {
      targetSize = Math.round(NoiseDistribution.uniform(minBytes, maxBytes));
    }

    const buffer = new Uint8Array(targetSize);
    crypto.getRandomValues(buffer);
    return buffer;
  }

  static getRandomHeader() {
    const idx = Math.floor(Math.random() * this.HEADERS_LIST.length);
    return this.HEADERS_LIST[idx];
  }
}

// --- Traffic Masking Engine ---
class TrafficMaskingEngine {
  constructor() {
    this.timer = null;
    this.active = false;
    this.baseIntervalMs = 15000;
    this.distribution = 'POISSON'; // UNIFORM, GAUSSIAN, POISSON
    this.minPaddingBytes = 64;
    this.maxPaddingBytes = 512;
    this.totalBytesSent = 0;
    this.totalPacketsSent = 0;
    this.startTime = Date.now();
  }

  start(config = {}) {
    this.baseIntervalMs = config.interval || this.baseIntervalMs;
    this.distribution = config.distribution || this.distribution;
    this.minPaddingBytes = config.minPaddingBytes || this.minPaddingBytes;
    this.maxPaddingBytes = config.maxPaddingBytes || this.maxPaddingBytes;

    this.stop();
    this.active = true;
    this.startTime = Date.now();

    self.postMessage({
      type: 'TRAFFIC_MASK_STARTED',
      config: {
        intervalMs: this.baseIntervalMs,
        distribution: this.distribution,
        minBytes: this.minPaddingBytes,
        maxBytes: this.maxPaddingBytes,
      },
      timestamp: Date.now(),
    });

    this.scheduleNextChunk();
  }

  scheduleNextChunk() {
    if (!this.active) return;

    let delayMs = this.baseIntervalMs;
    if (this.distribution === 'POISSON') {
      delayMs = Math.max(1000, Math.round(NoiseDistribution.exponential(1 / this.baseIntervalMs)));
    } else if (this.distribution === 'GAUSSIAN') {
      delayMs = Math.max(1000, Math.round(NoiseDistribution.gaussian(this.baseIntervalMs, this.baseIntervalMs * 0.3)));
    } else {
      delayMs = Math.round(NoiseDistribution.uniform(this.baseIntervalMs * 0.5, this.baseIntervalMs * 1.5));
    }

    this.timer = setTimeout(() => {
      this.generateAndSendChunk();
      this.scheduleNextChunk();
    }, delayMs);
  }

  generateAndSendChunk() {
    const paddingBuffer = MimicryFrameGenerator.generateEntropyBuffer(
      this.minPaddingBytes,
      this.maxPaddingBytes,
      this.distribution
    );

    this.totalBytesSent += paddingBuffer.byteLength;
    this.totalPacketsSent++;

    const dummyHeader = MimicryFrameGenerator.getRandomHeader();

    self.postMessage(
      {
        type: 'PADDING_CHUNK_GENERATED',
        timestamp: Date.now(),
        bytesLength: paddingBuffer.byteLength,
        dummyHeader: dummyHeader,
        stats: this.getStats(),
        buffer: paddingBuffer.buffer,
      },
      [paddingBuffer.buffer]
    );
  }

  stop() {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    self.postMessage({ type: 'TRAFFIC_MASK_STOPPED', timestamp: Date.now() });
  }

  getStats() {
    const durationSec = Math.max(1, (Date.now() - this.startTime) / 1000);
    return {
      active: this.active,
      totalBytesSent: this.totalBytesSent,
      totalPacketsSent: this.totalPacketsSent,
      avgBandwidthBytesPerSec: Math.round((this.totalBytesSent / durationSec) * 100) / 100,
      distribution: this.distribution,
    };
  }
}

const trafficEngine = new TrafficMaskingEngine();

self.onmessage = function (e) {
  const { action, interval = 15000, config = {} } = e.data || {};

  switch (action) {
    case 'START_TRAFFIC_MASK':
      trafficEngine.start({ interval, ...config });
      break;

    case 'STOP_TRAFFIC_MASK':
      trafficEngine.stop();
      break;

    case 'GENERATE_BURST':
      const burstSize = config.burstSize || 5;
      for (let i = 0; i < burstSize; i++) {
        trafficEngine.generateAndSendChunk();
      }
      break;

    case 'GET_STATS':
      self.postMessage({
        type: 'TRAFFIC_STATS_REPORT',
        stats: trafficEngine.getStats(),
      });
      break;

    default:
      break;
  }
};