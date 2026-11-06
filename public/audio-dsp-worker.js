/**
 * Web Audio Spectrum & DSP Engine Worker (audio-dsp-worker.js)
 * Production DSP Worker supporting Real Radix-2 Cooley-Tukey FFT, Windowing (Hann, Hamming, Blackman-Harris),
 * Multi-band Logarithmic Equalizer Visualizer, RMS/Peak Metering, and Spectral Centroid Analysis.
 */

// --- DSP & Windowing Utility Functions ---
class WindowFunctions {
  static applyHann(data) {
    const N = data.length;
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      windowed[i] = data[i] * w;
    }
    return windowed;
  }

  static applyHamming(data) {
    const N = data.length;
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
      windowed[i] = data[i] * w;
    }
    return windowed;
  }

  static applyBlackmanHarris(data) {
    const N = data.length;
    const windowed = new Float32Array(N);
    const a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
    for (let i = 0; i < N; i++) {
      const w = a0 - a1 * Math.cos((2 * Math.PI * i) / (N - 1))
                   + a2 * Math.cos((4 * Math.PI * i) / (N - 1))
                   - a3 * Math.cos((6 * Math.PI * i) / (N - 1));
      windowed[i] = data[i] * w;
    }
    return windowed;
  }
}

// --- Cooley-Tukey Radix-2 FFT Engine ---
class FFTProcessor {
  constructor(size = 512) {
    this.size = size;
    // Precompute bit reversal permutation table
    this.bitRev = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      for (let j = 0; j < bits; j++) {
        if ((i & (1 << j)) !== 0) {
          rev |= 1 << (bits - 1 - j);
        }
      }
      this.bitRev[i] = rev;
    }

    // Precompute Twiddle Factors
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / size);
    }
  }

  transform(real, imag) {
    const N = this.size;
    
    // Bit reversal permutation
    for (let i = 0; i < N; i++) {
      const j = this.bitRev[i];
      if (j > i) {
        let tempR = real[i];
        real[i] = real[j];
        real[j] = tempR;

        let tempI = imag[i];
        imag[i] = imag[j];
        imag[j] = tempI;
      }
    }

    // Radix-2 Cooley-Tukey Decimation-in-Time
    for (let len = 2; len <= N; len <<= 1) {
      const halfLen = len >> 1;
      const step = N / len;

      for (let i = 0; i < N; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const k = j * step;
          const uR = real[i + j];
          const uI = imag[i + j];

          const vR = real[i + j + halfLen] * this.cosTable[k] - imag[i + j + halfLen] * this.sinTable[k];
          const vI = real[i + j + halfLen] * this.sinTable[k] + imag[i + j + halfLen] * this.cosTable[k];

          real[i + j] = uR + vR;
          imag[i + j] = uI + vI;
          real[i + j + halfLen] = uR - vR;
          imag[i + j + halfLen] = uI - vI;
        }
      }
    }
  }

  computeMagnitudes(real, imag) {
    const halfN = this.size / 2;
    const magnitudes = new Float32Array(halfN);
    const norm = 2.0 / this.size;

    for (let i = 0; i < halfN; i++) {
      const r = real[i];
      const im = imag[i];
      magnitudes[i] = Math.sqrt(r * r + im * im) * norm;
    }
    return magnitudes;
  }
}

let cachedFFT = null;
let cachedFFTSize = 0;

function getFFTProcessor(size) {
  if (cachedFFTSize !== size || !cachedFFT) {
    cachedFFTSize = size;
    cachedFFT = new FFTProcessor(size);
  }
  return cachedFFT;
}

