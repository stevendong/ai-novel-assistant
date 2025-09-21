const AuthUtils = require('../utils/auth');
const logger = require('../utils/logger');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const session = await AuthUtils.validateSession(token);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token'
      });
    }

    if (!session.user.isActive) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: 'User account has been disabled'
      });
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();

  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await AuthUtils.validateSession(token);

      if (session && session.user.isActive) {
        req.user = session.user;
        req.sessionId = session.id;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const resourceId = req.params.id || req.params.novelId;

    if (!resourceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Resource ID required'
      });
    }

    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      let resource;
      switch (resourceType) {
        case 'novel':
          resource = await prisma.novel.findUnique({
            where: { id: resourceId },
            select: { id: true, userId: true }
          });
          break;
        case 'character':
          resource = await prisma.character.findUnique({
            where: { id: resourceId },
            include: { novel: { select: { userId: true } } }
          });
          break;
        case 'chapter':
          resource = await prisma.chapter.findUnique({
            where: { id: resourceId },
            include: { novel: { select: { userId: true } } }
          });
          break;
        case 'worldSetting':
          resource = await prisma.worldSetting.findUnique({
            where: { id: resourceId },
            include: { novel: { select: { userId: true } } }
          });
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid resource type'
          });
      }

      if (!resource) {
        return res.status(404).json({
          error: 'Not Found',
          message: `${resourceType} not found`
        });
      }

      const ownerId = resource.userId || resource.novel?.userId;

      if (ownerId !== req.user.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
      }

      next();

    } catch (error) {
      logger.error('Ownership check error:', {
        error: error.message,
        resourceType,
        resourceId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

const requireAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const session = await AuthUtils.validateSession(token);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token'
      });
    }

    if (!session.user.isActive) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: 'User account has been disabled'
      });
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();

  } catch (error) {
    logger.error('Admin auth middleware error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error'
    });
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireOwnership,
  requireAdmin,
};