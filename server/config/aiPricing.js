const AI_PRICING = {
  openai: {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-4-0125-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-4-1106-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    'gpt-3.5-turbo-1106': { prompt: 0.001, completion: 0.002 }
  },
  claude: {
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
    'claude-2.1': { prompt: 0.008, completion: 0.024 },
    'claude-2.0': { prompt: 0.008, completion: 0.024 }
  },
  gemini: {
    'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
    'gemini-pro-vision': { prompt: 0.00025, completion: 0.0005 },
    'gemini-1.5-pro': { prompt: 0.0035, completion: 0.0105 },
    'gemini-1.5-pro-latest': { prompt: 0.0035, completion: 0.0105 },
    'gemini-1.5-flash': { prompt: 0.000075, completion: 0.0003 },
    'gemini-1.5-flash-latest': { prompt: 0.000075, completion: 0.0003 }
  }
};

function calculateCost(provider, model, promptTokens, completionTokens) {
  const pricing = AI_PRICING[provider]?.[model];

  if (!pricing) {
    console.warn(`No pricing found for ${provider}/${model}, returning 0`);
    return 0;
  }

  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;

  return promptCost + completionCost;
}

module.exports = {
  AI_PRICING,
  calculateCost
};