// Band Frequency Map calculation (7 Acoustic Frequency Bands)
function calculateAcousticBands(magnitudes, sampleRate = 44100) {
  const numBins = magnitudes.length;
  const binWidth = (sampleRate / 2) / numBins;

  const bandRanges = [
    { name: 'subBass', low: 20, high: 60 },
    { name: 'bass', low: 60, high: 250 },
    { name: 'lowMid', low: 250, high: 500 },
    { name: 'mid', low: 500, high: 2000 },
    { name: 'highMid', low: 2000, high: 4000 },
    { name: 'presence', low: 4000, high: 6000 },
    { name: 'brilliance', low: 6000, high: 20000 },
  ];

  const bandEnergies = {};

  for (const band of bandRanges) {
    const startBin = Math.floor(band.low / binWidth);
    const endBin = Math.min(numBins - 1, Math.ceil(band.high / binWidth));
    let sum = 0;
    let count = 0;

    for (let b = startBin; b <= endBin; b++) {
      sum += magnitudes[b] || 0;
      count++;
    }

    const avg = count > 0 ? sum / count : 0;
    bandEnergies[band.name] = Math.min(1.0, avg * 3.5);
  }

  return bandEnergies;
}

// Spectral Centroid Calculation (Brightness metric)
function calculateSpectralCentroid(magnitudes, sampleRate = 44100) {
  let weightedSum = 0;
  let totalEnergy = 0;
  const binWidth = (sampleRate / 2) / magnitudes.length;

  for (let i = 0; i < magnitudes.length; i++) {
    const freq = i * binWidth;
    const mag = magnitudes[i];
    weightedSum += freq * mag;
    totalEnergy += mag;
  }

  return totalEnergy > 0.0001 ? Math.round(weightedSum / totalEnergy) : 0;
}

self.onmessage = function (e) {
  const { id, type, pcmData, fftSize = 256, windowType = 'blackmanHarris', sampleRate = 44100 } = e.data || {};

  if (type === 'PROCESS_SPECTRUM') {
    if (!pcmData) return;

    const pcm = new Float32Array(pcmData);
    if (pcm.length === 0) return;

    // Peak & RMS Calculation
    let peak = 0;
    let rmsSum = 0;

    for (let i = 0; i < pcm.length; i++) {
      const abs = Math.abs(pcm[i]);
      if (abs > peak) peak = abs;
      rmsSum += pcm[i] * pcm[i];
    }

    const rms = Math.sqrt(rmsSum / pcm.length);
    const db = 20 * Math.log10(rms || 0.00001);

    // Ensure FFT size is power of 2 between 16 and 2048
    let actualFFTSize = Math.pow(2, Math.round(Math.log2(fftSize)));
    actualFFTSize = Math.max(16, Math.min(2048, actualFFTSize));

    const segment = new Float32Array(actualFFTSize);
    const copyLen = Math.min(pcm.length, actualFFTSize);
    for (let i = 0; i < copyLen; i++) {
      segment[i] = pcm[i];
    }

    // Apply Window Function
    let windowedSegment;
    if (windowType === 'hann') {
      windowedSegment = WindowFunctions.applyHann(segment);
    } else if (windowType === 'hamming') {
      windowedSegment = WindowFunctions.applyHamming(segment);
    } else {
      windowedSegment = WindowFunctions.applyBlackmanHarris(segment);
    }

    // Execute Radix-2 FFT
    const real = new Float32Array(windowedSegment);
    const imag = new Float32Array(actualFFTSize);
    const fft = getFFTProcessor(actualFFTSize);
    fft.transform(real, imag);

    const magnitudes = fft.computeMagnitudes(real, imag);
    const acousticBands = calculateAcousticBands(magnitudes, sampleRate);
    const spectralCentroid = calculateSpectralCentroid(magnitudes, sampleRate);

    // Generate 64 visualizer bands
    const visualizerBins = 64;
    const bandStep = Math.floor(magnitudes.length / visualizerBins) || 1;
    const visualizerBands = new Float32Array(visualizerBins);

    for (let b = 0; b < visualizerBins; b++) {
      let bSum = 0;
      for (let s = 0; s < bandStep; s++) {
        bSum += magnitudes[b * bandStep + s] || 0;
      }
      visualizerBands[b] = Math.min(1.0, (bSum / bandStep) * 2.0);
    }

    self.postMessage({
      id,
      type: 'SPECTRUM_PROCESSED',
      metrics: {
        peak: Math.round(peak * 1000) / 1000,
        rms: Math.round(rms * 1000) / 1000,
        db: Math.round(db * 10) / 10,
        spectralCentroidHz: spectralCentroid,
      },
      acousticBands,
      bands: Array.from(visualizerBands),
      fftSize: actualFFTSize,
    });
  }
};