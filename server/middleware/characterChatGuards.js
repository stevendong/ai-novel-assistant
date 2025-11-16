const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const prisma = require('../utils/prismaClient');
const config = require('../config/characterChat');

const calculateRetryAfter = (req) => {
  const reset = req.rateLimit?.resetTime;
  if (reset instanceof Date) {
    return Math.max(Math.ceil((reset.getTime() - Date.now()) / 1000), 0);
  }
  if (typeof reset === 'number') {
    return Math.max(Math.ceil((reset - Date.now()) / 1000), 0);
  }
  return 60;
};

const resolveTierLimit = (req) => {
  const tier = (req.user?.tier || 'free').toLowerCase();
  if (tier === 'premium') return config.rateLimit.perUser.premium;
  if (tier === 'standard') return config.rateLimit.perUser.standard;
  return config.rateLimit.perUser.free;
};

const chatRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: (req) => resolveTierLimit(req),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Chat rate limit exceeded. Please wait before sending more messages.',
      retryAfter: calculateRetryAfter(req)
    });
  }
});

const characterRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.perCharacter,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `character:${req.params.id}`,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Character Busy',
      message: 'This character is receiving too many requests. Please try again later.',
      retryAfter: calculateRetryAfter(req)
    });
  }
});

const checkUserBudget = async (req, res, next) => {
  if (!config.budget.enabled) {
    return next();
  }

  try {
    const tier = (req.user?.tier || 'free').toLowerCase();
    const limit = tier === 'premium' ? config.budget.premiumLimit : config.budget.freeLimit;

    if (!limit) {
      return next();
    }

    let novelId = req.body?.novelId || null;

    if (!novelId && req.params?.id) {
      const character = await prisma.character.findUnique({
        where: { id: req.params.id },
        select: { novelId: true }
      });

      novelId = character?.novelId || null;
    }

    const provider = config.ai.provider || 'openai';
    const model = config.ai.model;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.aIUsageStats.findUnique({
      where: {
        userId_provider_model_date_novelId: {
          userId: req.user.id,
          provider,
          model,
          date: today,
          novelId
        }
      }
    });

    if (usage && usage.totalCost >= limit) {
      return res.status(429).json({
        error: 'Daily budget exceeded',
        message: `You have reached your daily AI usage limit of $${limit.toFixed(2)}.`,
        currentUsage: usage.totalCost,
        limit
      });
    }

    return next();
  } catch (error) {
    console.error('Budget check failed:', error);
    return res.status(500).json({
      error: 'Budget check failed',
      message: 'Unable to verify AI usage budget at this time.'
    });
  }
};

module.exports = {
  chatRateLimiter,
  characterRateLimiter,
  checkUserBudget
};
