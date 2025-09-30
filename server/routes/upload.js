const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// 获取文件列表
router.get('/files', requireAuth, async (req, res) => {
  try {
    const { novelId, category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id
    };

    if (novelId) {
      where.novelId = novelId;
    }

    if (category) {
      where.category = category;
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          novel: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.file.count({ where })
    ]);

    res.json({
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 上传文件
router.post('/files', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供文件' });
    }

    const { novelId, category = 'other', description, tags } = req.body;

    // 上传文件到云存储
    const uploadResult = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      category === 'image' ? 'images' : 'files'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ error: '文件上传失败: ' + uploadResult.error });
    }

    // 保存文件信息到数据库
    const file = await prisma.file.create({
      data: {
        userId: req.user.id,
        novelId: novelId || null,
        fileName: req.file.originalname,
        fileKey: uploadResult.key,
        fileUrl: uploadResult.url,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        category,
        description: description || null,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: false
      },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    logger.info('File uploaded:', {
      fileId: file.id,
      fileName: file.fileName,
      userId: req.user.id
    });

    res.json(file);
  } catch (error) {
    logger.error('Upload file error:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 获取单个文件信息
router.get('/files/:id', requireAuth, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 检查权限
    if (file.userId !== req.user.id && !file.isPublic) {
      return res.status(403).json({ error: '无权访问此文件' });
    }

    res.json(file);
  } catch (error) {
    logger.error('Get file error:', error);
    res.status(500).json({ error: '获取文件信息失败' });
  }
});

// 更新文件信息
router.put('/files/:id', requireAuth, async (req, res) => {
  try {
    const { novelId, category, description, tags, isPublic } = req.body;

    const file = await prisma.file.findUnique({
      where: { id: req.params.id }
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    if (file.userId !== req.user.id) {
      return res.status(403).json({ error: '无权修改此文件' });
    }

    const updatedFile = await prisma.file.update({
      where: { id: req.params.id },
      data: {
        novelId: novelId !== undefined ? novelId : file.novelId,
        category: category || file.category,
        description: description !== undefined ? description : file.description,
        tags: tags !== undefined ? JSON.stringify(tags) : file.tags,
        isPublic: isPublic !== undefined ? isPublic : file.isPublic
      },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json(updatedFile);
  } catch (error) {
    logger.error('Update file error:', error);
    res.status(500).json({ error: '更新文件信息失败' });
  }
});

// 删除文件
router.delete('/files/:id', requireAuth, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id }
    });

    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    if (file.userId !== req.user.id) {
      return res.status(403).json({ error: '无权删除此文件' });
    }

    // 从云存储删除文件
    await uploadService.deleteFile(file.fileKey);

    // 从数据库删除记录
    await prisma.file.delete({
      where: { id: req.params.id }
    });

    logger.info('File deleted:', {
      fileId: file.id,
      fileName: file.fileName,
      userId: req.user.id
    });

    res.json({ message: '文件删除成功' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 批量删除文件
router.post('/files/batch-delete', requireAuth, async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: '无效的文件ID列表' });
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: req.user.id
      }
    });

    if (files.length === 0) {
      return res.status(404).json({ error: '未找到可删除的文件' });
    }

    // 从云存储删除文件
    await Promise.all(files.map(file => uploadService.deleteFile(file.fileKey)));

    // 从数据库删除记录
    await prisma.file.deleteMany({
      where: {
        id: { in: files.map(f => f.id) }
      }
    });

    logger.info('Batch files deleted:', {
      count: files.length,
      userId: req.user.id
    });

    res.json({
      message: '文件批量删除成功',
      deletedCount: files.length
    });
  } catch (error) {
    logger.error('Batch delete files error:', error);
    res.status(500).json({ error: '批量删除文件失败' });
  }
});

// 获取文件统计信息
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.query;

    const where = {
      userId: req.user.id
    };

    if (novelId) {
      where.novelId = novelId;
    }

    const [
      totalFiles,
      totalSize,
      categoryStats
    ] = await Promise.all([
      prisma.file.count({ where }),
      prisma.file.aggregate({
        where,
        _sum: {
          fileSize: true
        }
      }),
      prisma.file.groupBy({
        by: ['category'],
        where,
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        }
      })
    ]);

    res.json({
      totalFiles,
      totalSize: totalSize._sum.fileSize || 0,
      categories: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.id,
        size: stat._sum.fileSize || 0
      }))
    });
  } catch (error) {
    logger.error('Get file stats error:', error);
    res.status(500).json({ error: '获取文件统计失败' });
  }
});

module.exports = router;