const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 获取当前用户的所有对话
router.get('/', requireAuth, async (req, res) => {
  try {
    const { novelId, mode, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const whereClause = {
      userId,
      isActive: true
    };

    if (novelId) {
      whereClause.novelId = novelId;
    }

    if (mode) {
      whereClause.mode = mode;
    }

    const conversations = await prisma.aIConversation.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // 只获取最近10条消息用于预览
        },
        novel: {
          select: { id: true, title: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // 转换数据格式以匹配前端期望
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      novelId: conv.novelId,
      mode: conv.mode,
      title: conv.title,
      settings: conv.settings ? JSON.parse(conv.settings) : null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      lastMessage: conv.messages[conv.messages.length - 1]?.content.substring(0, 100),
      novel: conv.novel
    }));

    res.json({
      conversations: formattedConversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: '获取对话列表失败' });
  }
});

// 获取特定对话的完整消息
router.get('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        novel: {
          select: { id: true, title: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    // 转换消息格式
    const formattedMessages = conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      messageType: msg.messageType,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      actions: msg.actions ? JSON.parse(msg.actions) : null
    }));

    const formattedConversation = {
      id: conversation.id,
      novelId: conversation.novelId,
      mode: conversation.mode,
      title: conversation.title,
      settings: conversation.settings ? JSON.parse(conversation.settings) : null,
      messages: formattedMessages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      novel: conversation.novel
    };

    res.json(formattedConversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: '获取对话详情失败' });
  }
});

// 创建新对话
router.post('/', requireAuth, async (req, res) => {
  try {
    const { novelId, mode = 'chat', title, settings } = req.body;
    const userId = req.user.id;

    // 验证小说是否属于当前用户
    if (novelId) {
      const novel = await prisma.novel.findFirst({
        where: { id: novelId, userId }
      });
      if (!novel) {
        return res.status(403).json({ error: '无权访问指定小说' });
      }
    }

    const conversation = await prisma.aIConversation.create({
      data: {
        userId,
        novelId,
        mode,
        title: title || generateDefaultTitle(mode),
        settings: settings ? JSON.stringify(settings) : null
      },
      include: {
        novel: {
          select: { id: true, title: true }
        }
      }
    });

    // 创建欢迎消息
    const welcomeMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: getWelcomeMessage(mode),
        messageType: 'welcome',
        actions: JSON.stringify([
          { key: 'help', label: '查看帮助' },
          { key: 'examples', label: '查看示例' }
        ])
      }
    });

    const formattedConversation = {
      id: conversation.id,
      novelId: conversation.novelId,
      mode: conversation.mode,
      title: conversation.title,
      settings: conversation.settings ? JSON.parse(conversation.settings) : null,
      messages: [{
        id: welcomeMessage.id,
        role: welcomeMessage.role,
        content: welcomeMessage.content,
        timestamp: welcomeMessage.createdAt,
        messageType: welcomeMessage.messageType,
        actions: JSON.parse(welcomeMessage.actions)
      }],
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      novel: conversation.novel
    };

    res.status(201).json(formattedConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: '创建对话失败' });
  }
});

// 更新对话信息
router.put('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title, mode, settings } = req.body;
    const userId = req.user.id;

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (mode !== undefined) updateData.mode = mode;
    if (settings !== undefined) updateData.settings = JSON.stringify(settings);

    const updatedConversation = await prisma.aIConversation.update({
      where: { id: conversationId },
      data: updateData,
      include: {
        novel: {
          select: { id: true, title: true }
        }
      }
    });

    const formattedConversation = {
      id: updatedConversation.id,
      novelId: updatedConversation.novelId,
      mode: updatedConversation.mode,
      title: updatedConversation.title,
      settings: updatedConversation.settings ? JSON.parse(updatedConversation.settings) : null,
      createdAt: updatedConversation.createdAt,
      updatedAt: updatedConversation.updatedAt,
      novel: updatedConversation.novel
    };

    res.json(formattedConversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: '更新对话失败' });
  }
});

// 删除对话
router.delete('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    // 软删除：标记为不活跃
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { isActive: false }
    });

    res.json({ message: '对话已删除' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: '删除对话失败' });
  }
});

// 添加消息到对话
router.post('/:conversationId/messages', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { role, content, messageType, metadata, actions } = req.body;
    const userId = req.user.id;

    // 验证对话权限
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    const message = await prisma.aIMessage.create({
      data: {
        conversationId,
        role,
        content,
        messageType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        actions: actions ? JSON.stringify(actions) : null
      }
    });

    // 更新对话的最后更新时间
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    const formattedMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
      messageType: message.messageType,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      actions: message.actions ? JSON.parse(message.actions) : null
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: '添加消息失败' });
  }
});

// 删除单条消息
router.delete('/:conversationId/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    // 验证对话权限
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    // 验证消息是否属于该对话
    const message = await prisma.aIMessage.findFirst({
      where: {
        id: messageId,
        conversationId
      }
    });

    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 不允许删除欢迎消息
    if (message.messageType === 'welcome') {
      return res.status(400).json({ error: '不能删除欢迎消息' });
    }

    // 删除消息
    await prisma.aIMessage.delete({
      where: { id: messageId }
    });

    // 更新对话的最后更新时间
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.json({ message: '消息已删除' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: '删除消息失败' });
  }
});

// 清空对话消息
router.delete('/:conversationId/messages', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { keepWelcome = false } = req.query; // 新增参数，默认删除所有消息
    const userId = req.user.id;

    // 验证对话权限
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    if (keepWelcome === 'true') {
      // 删除除了欢迎消息之外的所有消息
      await prisma.aIMessage.deleteMany({
        where: {
          conversationId,
          messageType: { not: 'welcome' }
        }
      });
    } else {
      // 删除所有消息（包括欢迎消息）
      await prisma.aIMessage.deleteMany({
        where: {
          conversationId
        }
      });
    }

    // 更新对话的最后更新时间
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.json({ message: '对话已清空' });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({ error: '清空对话失败' });
  }
});

// 获取对话统计信息
router.get('/:conversationId/stats', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // 验证对话权限
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }

    const stats = await prisma.aIMessage.groupBy({
      by: ['role'],
      where: { conversationId },
      _count: { id: true }
    });

    const totalMessages = await prisma.aIMessage.count({
      where: { conversationId }
    });

    const formattedStats = {
      totalMessages,
      messagesByRole: stats.reduce((acc, stat) => {
        acc[stat.role] = stat._count.id;
        return acc;
      }, {}),
      conversationDuration: {
        created: conversation.createdAt,
        lastUpdate: conversation.updatedAt
      }
    };

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    res.status(500).json({ error: '获取对话统计失败' });
  }
});

// 辅助函数
function generateDefaultTitle(mode) {
  const titles = {
    chat: '智能对话',
    enhance: '内容完善',
    check: '质量检查'
  };
  const now = new Date();
  return `${titles[mode] || '对话'} - ${now.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

function getWelcomeMessage(mode) {
  const messages = {
    chat: '你好！我是你的AI创作助手。我可以帮你完善角色设定、扩展世界观、生成章节大纲，还能进行一致性检查。有什么我可以帮助你的吗？',
    enhance: '欢迎来到内容完善模式！我专注于帮你完善角色设定、扩展世界观设定，以及优化情节内容。请告诉我你想要完善什么内容。',
    check: '欢迎来到质量检查模式！我专注于检查内容的一致性、逻辑性和连贯性。请提供需要检查的内容或告诉我要检查什么。'
  };
  return messages[mode] || messages.chat;
}

module.exports = router;
