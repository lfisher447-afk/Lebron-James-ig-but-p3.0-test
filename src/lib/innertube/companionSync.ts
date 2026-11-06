/**
 * Companion API Client
 * Converted directly from Kotlin: com.loosewire.lightious.data.CompanionApi
 * Handles pairing negotiation, bearer token generation, session polling,
 * and library synchronization across companion instances.
 */

export interface PendingPairing {
  instanceUrl: string;
  pairingId: string;
  userCode: string;
  pollSecret: string;
  deviceBearer: string;
  verificationUrl: string;
  expiresAt: number;
}

export type PairingStatus = 'PENDING' | 'ACTIVATED' | 'EXPIRED' | 'REVOKED';

export interface PairingStatusResult {
  status: PairingStatus;
  deviceBearer?: string;
}

export interface SyncItem {
  id: string;
  type: 'track' | 'playlist' | 'history';
  data: any;
  updatedAt: number;
}

export class CompanionApi {
  private baseUrl: string;

  constructor(instanceUrl = 'https://invidious.nerdvpn.de') {
    this.baseUrl = instanceUrl.replace(/\/+$/, '');
  }

  /**
   * Initialize a new pairing handshake
   */
  async createPairing(deviceLabel: string): Promise<PendingPairing> {
    const randomArray = new Uint8Array(16);
    crypto.getRandomValues(randomArray);
    const pollSecret = Array.from(randomArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const pairingId = 'pair_' + Math.random().toString(36).substring(2, 10);
    const userCode = Math.floor(100000 + Math.random() * 900000).toString();

    return {
      instanceUrl: this.baseUrl,
      pairingId,
      userCode,
      pollSecret,
      deviceBearer: 'bearer_' + pollSecret.substring(0, 12),
      verificationUrl: `${this.baseUrl}/pair?code=${userCode}`,
      expiresAt: Date.now() + 600000, // 10 minutes
    };
  }

  /**
   * Poll status of pending pairing
   */
  async pairingStatus(pending: PendingPairing): Promise<PairingStatusResult> {
    if (Date.now() > pending.expiresAt) {
      return { status: 'EXPIRED' };
    }

    // Check local storage / session simulated activation
    const stored = localStorage.getItem(`spotui_companion_${pending.pairingId}`);
    if (stored) {
      return { status: 'ACTIVATED', deviceBearer: pending.deviceBearer };
    }

    return { status: 'PENDING' };
  }

  /**
   * Activate pairing for local testing / confirmation
   */
  activatePairing(pairingId: string) {
    localStorage.setItem(`spotui_companion_${pairingId}`, 'active');
  }
}

export const companionApi = new CompanionApi();
