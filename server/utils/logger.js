const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Create custom format for API requests
const apiFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
  // Apply colors manually
  const levelColors = {
    error: '\u001b[31m',    // red
    warn: '\u001b[33m',     // yellow
    info: '\u001b[32m',     // green
    http: '\u001b[35m',     // magenta
    debug: '\u001b[37m'     // white
  };
  const resetColor = '\u001b[39m';
  const color = levelColors[info.level] || resetColor;

  let output = `${info.timestamp} ${color}${info.level}${resetColor}: ${color}${info.message}`;

  // Add detailed info for HTTP requests in console
  if (info.level === 'http') {
    if (info.message === 'Incoming request') {
      output += ` ${info.method || 'UNKNOWN'} ${info.url || 'UNKNOWN'}`;
      if (info.requestId) output += ` [${info.requestId}]`;
      if (info.requestBody && info.requestBody.data) {
        const bodyPreview = JSON.stringify(info.requestBody.data).substring(0, 150);
        output += `\n  📝 Body: ${bodyPreview}${bodyPreview.length >= 150 ? '...' : ''}`;
      }
      if (info.headers && Object.keys(info.headers).length > 0) {
        output += `\n  📋 Headers: ${JSON.stringify(info.headers)}`;
      }
    } else if (info.message === 'Request completed' || info.message === 'Request completed with error') {
      output += ` ${info.method || 'UNKNOWN'} ${info.url || 'UNKNOWN'} ${info.statusCode || 'UNKNOWN'} ${info.duration || 'UNKNOWN'}`;
      if (info.requestId) output += ` [${info.requestId}]`;
      if (info.responseBody && info.responseBody.data && info.responseBody.size < 300) {
        output += `\n  📤 Response: ${info.responseBody.data}`;
      }
    }
  }

  // Add detailed info for AI API calls
  if (info.message === 'API call completed' || info.message === 'API call failed') {
    output += ` ${info.provider || 'UNKNOWN'} ${info.endpoint || 'UNKNOWN'} ${info.duration || 'UNKNOWN'}`;
    if (info.request && info.request.model) {
      output += ` (${info.request.model})`;
    }
    if (info.response && info.response.usage) {
      const tokens = info.response.usage.total_tokens ||
        (info.response.usage.prompt_tokens + info.response.usage.completion_tokens);
      output += ` [${tokens} tokens]`;
    }
  }

  // Add error details
  if (info.level === 'error' && info.error) {
    output += `\n  ❌ ${info.error}`;
  }

  output += resetColor;
  return output;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: apiFormat,
  defaultMeta: { service: 'ai-novel-assistant' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write HTTP requests to separate file
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper function to create request logger middleware
logger.createRequestLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Add request ID to request object for use in other parts of the app
    req.requestId = requestId;

    // Prepare request data
    const requestData = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      headers: {
        'content-type': req.get('Content-Type'),
        'content-length': req.get('Content-Length'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
      },
      timestamp: new Date().toISOString()
    };

    // Add request body for POST/PUT/PATCH requests (with size limits and sensitive data masking)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyStr = JSON.stringify(req.body);
      requestData.requestBody = {
        size: bodyStr.length,
        data: bodyStr.length < 5000 ? maskSensitiveData(req.body) : '[BODY TOO LARGE]'
      };
    }

    // Log incoming request
    logger.http('Incoming request', requestData);

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseData = null;

    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      const responseLog = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };

      // Add response body (with size limits and sensitive data masking)
      if (responseData) {
        const responseStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        responseLog.responseBody = {
          size: responseStr.length,
          data: responseStr.length < 5000 ? maskSensitiveData(responseData) : '[RESPONSE TOO LARGE]'
        };
      }

      // Log based on status code
      if (res.statusCode >= 400) {
        logger.error('Request completed with error', responseLog);
      } else {
        logger.http('Request completed', responseLog);
      }
    });

    next();
  };
};

// Helper function to log API calls (OpenAI, etc.)
logger.logApiCall = (provider, endpoint, request, response, duration, error = null) => {
  const logData = {
    provider,
    endpoint,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    request: {
      model: request.model,
      messageCount: request.messages ? request.messages.length : 0,
      temperature: request.temperature,
      maxTokens: request.max_tokens || request.maxTokens,
      messages: request.messages ? request.messages.map(msg => ({
        role: msg.role,
        contentLength: msg.content ? msg.content.length : 0,
        contentPreview: msg.content ? msg.content.substring(0, 200) + '...' : null
      })) : []
    }
  };

  if (response) {
    logData.response = {
      model: response.model,
      usage: response.usage,
      finishReason: response.choices?.[0]?.finish_reason,
      contentLength: response.choices?.[0]?.message?.content?.length || 0,
      contentPreview: response.choices?.[0]?.message?.content?.substring(0, 200) + '...' || null
    };
  }

  if (error) {
    logData.error = {
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack
    };
    logger.error('API call failed', logData);
  } else {
    logger.info('API call completed', logData);
  }
};

// Helper function to log AI consistency checks
logger.logConsistencyCheck = (novelId, scope, issues, duration) => {
  logger.info('Consistency check completed', {
    novelId,
    scope,
    issuesFound: issues.length,
    issuesSeverity: {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    },
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

// Helper function to generate request ID
function generateRequestId() {
  return Math.random().toString(36).substr(2, 9);
}

// Helper function to mask sensitive data in requests/responses
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'apikey', 'api_key', 'secret', 'authorization', 'auth', 'key'];
  const masked = JSON.parse(JSON.stringify(data));

  function maskRecursive(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => maskRecursive(item));
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = maskRecursive(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return obj;
  }

  return maskRecursive(masked);
}

module.exports = logger;