const express = require('express');
const router = express.Router();
const SocialAuthService = require('../services/socialAuth/SocialAuthService');
const ProviderFactory = require('../services/socialAuth/ProviderFactory');
const SocialAuthStateService = require('../services/socialAuth/SocialAuthStateService');
const { requireAuth } = require('../middleware/auth');
const { getCleanClientIp } = require('../utils/ipHelper');
const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');

router.get('/:provider/url', async (req, res) => {
  try {
    const { provider } = req.params;
    const { scopes } = req.query;

    if (!ProviderFactory.isProviderSupported(provider)) {
      return res.status(400).json({
        error: 'Unsupported Provider',
        message: `Provider '${provider}' is not supported`,
      });
    }

    const providerService = ProviderFactory.getProvider(provider);
    const state = SocialAuthStateService.createState(provider, {
      ipAddress: getCleanClientIp(req),
      userAgent: req.get('User-Agent'),
    });

    const result = await providerService.getAuthUrl(
      state,
      scopes ? scopes.split(',') : undefined
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Auth URL Generation Failed',
        message: result.error,
      });
    }

    res.json({
      url: result.data,
      state: state,
    });
  } catch (error) {
    logger.error('Generate auth URL error:', error);
    res.status(500).json({
      error: 'Internal Error',
      message: 'Failed to generate authorization URL',
    });
  }
});

router.post('/:provider/login', async (req, res) => {
  try {
    const { provider } = req.params;
    const { idToken, code, accessToken, inviteCode, state } = req.body;

    if (!ProviderFactory.isProviderSupported(provider)) {
      return res.status(400).json({
        error: 'Unsupported Provider',
        message: `Provider '${provider}' is not supported`,
      });
    }

    const context = {
      ipAddress: getCleanClientIp(req),
      userAgent: req.get('User-Agent'),
    };

    if (code) {
      const stateValidation = SocialAuthStateService.validateAndConsumeState(
        provider,
        state,
        context
      );

      if (!stateValidation.valid) {
        return res.status(400).json({
          error: 'Invalid State',
          code: 'INVALID_STATE',
          message: stateValidation.error,
        });
      }
    }

    const result = await SocialAuthService.handleSocialLogin(
      provider,
      { idToken, code, accessToken },
      {
        inviteCode,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      }
    );

    if (!result.success) {
      const statusCode =
        result.code === 'EMAIL_EXISTS_DIFFERENT_PROVIDER' ? 409 :
        result.code === 'INVITE_REQUIRED' ? 400 : 400;

      return res.status(statusCode).json({
        error: result.error,
        code: result.code,
        message: result.error,
        existingUser: result.existingUser,
      });
    }

    const statusCode = result.isNewUser ? 201 : 200;

    res.status(statusCode).json({
      message: result.isNewUser
        ? 'Account created successfully'
        : 'Login successful',
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        nickname: result.user.nickname,
        avatar: result.user.avatar,
        role: result.user.role,
        createdAt: result.user.createdAt,
        inviteVerified: result.user.inviteVerified,
      },
      session: {
        sessionToken: result.session.sessionToken,
        refreshToken: result.session.refreshToken,
        expiresAt: result.session.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Social login error:', error);
    res.status(500).json({
      error: 'Login Failed',
      message: 'Failed to process social login',
    });
  }
});

router.post('/:provider/link', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const { idToken, code, accessToken } = req.body;

    if (!ProviderFactory.isProviderSupported(provider)) {
      return res.status(400).json({
        error: 'Unsupported Provider',
        message: `Provider '${provider}' is not supported`,
      });
    }

    const result = await SocialAuthService.linkSocialAccount(
      req.user.id,
      provider,
      { idToken, code, accessToken }
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        message: result.error,
      });
    }

    res.json({
      message: result.alreadyLinked
        ? 'Already linked'
        : 'Social account linked successfully',
      socialAccount: {
        provider: result.socialAccount.provider,
        displayName: result.socialAccount.displayName,
        avatar: result.socialAccount.avatar,
      },
    });
  } catch (error) {
    logger.error('Link social account error:', error);
    res.status(500).json({
      error: 'Link Failed',
      message: 'Failed to link social account',
    });
  }
});

router.post('/:provider/unlink', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;

    const result = await SocialAuthService.unlinkSocialAccount(
      req.user.id,
      provider
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        message: result.error,
      });
    }

    res.json({
      message: 'Social account unlinked successfully',
    });
  } catch (error) {
    logger.error('Unlink social account error:', error);
    res.status(500).json({
      error: 'Unlink Failed',
      message: 'Failed to unlink social account',
    });
  }
});

router.get('/linked', requireAuth, async (req, res) => {
  try {
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        provider: true,
        displayName: true,
        avatar: true,
        providerUsername: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      socialAccounts,
    });
  } catch (error) {
    logger.error('Get linked accounts error:', error);
    res.status(500).json({
      error: 'Failed to get linked accounts',
      message: 'Failed to get linked accounts',
    });
  }
});

module.exports = router;
