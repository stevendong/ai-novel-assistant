const { OAuth2Client } = require('google-auth-library');
const BaseSocialProvider = require('./BaseSocialProvider');
const logger = require('../../utils/logger');

class GoogleProvider extends BaseSocialProvider {
  constructor() {
    super({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    this.providerName = 'google';
    this.client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
  }

  async getAuthUrl(state, scopes = ['profile', 'email']) {
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.map(s => `https://www.googleapis.com/auth/${s}`),
      state: state,
      prompt: 'consent',
    });

    return { success: true, data: url };
  }

  async getAccessToken(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      return {
        success: true,
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        },
      };
    } catch (error) {
      logger.error('Google getAccessToken error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload();
      return {
        success: true,
        data: this.normalizeUserInfo(payload),
      };
    } catch (error) {
      logger.error('Google verifyToken error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserInfo(accessToken) {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      return {
        success: true,
        data: this.normalizeUserInfo(data),
      };
    } catch (error) {
      logger.error('Google getUserInfo error:', error);
      return { success: false, error: error.message };
    }
  }

  normalizeUserInfo(rawData) {
    return {
      provider: this.providerName,
      providerId: rawData.sub || rawData.id,
      email: rawData.email,
      emailVerified: rawData.email_verified || rawData.verified_email,
      username: rawData.email?.split('@')[0] || '',
      displayName: rawData.name,
      avatar: rawData.picture,
      profileUrl: null,
      rawData: rawData,
    };
  }
}

module.exports = GoogleProvider;
