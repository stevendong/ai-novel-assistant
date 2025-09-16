const logger = require('./logger');

// Enhanced request logging with performance monitoring
const createEnhancedLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Add request ID to request object
    req.requestId = requestId;

    // Extract relevant request data
    const requestData = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    };

    // Log body data for POST/PUT/PATCH requests (but mask sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      requestData.bodySize = JSON.stringify(req.body).length;
      requestData.hasBody = true;
    }

    logger.http('Incoming request', requestData);

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Track response data
    let responseData = null;
    let responseSize = 0;

    // Override res.send
    res.send = function(data) {
      responseData = data;
      responseSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data || '', 'utf8');
      return originalSend.call(this, data);
    };

    // Override res.json
    res.json = function(data) {
      responseData = data;
      responseSize = Buffer.byteLength(JSON.stringify(data || {}), 'utf8');
      return originalJson.call(this, data);
    };

    // Log response when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const responseLog = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: `${responseSize} bytes`,
        timestamp: new Date().toISOString()
      };

      // Add performance warnings for slow requests
      if (duration > 5000) {
        responseLog.performance = 'SLOW';
        logger.warn('Slow request detected', responseLog);
      } else if (duration > 2000) {
        responseLog.performance = 'MEDIUM';
      } else {
        responseLog.performance = 'FAST';
      }

      // Log error responses
      if (res.statusCode >= 400) {
        responseLog.error = true;
        if (responseData && typeof responseData === 'object') {
          responseLog.errorMessage = responseData.error || responseData.message;
        }
        logger.error('Error response', responseLog);
      } else {
        logger.http('Request completed', responseLog);
      }
    });

    // Handle response close (client disconnected)
    res.on('close', () => {
      if (!res.finished) {
        logger.warn('Client disconnected', {
          requestId,
          method: req.method,
          url: req.url,
          duration: `${Date.now() - start}ms`,
          timestamp: new Date().toISOString()
        });
      }
    });

    next();
  };
};

// Helper to generate unique request IDs
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware to log specific AI-related requests
const createAIRequestLogger = () => {
  return (req, res, next) => {
    // Only log AI-related endpoints
    if (req.url.startsWith('/api/ai') || req.url.includes('/consistency')) {
      const start = Date.now();

      logger.info('AI request started', {
        requestId: req.requestId,
        endpoint: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      // Override res.json for AI responses
      const originalJson = res.json;
      res.json = function(data) {
        const duration = Date.now() - start;

        logger.info('AI request completed', {
          requestId: req.requestId,
          endpoint: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          hasError: res.statusCode >= 400,
          timestamp: new Date().toISOString()
        });

        return originalJson.call(this, data);
      };
    }

    next();
  };
};

module.exports = {
  createEnhancedLogger,
  createAIRequestLogger,
  generateRequestId
};