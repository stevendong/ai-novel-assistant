const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// 配置 multer 用于内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB 限制
    files: 1 // 只允许一个文件
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持 JPEG、PNG、WebP 格式'), false);
    }
  }
});

/**
 * POST /api/upload/avatar
 * 上传用户头像
 */
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    // 检查文件是否存在
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    const userId = req.user.id;
    const { buffer, originalname, mimetype } = req.file;

    // 上传到 Cloudflare R2
    const uploadResult = await uploadService.uploadAvatar(
      buffer,
      originalname,
      mimetype,
      userId
    );

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        message: uploadResult.error
      });
    }

    // 获取用户当前头像，用于删除旧头像
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    // 更新用户头像URL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: uploadResult.url,
        avatarKey: uploadResult.key // 存储文件key用于后续删除
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 删除旧头像（如果存在且不是默认头像）
    if (currentUser.avatar && currentUser.avatar !== uploadResult.url) {
      const oldKey = uploadService.extractKeyFromUrl(currentUser.avatar);
      if (oldKey) {
        // 异步删除旧头像，不等待结果
        uploadService.deleteFile(oldKey).catch(error => {
          console.error('Failed to delete old avatar:', error);
        });
      }
    }

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        user: updatedUser,
        uploadInfo: {
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName
        }
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);

    // 处理 multer 错误
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: '文件大小超过限制，最大支持 2MB'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: '一次只能上传一个文件'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: '头像上传失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/upload/avatar
 * 删除用户头像
 */
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取用户当前头像
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarKey: true }
    });

    if (!currentUser.avatar) {
      return res.status(400).json({
        success: false,
        message: '用户没有设置头像'
      });
    }

    // 从数据库中清除头像
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: null,
        avatarKey: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 删除 R2 中的文件
    const fileKey = currentUser.avatarKey || uploadService.extractKeyFromUrl(currentUser.avatar);
    if (fileKey) {
      const deleteResult = await uploadService.deleteFile(fileKey);
      if (!deleteResult.success) {
        console.error('Failed to delete avatar from R2:', deleteResult.error);
      }
    }

    res.json({
      success: true,
      message: '头像删除成功',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({
      success: false,
      message: '头像删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/upload/avatar/:userId
 * 获取用户头像信息（可选，用于调试）
 */
router.get('/avatar/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // 检查权限：只能查看自己的头像信息
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: '没有权限查看此用户的头像信息'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        avatarKey: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Get avatar info error:', error);
    res.status(500).json({
      success: false,
      message: '获取头像信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;