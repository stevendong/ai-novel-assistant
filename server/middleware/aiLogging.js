const aiLoggingService = require('../services/aiLoggingService');

function attachRequestUrl(req, res, next) {
  req.aiRequestUrl = req.originalUrl || req.url;
  next();
}

async function logAICall(options, startTime, response, error = null) {
  if (!options.userId) {
    return;
  }

  try {
    const logData = {
      userId: options.userId,
      novelId: options.novelId || null,
      provider: options.provider || 'openai',
      model: options.model || options.actualModel,
      endpoint: options.endpoint || 'chat',
      apiUrl: options.requestUrl || options.apiUrl || null,
      taskType: options.taskType || null,
      requestMessages: JSON.stringify(options.messages || []),
      requestParams: JSON.stringify({
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        messageType: options.messageType
      }),
      sessionId: options.sessionId || null,
      conversationId: options.conversationId || null,
      userAgent: options.userAgent || null,
      ipAddress: options.ipAddress || null,
      latencyMs: Date.now() - startTime
    };

    if (error) {
      logData.status = 'error';
      logData.errorMessage = error.message;
      logData.errorCode = error.code || error.type || null;
      logData.retryCount = options.retryCount || 0;
      logData.promptTokens = 0;
      logData.completionTokens = 0;
      logData.totalTokens = 0;
      logData.responseContent = null;
      logData.responseMetadata = null;
    } else if (response) {
      logData.status = 'success';
      logData.responseContent = response.content || response.text || null;
      logData.responseMetadata = JSON.stringify({
        finishReason: response.finishReason,
        model: response.model
      });
      logData.promptTokens = response.usage?.prompt_tokens || response.usage?.promptTokens || 0;
      logData.completionTokens = response.usage?.completion_tokens || response.usage?.completionTokens || 0;
      logData.totalTokens = response.usage?.total_tokens || response.usage?.totalTokens || 0;
    }

    await aiLoggingService.logAICall(logData);
  } catch (logError) {
    console.error('Failed to log AI call:', logError);
  }
}

module.exports = {
  attachRequestUrl,
  logAICall
};
