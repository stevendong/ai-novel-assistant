const express = require('express');
const { PrismaClient } = require('@prisma/client');
const consistencyService = require('../services/consistencyService');

const router = express.Router();
const prisma = new PrismaClient();

// 获取章节的一致性检查结果
router.get('/chapters/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { type, severity, resolved } = req.query;

    const where = { chapterId };
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const checks = await prisma.consistencyCheck.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(checks);
  } catch (error) {
    console.error('获取一致性检查结果失败:', error);
    res.status(500).json({ error: '获取一致性检查结果失败' });
  }
});

// 获取小说的一致性检查概览
router.get('/novels/:novelId/overview', async (req, res) => {
  try {
    const { novelId } = req.params;

    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      include: {
        consistencyLog: true
      }
    });

    const stats = {
      totalIssues: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
      resolvedIssues: 0,
      unresolvedIssues: 0,
      typeDistribution: {
        character: 0,
        setting: 0,
        timeline: 0,
        logic: 0
      }
    };

    chapters.forEach(chapter => {
      chapter.consistencyLog.forEach(check => {
        stats.totalIssues++;
        stats.typeDistribution[check.type]++;
        
        if (check.resolved) {
          stats.resolvedIssues++;
        } else {
          stats.unresolvedIssues++;
        }

        switch (check.severity) {
          case 'high':
            stats.highSeverity++;
            break;
          case 'medium':
            stats.mediumSeverity++;
            break;
          case 'low':
            stats.lowSeverity++;
            break;
        }
      });
    });

    res.json({
      stats,
      chapterIssues: chapters.map(chapter => ({
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        issueCount: chapter.consistencyLog.length,
        highestSeverity: chapter.consistencyLog.reduce((max, check) => {
          const severityOrder = { low: 1, medium: 2, high: 3 };
          return severityOrder[check.severity] > severityOrder[max] ? check.severity : max;
        }, 'low')
      }))
    });
  } catch (error) {
    console.error('获取一致性检查概览失败:', error);
    res.status(500).json({ error: '获取一致性检查概览失败' });
  }
});

// 执行单个章节的一致性检查
router.post('/chapters/:chapterId/check', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { types = ['character', 'setting', 'timeline', 'logic'] } = req.body;

    const result = await consistencyService.checkChapterConsistency(chapterId, types);
    
    res.json({
      success: true,
      issuesFound: result.length,
      issues: result
    });
  } catch (error) {
    console.error('章节一致性检查失败:', error);
    res.status(500).json({ error: '章节一致性检查失败' });
  }
});

// 批量检查多个章节
router.post('/novels/:novelId/batch-check', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { chapterIds, types = ['character', 'setting', 'timeline', 'logic'] } = req.body;

    let targetChapterIds = chapterIds;
    if (!targetChapterIds) {
      // 如果没有指定章节，检查所有章节
      const chapters = await prisma.chapter.findMany({
        where: { novelId },
        select: { id: true }
      });
      targetChapterIds = chapters.map(c => c.id);
    }

    const results = await Promise.all(
      targetChapterIds.map(chapterId =>
        consistencyService.checkChapterConsistency(chapterId, types)
      )
    );

    const totalIssues = results.flat();
    
    res.json({
      success: true,
      checkedChapters: targetChapterIds.length,
      totalIssuesFound: totalIssues.length,
      results: targetChapterIds.map((chapterId, index) => ({
        chapterId,
        issuesFound: results[index].length,
        issues: results[index]
      }))
    });
  } catch (error) {
    console.error('批量一致性检查失败:', error);
    res.status(500).json({ error: '批量一致性检查失败' });
  }
});

// 标记问题为已解决
router.patch('/issues/:issueId/resolve', async (req, res) => {
  try {
    const { issueId } = req.params;
    const { resolved = true } = req.body;

    const updatedIssue = await prisma.consistencyCheck.update({
      where: { id: issueId },
      data: { resolved }
    });

    res.json(updatedIssue);
  } catch (error) {
    console.error('更新问题状态失败:', error);
    res.status(500).json({ error: '更新问题状态失败' });
  }
});

// 批量标记问题为已解决
router.patch('/issues/batch-resolve', async (req, res) => {
  try {
    const { issueIds, resolved = true } = req.body;

    const result = await prisma.consistencyCheck.updateMany({
      where: { id: { in: issueIds } },
      data: { resolved }
    });

    res.json({
      success: true,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('批量更新问题状态失败:', error);
    res.status(500).json({ error: '批量更新问题状态失败' });
  }
});

// 删除一致性检查问题
router.delete('/issues/:issueId', async (req, res) => {
  try {
    const { issueId } = req.params;

    await prisma.consistencyCheck.delete({
      where: { id: issueId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除一致性检查问题失败:', error);
    res.status(500).json({ error: '删除一致性检查问题失败' });
  }
});

// 获取问题详情和相关上下文
router.get('/issues/:issueId/details', async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await prisma.consistencyCheck.findUnique({
      where: { id: issueId },
      include: {
        chapter: {
          include: {
            novel: true,
            characters: {
              include: { character: true }
            },
            settings: {
              include: { setting: true }
            }
          }
        }
      }
    });

    if (!issue) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 获取相关上下文信息
    const context = await consistencyService.getIssueContext(issue);

    res.json({
      issue,
      context
    });
  } catch (error) {
    console.error('获取问题详情失败:', error);
    res.status(500).json({ error: '获取问题详情失败' });
  }
});

module.exports = router;