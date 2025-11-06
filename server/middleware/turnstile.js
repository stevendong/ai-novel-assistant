const { verifyTurnstileToken, isTurnstileEnabled } = require('../utils/turnstileVerifier');
const { getCleanClientIp } = require('../utils/ipHelper');
const logger = require('../utils/logger');

const validateTurnstile = async (req, res, next) => {
  if (!isTurnstileEnabled()) {
    logger.debug('Turnstile is not enabled, skipping validation');
    return next();
  }

  const { turnstileToken } = req.body;

  if (!turnstileToken) {
    logger.debug('Turnstile token not provided, but validation is enabled');
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Verification is required. Please complete the challenge.',
      code: 'TURNSTILE_TOKEN_REQUIRED'
    });
  }

  const clientIp = getCleanClientIp(req);

  try {
    const result = await verifyTurnstileToken(turnstileToken, clientIp);

    if (!result.success) {
      logger.warn('Turnstile validation failed', {
        ip: clientIp,
        message: result.message,
        errorCodes: result.errorCodes
      });

      return res.status(400).json({
        error: 'Verification Failed',
        message: result.message || 'Verification failed. Please try again.',
        code: 'TURNSTILE_VERIFICATION_FAILED',
        errorCodes: result.errorCodes
      });
    }

    logger.info('Turnstile validation successful', {
      ip: clientIp,
      hostname: result.data?.hostname
    });

    req.turnstileVerified = true;
    next();
  } catch (error) {
    logger.error('Turnstile middleware error:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify. Please try again.',
      code: 'TURNSTILE_VERIFICATION_ERROR'
    });
  }
};

const optionalTurnstile = async (req, res, next) => {
  if (!isTurnstileEnabled()) {
    return next();
  }

  const { turnstileToken } = req.body;

  if (!turnstileToken) {
    req.turnstileVerified = false;
    return next();
  }

  const clientIp = getCleanClientIp(req);

  try {
    const result = await verifyTurnstileToken(turnstileToken, clientIp);

    if (result.success) {
      req.turnstileVerified = true;
      logger.info('Optional turnstile validation successful', { ip: clientIp });
    } else {
      req.turnstileVerified = false;
      logger.warn('Optional turnstile validation failed', {
        ip: clientIp,
        message: result.message
      });
    }

    next();
  } catch (error) {
    logger.error('Optional turnstile middleware error:', error);
    req.turnstileVerified = false;
    next();
  }
};

module.exports = {
  validateTurnstile,
  optionalTurnstile
};
