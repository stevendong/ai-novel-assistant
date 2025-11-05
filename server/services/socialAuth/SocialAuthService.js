const prisma = require('../../utils/prismaClient');
const AuthUtils = require('../../utils/auth');
const inviteService = require('../inviteService');
const ProviderFactory = require('./ProviderFactory');
const logger = require('../../utils/logger');
const { fetchSystemConfigs } = require('../../utils/systemConfig');

class SocialAuthService {
  parseConfigDate(value) {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const candidates = [normalized, normalized.endsWith('Z') ? normalized : `${normalized}Z`];

    for (const candidate of candidates) {
      const date = new Date(candidate);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  async handleSocialLogin(provider, credentials, context) {
    const { inviteCode, ipAddress, userAgent } = context;

    const providerService = ProviderFactory.getProvider(provider);

    let userInfoResult;

    if (provider === 'google' && credentials.idToken) {
      userInfoResult = await providerService.verifyToken(credentials.idToken);
    } else if (credentials.code) {
      const tokenResult = await providerService.getAccessToken(credentials.code);
      if (!tokenResult.success) {
        return { success: false, error: tokenResult.error };
      }
      userInfoResult = await providerService.getUserInfo(tokenResult.data.accessToken);
    } else if (credentials.accessToken) {
      userInfoResult = await providerService.getUserInfo(credentials.accessToken);
    } else {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!userInfoResult.success) {
      return { success: false, error: userInfoResult.error };
    }

    const socialUserInfo = userInfoResult.data;

    if (!socialUserInfo.emailVerified) {
      return {
        success: false,
        error: 'Email not verified with provider',
      };
    }

    const result = await this.findOrCreateUser(
      provider,
      socialUserInfo,
      inviteCode,
      { ipAddress, userAgent }
    );

    if (!result.success) {
      return result;
    }

    const exemptionUpdate = await this.applyInviteExemptionIfNeeded(result.user);
    if (exemptionUpdate.updated) {
      result.user = exemptionUpdate.user;
    }

    const session = await AuthUtils.createUserSession(
      result.user.id,
      userAgent,
      ipAddress
    );

    return {
      success: true,
      user: result.user,
      session: session,
      isNewUser: result.isNewUser,
    };
  }

  async applyInviteExemptionIfNeeded(user) {
    if (!user || user.inviteVerified) {
      return { updated: false, user };
    }

    const config = await this.getInviteCodeConfig();
    if (config.required) {
      return { updated: false, user };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        inviteVerified: true,
        inviteCodeUsed: null,
        invitedBy: null,
      },
    });

    return { updated: true, user: updatedUser };
  }

