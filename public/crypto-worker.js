/**
 * Off-Thread Cryptography & Stream Obfuscation Worker (crypto-worker.js)
 * Enterprise-Grade Web Crypto Engine supporting PBKDF2 Key Derivation, AES-256-GCM Framing,
 * HMAC-SHA256 Packet Signatures, and High-Throughput Word-Aligned Bitwise Stream Obfuscation.
 */

// --- Hex and Byte Encoding Helpers ---
function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- SIMD/Word-Aligned Stream Obfuscator Engine ---
class BitwiseObfuscator {
  /**
   * Fast 32-bit word-aligned XOR obfuscation with dynamic LFSR pseudo-random sequence
   */
  static process(buffer, key = 0x5a3c9e12) {
    const input = new Uint8Array(buffer);
    const output = new Uint8Array(input.length);
    const view32In = new Uint32Array(input.buffer, input.byteOffset, Math.floor(input.length / 4));
    const view32Out = new Uint32Array(output.buffer, output.byteOffset, Math.floor(input.length / 4));

    let lfsr = key >>> 0;

    // Process 4 bytes at a time using Uint32 view
    for (let i = 0; i < view32In.length; i++) {
      lfsr = (lfsr >>> 1) ^ (-(lfsr & 1) & 0xd0000001);
      view32Out[i] = view32In[i] ^ lfsr ^ i;
    }

    // Process remaining trailing bytes
    const tailStart = view32In.length * 4;
    for (let i = tailStart; i < input.length; i++) {
      lfsr = (lfsr >>> 1) ^ (-(lfsr & 1) & 0xd0000001);
      output[i] = input[i] ^ (lfsr & 0xff) ^ (i % 255);
    }

    return output.buffer;
  }
}

// --- Web Crypto Subsystem ---
class WebCryptoEngine {
  static async deriveKeyPBKDF2(passphrase, saltHex, iterations = 100000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedRaw = await crypto.subtle.exportKey('raw', derivedKey);
    return {
      keyHex: bytesToHex(new Uint8Array(exportedRaw)),
      saltHex: bytesToHex(salt),
    };
  }

  static async encryptAESGCM(plainBuffer, keyHex, additionalData = null) {
    const rawKey = hexToBytes(keyHex);
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Standard 96-bit IV

    const encOptions = { name: 'AES-GCM', iv: iv };
    if (additionalData) {
      encOptions.additionalData = new TextEncoder().encode(additionalData);
    }

    const cipherBuffer = await crypto.subtle.encrypt(encOptions, key, plainBuffer);

    return {
      cipherBuffer,
      ivHex: bytesToHex(iv),
    };
  }

  static async decryptAESGCM(cipherBuffer, keyHex, ivHex, additionalData = null) {
    const rawKey = hexToBytes(keyHex);
    const iv = hexToBytes(ivHex);
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);

    const decOptions = { name: 'AES-GCM', iv: iv };
    if (additionalData) {
      decOptions.additionalData = new TextEncoder().encode(additionalData);
    }

    return await crypto.subtle.decrypt(decOptions, key, cipherBuffer);
  }

  static async signHMAC(dataBuffer, keyHex) {
    const rawKey = hexToBytes(keyHex);
    const key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return bytesToHex(new Uint8Array(signature));
  }
}

self.onmessage = async function (e) {
  const { id, type, payload } = e.data || {};

  try {
    switch (type) {
      case 'DERIVE_KEY': {
        const { passphrase, saltHex, iterations } = payload;
        const result = await WebCryptoEngine.deriveKeyPBKDF2(passphrase, saltHex, iterations);
        self.postMessage({
          id,
          type: 'KEY_DERIVED',
          keyHex: result.keyHex,
          saltHex: result.saltHex,
        });
        break;
      }

      case 'ENCRYPT_AES': {
        const { buffer, keyHex, additionalData } = payload;
        const { cipherBuffer, ivHex } = await WebCryptoEngine.encryptAESGCM(buffer, keyHex, additionalData);
        self.postMessage(
          {
            id,
            type: 'ENCRYPTED',
            cipherBuffer,
            ivHex,
          },
          [cipherBuffer]
        );
        break;
      }

      case 'DECRYPT_AES': {
        const { cipherBuffer, keyHex, ivHex, additionalData } = payload;
        const plainBuffer = await WebCryptoEngine.decryptAESGCM(cipherBuffer, keyHex, ivHex, additionalData);
        self.postMessage(
          {
            id,
            type: 'DECRYPTED',
            plainBuffer,
          },
          [plainBuffer]
        );
        break;
      }

      case 'SIGN_HMAC': {
        const { buffer, keyHex } = payload;
        const signatureHex = await WebCryptoEngine.signHMAC(buffer, keyHex);
        self.postMessage({
          id,
          type: 'HMAC_SIGNED',
          signatureHex,
        });
        break;
      }

      case 'OBFUSCATE_PACKET': {
        const data = payload.buffer || new ArrayBuffer(0);
        const key = payload.key || 0x5a3c9e12;
        const obfuscatedBuffer = BitwiseObfuscator.process(data, key);

        self.postMessage(
          {
            id,
            type: 'PACKET_OBFUSCATED',
            buffer: obfuscatedBuffer,
          },
          [obfuscatedBuffer]
        );
        break;
      }

      default:
        self.postMessage({ id, type: 'UNKNOWN_ACTION' });
        break;
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: err.message || 'Crypto operation failed',
    });
  }
};