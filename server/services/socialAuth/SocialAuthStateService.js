const crypto = require('crypto');
const logger = require('../../utils/logger');

class SocialAuthStateService {
  constructor() {
    this.stateStore = new Map();
    this.ttlMs = this.resolveNumber(process.env.SOCIAL_AUTH_STATE_TTL_MS, 10 * 60 * 1000);
    this.cleanupIntervalMs = this.resolveNumber(
      process.env.SOCIAL_AUTH_STATE_CLEANUP_MS,
      60 * 1000
    );
    this.startCleanupTimer();
  }

  resolveNumber(value, fallback) {
    if (!value) {
      return fallback;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => this.cleanupExpiredStates(), this.cleanupIntervalMs);
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  createState(provider, metadata = {}) {
    const state = this.generateState();
    const expiresAt = Date.now() + this.ttlMs;

    this.stateStore.set(state, {
      provider: provider.toLowerCase(),
      metadata,
      expiresAt,
    });

    logger.debug('OAuth state created', {
      provider,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return state;
  }

  validateAndConsumeState(provider, state, currentMetadata = {}) {
    if (!state) {
      return { valid: false, error: 'State parameter missing' };
    }

    const entry = this.stateStore.get(state);

    if (!entry) {
      return { valid: false, error: 'Invalid state parameter' };
    }

    this.stateStore.delete(state);

    if (entry.provider !== provider.toLowerCase()) {
      return { valid: false, error: 'State provider mismatch' };
    }

    if (Date.now() > entry.expiresAt) {
      return { valid: false, error: 'State has expired' };
    }

    const { ipAddress, userAgent } = entry.metadata;
    const currentIp = currentMetadata.ipAddress;
    const currentUa = currentMetadata.userAgent;

    if (ipAddress && currentIp && ipAddress !== currentIp) {
      return { valid: false, error: 'State validation failed (IP mismatch)' };
    }

    if (userAgent && currentUa && userAgent !== currentUa) {
      return { valid: false, error: 'State validation failed (UA mismatch)' };
    }

    return { valid: true, metadata: entry.metadata };
  }

  cleanupExpiredStates() {
    const now = Date.now();

    for (const [state, entry] of this.stateStore.entries()) {
      if (now > entry.expiresAt) {
        this.stateStore.delete(state);
      }
    }
  }
}

module.exports = new SocialAuthStateService();
