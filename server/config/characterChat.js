const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
};

const characterChatConfig = {
  ai: {
    temperature: parseNumber(process.env.CHARACTER_CHAT_TEMPERATURE, 0.9),
    maxTokens: parseNumber(process.env.CHARACTER_CHAT_MAX_TOKENS, 1000),
    model: process.env.CHARACTER_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    provider: process.env.CHARACTER_CHAT_PROVIDER || process.env.DEFAULT_AI_PROVIDER || 'openai',
    encodingModel: process.env.CHARACTER_CHAT_ENCODING_MODEL || 'gpt-4'
  },
  conversation: {
    maxHistoryMessages: parseNumber(process.env.CHAT_HISTORY_MAX_MESSAGES, 30),
    minHistoryMessages: parseNumber(process.env.CHAT_HISTORY_MIN_MESSAGES, 5),
    maxHistoryTokens: parseNumber(process.env.CHAT_HISTORY_MAX_TOKENS, 4000),
    encodingModel: process.env.CHAT_HISTORY_ENCODING_MODEL || 'gpt-4'
  },
  cache: {
    promptTTL: parseNumber(process.env.CHARACTER_PROMPT_CACHE_TTL, 600),
    maxKeys: parseNumber(process.env.CHARACTER_PROMPT_CACHE_MAX_KEYS, 1000),
    checkPeriod: parseNumber(process.env.CHARACTER_PROMPT_CACHE_CHECK_PERIOD, 120)
  },
  streaming: {
    timeout: parseNumber(process.env.CHARACTER_CHAT_STREAM_TIMEOUT, 30000),
    maxRetries: parseNumber(process.env.CHARACTER_CHAT_STREAM_MAX_RETRIES, 3)
  },
  rateLimit: {
    windowMs: parseNumber(process.env.CHARACTER_CHAT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    perUser: {
      premium: parseNumber(process.env.CHARACTER_CHAT_RATE_LIMIT_PREMIUM, 60),
      standard: parseNumber(process.env.CHARACTER_CHAT_RATE_LIMIT_STANDARD, 30),
      free: parseNumber(process.env.CHARACTER_CHAT_RATE_LIMIT_FREE, 20)
    },
    perCharacter: parseNumber(process.env.CHARACTER_CHAT_RATE_LIMIT_PER_CHARACTER, 100)
  },
  budget: {
    enabled: parseBool(process.env.CHARACTER_CHAT_BUDGET_ENABLED, true),
    premiumLimit: parseNumber(process.env.CHARACTER_CHAT_BUDGET_PREMIUM, 10),
    freeLimit: parseNumber(process.env.CHARACTER_CHAT_BUDGET_FREE, 1)
  }
};

module.exports = characterChatConfig;