  async findOrCreateUser(provider, socialUserInfo, inviteCode, context) {
    let socialAccount = await prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: provider,
          providerId: socialUserInfo.providerId,
        },
      },
      include: { user: true },
    });

    if (socialAccount) {
      await prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: { lastUsed: new Date() },
      });

      const user = await prisma.user.update({
        where: { id: socialAccount.userId },
        data: { lastLogin: new Date() },
      });

      return { success: true, user: user, isNewUser: false };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: socialUserInfo.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists',
        code: 'EMAIL_EXISTS_DIFFERENT_PROVIDER',
        existingUser: {
          id: existingUser.id,
          email: existingUser.email,
          hasPassword: !!existingUser.password,
        },
      };
    }

    return await this.createNewUser(
      provider,
      socialUserInfo,
      inviteCode,
      context
    );
  }

  async createNewUser(provider, socialUserInfo, inviteCode, context) {
    const { ipAddress, userAgent } = context;

    const inviteValidation = await this.validateInviteCode(
      inviteCode,
      ipAddress
    );

    if (!inviteValidation.success) {
      return inviteValidation;
    }

    const username = await this.generateUniqueUsername(
      socialUserInfo.username || socialUserInfo.email.split('@')[0]
    );

    const result = await prisma.$transaction(async (tx) => {
      const inviteMetadata = inviteValidation.exemptionActive
        ? {
            inviteVerified: true,
            inviteCodeUsed: null,
            invitedBy: null,
          }
        : {
            inviteVerified: inviteValidation.validated,
            inviteCodeUsed: inviteValidation.code,
            invitedBy: inviteValidation.inviterId,
          };

      const user = await tx.user.create({
        data: {
          username: username.toLowerCase(),
          email: socialUserInfo.email.toLowerCase(),
          password: null,
          nickname: socialUserInfo.displayName,
          avatar: socialUserInfo.avatar,
          ...inviteMetadata,
        },
      });

      await tx.socialAccount.create({
        data: {
          userId: user.id,
          provider: provider,
          providerId: socialUserInfo.providerId,
          providerUsername: socialUserInfo.username,
          providerEmail: socialUserInfo.email,
          displayName: socialUserInfo.displayName,
          avatar: socialUserInfo.avatar,
          profileUrl: socialUserInfo.profileUrl,
        },
      });

      if (inviteValidation.validated) {
        await tx.inviteUsage.create({
          data: {
            codeId: inviteValidation.inviteCodeId,
            userId: user.id,
            ipAddress,
            userAgent,
          },
        });

        await tx.inviteCode.update({
          where: { id: inviteValidation.inviteCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return user;
    });

    logger.info('New user created via social login:', {
      userId: result.id,
      provider,
      providerId: socialUserInfo.providerId,
    });

    return { success: true, user: result, isNewUser: true };
  }

  async validateInviteCode(inviteCode, ipAddress) {
    const config = await this.getInviteCodeConfig();

    if (!config.required) {
      return {
        success: true,
        validated: false,
        exemptionActive: true,
        code: null,
        inviteCodeId: null,
        inviterId: null,
      };
    }

    if (!inviteCode) {
      return {
        success: false,
        error: 'Invite code required',
        code: 'INVITE_REQUIRED',
      };
    }

    const validation = await inviteService.validateInviteCode(inviteCode, {
      ipAddress,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.message,
        code: validation.error,
      };
    }

    return {
      success: true,
      validated: true,
      exemptionActive: false,
      code: inviteCode,
      inviteCodeId: validation.inviteCode.id,
      inviterId: validation.inviteCode.creator?.id,
    };
  }

  async getInviteCodeConfig() {
    const configs = await fetchSystemConfigs([
      'invite_code_required',
      'invite_code_exempt_start',
      'invite_code_exempt_end',
    ]);

    const configMap = {};
    configs.forEach((c) => (configMap[c.key] = c.value));

    const required = configMap.invite_code_required !== 'false';
    const exemptStart = configMap.invite_code_exempt_start;
    const exemptEnd = configMap.invite_code_exempt_end;

    if (required && exemptStart && exemptEnd) {
      const now = new Date();
      const startDate = this.parseConfigDate(exemptStart);
      const endDate = this.parseConfigDate(exemptEnd);

      if (startDate && endDate && now >= startDate && now <= endDate) {
        return { required: false, exemptionActive: true, exemptStart: startDate, exemptEnd: endDate };
      }
    }

    return { required: required, exemptionActive: false };
  }

  async generateUniqueUsername(baseUsername) {
    const sanitized = baseUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 20);

    let username = sanitized;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${sanitized}${counter}`;
      counter++;
    }

    return username;
  }

  async linkSocialAccount(userId, provider, credentials) {
    const providerService = ProviderFactory.getProvider(provider);

    let userInfoResult;

    if (credentials.idToken) {
      userInfoResult = await providerService.verifyToken(credentials.idToken);
    } else if (credentials.code) {
      const tokenResult = await providerService.getAccessToken(credentials.code);
      if (!tokenResult.success) {
        return { success: false, error: tokenResult.error };
      }
      userInfoResult = await providerService.getUserInfo(tokenResult.data.accessToken);
    } else {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!userInfoResult.success) {
      return { success: false, error: userInfoResult.error };
    }

    const socialUserInfo = userInfoResult.data;

    const existing = await prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: provider,
          providerId: socialUserInfo.providerId,
        },
      },
    });

    if (existing && existing.userId !== userId) {
      return {
        success: false,
        error: 'Social account already linked to another user',
      };
    }

    if (existing) {
      return { success: true, socialAccount: existing, alreadyLinked: true };
    }

    const socialAccount = await prisma.socialAccount.create({
      data: {
        userId: userId,
        provider: provider,
        providerId: socialUserInfo.providerId,
        providerUsername: socialUserInfo.username,
        providerEmail: socialUserInfo.email,
        displayName: socialUserInfo.displayName,
        avatar: socialUserInfo.avatar,
        profileUrl: socialUserInfo.profileUrl,
      },
    });

    logger.info('Social account linked:', {
      userId,
      provider,
      providerId: socialUserInfo.providerId,
    });

    return { success: true, socialAccount: socialAccount };
  }

  async unlinkSocialAccount(userId, provider) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { socialAccounts: true },
    });

    if (!user.password && user.socialAccounts.length <= 1) {
      return {
        success: false,
        error: 'Cannot unlink last authentication method. Set a password first.',
      };
    }

    const result = await prisma.socialAccount.deleteMany({
      where: {
        userId: userId,
        provider: provider,
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'Social account not found' };
    }

    logger.info('Social account unlinked:', { userId, provider });

    return { success: true };
  }
}

module.exports = new SocialAuthService();
