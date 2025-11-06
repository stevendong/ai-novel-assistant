const axios = require('axios');
const logger = require('./logger');

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const verifyTurnstileToken = async (token, remoteIp = null) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    logger.warn('Turnstile secret key not configured, skipping verification');
    return {
      success: true,
      message: 'Turnstile verification skipped (not configured)'
    };
  }

  if (!token) {
    return {
      success: false,
      message: 'Turnstile token is required'
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await axios.post(TURNSTILE_VERIFY_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const { success, 'error-codes': errorCodes, challenge_ts, hostname } = response.data;

    if (success) {
      logger.info('Turnstile verification successful', {
        hostname,
        challenge_ts,
        remoteIp
      });

      return {
        success: true,
        message: 'Verification successful',
        data: {
          hostname,
          challenge_ts
        }
      };
    } else {
      logger.warn('Turnstile verification failed', {
        errorCodes,
        remoteIp
      });

      const errorMessage = getTurnstileErrorMessage(errorCodes);

      return {
        success: false,
        message: errorMessage,
        errorCodes
      };
    }
  } catch (error) {
    logger.error('Turnstile verification error:', error);

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'Verification timeout. Please try again.'
      };
    }

    if (error.response) {
      return {
        success: false,
        message: 'Verification service error. Please try again later.'
      };
    }

    return {
      success: false,
      message: 'Failed to verify. Please try again.'
    };
  }
};

const getTurnstileErrorMessage = (errorCodes) => {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Verification failed';
  }

  const errorMessages = {
    'missing-input-secret': 'Server configuration error',
    'invalid-input-secret': 'Server configuration error',
    'missing-input-response': 'Verification token is missing',
    'invalid-input-response': 'Verification failed. Please try again.',
    'bad-request': 'Invalid verification request',
    'timeout-or-duplicate': 'Verification expired or already used. Please try again.',
    'internal-error': 'Verification service error. Please try again later.'
  };

  const firstError = errorCodes[0];
  return errorMessages[firstError] || 'Verification failed';
};

const isTurnstileEnabled = () => {
  return !!process.env.TURNSTILE_SECRET_KEY;
};

module.exports = {
  verifyTurnstileToken,
  getTurnstileErrorMessage,
  isTurnstileEnabled
};
