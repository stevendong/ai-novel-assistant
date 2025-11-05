const axios = require('axios');
const BaseSocialProvider = require('./BaseSocialProvider');
const logger = require('../../utils/logger');

class GitHubProvider extends BaseSocialProvider {
  constructor() {
    super({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    });

    this.providerName = 'github';
  }

  async getAuthUrl(state, scopes = ['read:user', 'user:email']) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: scopes.join(' '),
      state: state,
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return { success: true, data: url };
  }

  async getAccessToken(code) {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: code,
          redirect_uri: this.config.callbackUrl,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (response.data.error) {
        return {
          success: false,
          error: response.data.error_description || response.data.error,
        };
      }

      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          tokenType: response.data.token_type,
          scope: response.data.scope,
        },
      };
    } catch (error) {
      logger.error('GitHub getAccessToken error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserInfo(accessToken) {
    try {
      const [userResponse, emailsResponse] = await Promise.all([
        axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
        axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      ]);

      const user = userResponse.data;
      const emails = emailsResponse.data;
      const primaryEmail = emails.find((e) => e.primary && e.verified);

      if (!primaryEmail) {
        return {
          success: false,
          error: 'No verified primary email found',
        };
      }

      return {
        success: true,
        data: this.normalizeUserInfo({ ...user, primaryEmail }),
      };
    } catch (error) {
      logger.error('GitHub getUserInfo error:', error);
      return { success: false, error: error.message };
    }
  }

  normalizeUserInfo(rawData) {
    return {
      provider: this.providerName,
      providerId: rawData.id?.toString(),
      email: rawData.primaryEmail?.email,
      emailVerified: rawData.primaryEmail?.verified,
      username: rawData.login,
      displayName: rawData.name || rawData.login,
      avatar: rawData.avatar_url,
      profileUrl: rawData.html_url,
      rawData: rawData,
    };
  }

  async revokeToken(accessToken) {
    try {
      await axios.delete(
        `https://api.github.com/applications/${this.config.clientId}/token`,
        {
          auth: {
            username: this.config.clientId,
            password: this.config.clientSecret,
          },
          data: { access_token: accessToken },
        }
      );

      return { success: true };
    } catch (error) {
      logger.error('GitHub revokeToken error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GitHubProvider;
