class BaseSocialProvider {
  constructor(config) {
    this.config = config;
    this.providerName = '';
  }

  async getAuthUrl(state, scopes) {
    throw new Error('getAuthUrl must be implemented');
  }

  async getAccessToken(code) {
    throw new Error('getAccessToken must be implemented');
  }

  async verifyToken(token) {
    throw new Error('verifyToken must be implemented');
  }

  async getUserInfo(accessToken) {
    throw new Error('getUserInfo must be implemented');
  }

  async refreshAccessToken(refreshToken) {
    return { success: false, error: 'Refresh not supported' };
  }

  async revokeToken(accessToken) {
    return { success: false, error: 'Revoke not supported' };
  }

  normalizeUserInfo(rawData) {
    return {
      provider: this.providerName,
      providerId: '',
      email: '',
      emailVerified: false,
      username: '',
      displayName: '',
      avatar: '',
      profileUrl: '',
      rawData: rawData,
    };
  }
}

module.exports = BaseSocialProvider;
