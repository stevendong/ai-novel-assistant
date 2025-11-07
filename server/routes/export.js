const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const EPub = require('epub-gen');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prismaClient');
const router = express.Router();

// 确保导出目录存在
const EXPORT_DIR = path.join(__dirname, '../exports');
fs.ensureDirSync(EXPORT_DIR);

// 导出为TXT格式
router.post('/txt/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { includeOutlines, includeMeta } = req.body;

    // 获取小说完整数据
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            characters: {
              include: { character: true }
            },
            settings: {
              include: { setting: true }
            }
          }
        },
        characters: true,
        settings: true
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 生成TXT内容
    let content = '';
    
    // 添加元信息
    if (includeMeta) {
      content += `标题：${novel.title}\n`;
      if (novel.description) content += `简介：${novel.description}\n`;
      if (novel.genre) content += `类型：${novel.genre}\n`;
      content += `创建时间：${novel.createdAt.toLocaleDateString()}\n`;
      content += `最后更新：${novel.updatedAt.toLocaleDateString()}\n`;
      content += '\n' + '='.repeat(50) + '\n\n';
    }

    // 添加章节内容
    for (const chapter of novel.chapters) {
      content += `第${chapter.chapterNumber}章　${chapter.title}\n\n`;
      
      // 包含大纲
      if (includeOutlines && chapter.outline) {
        content += `[大纲]\n${chapter.outline}\n\n`;
      }

      // 正文内容
      if (chapter.content) {
        content += chapter.content + '\n\n';
      }

      // 处理插图标记
      if (chapter.illustrations) {
        const illustrations = Array.isArray(chapter.illustrations) ? chapter.illustrations : [];
        illustrations.forEach(ill => {
          content = content.replace(
            new RegExp(`!\\[${ill.description}\\]\\(pos:${ill.position}\\)`, 'g'),
            `[插图：${ill.description}]`
          );
        });
      }

      content += '\n' + '-'.repeat(30) + '\n\n';
    }

    // 保存文件
    const filename = `${novel.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_${Date.now()}.txt`;
    const filePath = path.join(EXPORT_DIR, filename);
    
    await fs.writeFile(filePath, content, 'utf8');

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/export/download/${filename}`,
      fileSize: content.length
    });

  } catch (error) {
    console.error('Error exporting TXT:', error);
    res.status(500).json({ error: 'Failed to export TXT' });
  }
});

// 导出单章节为TXT格式
router.post('/chapter/txt/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { includeOutline, includeMeta } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: true,
        characters: {
          include: { character: true }
        },
        settings: {
          include: { setting: true }
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    let content = '';

    if (includeMeta) {
      content += `小说：${chapter.novel.title}\n`;
      content += `章节：第${chapter.chapterNumber}章　${chapter.title}\n`;
      content += `创建时间：${chapter.createdAt.toLocaleDateString()}\n`;
      content += `最后更新：${chapter.updatedAt.toLocaleDateString()}\n`;
      content += '\n' + '='.repeat(50) + '\n\n';
    }

    content += `第${chapter.chapterNumber}章　${chapter.title}\n\n`;

    if (includeOutline && chapter.outline) {
      content += `[大纲]\n${chapter.outline}\n\n`;
    }

    if (chapter.content) {
      content += chapter.content + '\n\n';
    }

    if (chapter.illustrations) {
      const illustrations = Array.isArray(chapter.illustrations) ? chapter.illustrations : [];
      illustrations.forEach(ill => {
        content = content.replace(
          new RegExp(`!\\[${ill.description}\\]\\(pos:${ill.position}\\)`, 'g'),
          `[插图：${ill.description}]`
        );
      });
    }

    const safeTitle = chapter.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const filename = `${chapter.novel.title}_第${chapter.chapterNumber}章_${safeTitle}_${Date.now()}.txt`;
    const filePath = path.join(EXPORT_DIR, filename);

    await fs.writeFile(filePath, content, 'utf8');

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/export/download/${filename}`,
      fileSize: content.length
    });

  } catch (error) {
    console.error('Error exporting chapter as TXT:', error);
    res.status(500).json({ error: 'Failed to export chapter' });
  }
});

// 导出为EPUB格式
router.post('/epub/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { includeOutlines } = req.body;

    // 获取小说完整数据
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 准备EPUB内容
    const chapters = novel.chapters.map(chapter => {
      let content = '';
      
      if (includeOutlines && chapter.outline) {
        content += `<div class="outline"><h3>大纲</h3><p>${chapter.outline}</p></div>`;
      }
      
      if (chapter.content) {
        // 将换行转换为HTML段落
        const htmlContent = chapter.content
          .split('\n\n')
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
        content += htmlContent;
      }

      return {
        title: `第${chapter.chapterNumber}章　${chapter.title}`,
        data: content || '<p>内容待完善</p>'
      };
    });

    // EPUB选项
    const options = {
      title: novel.title,
      author: '作者',
      description: novel.description || '',
      publisher: 'AI Novel Assistant',
      cover: '', // 后续可添加封面
      css: `
        body { font-family: serif; line-height: 1.6; }
        .outline { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
        p { text-indent: 2em; margin: 1em 0; }
      `,
      content: chapters,
      verbose: false
    };

    // 生成EPUB文件
    const filename = `${novel.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_${Date.now()}.epub`;
    const filePath = path.join(EXPORT_DIR, filename);

    const epub = new EPub(options, filePath);
    
    await new Promise((resolve, reject) => {
      epub.promise.then(() => {
        console.log('EPUB generated successfully');
        resolve();
      }).catch(reject);
    });

    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/export/download/${filename}`,
      fileSize: stats.size
    });

  } catch (error) {
    console.error('Error exporting EPUB:', error);
    res.status(500).json({ error: 'Failed to export EPUB' });
  }
});

// 下载导出的文件
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(EXPORT_DIR, filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.txt': 'text/plain',
      '.epub': 'application/epub+zip',
      '.mdx': 'text/markdown',
      '.zip': 'application/zip'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// 获取导出历史
router.get('/history/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const exportDir = EXPORT_DIR;
    
    // 获取小说标题用于匹配文件
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { title: true }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 读取导出目录
    const files = await fs.readdir(exportDir);
    const novelFiles = [];

    for (const file of files) {
      const filePath = path.join(exportDir, file);
      const stats = await fs.stat(filePath);
      
      // 简单匹配文件名（实际应用中可以使用更精确的方法）
      if (file.includes(novel.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_'))) {
        novelFiles.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          type: path.extname(file).substring(1).toUpperCase(),
          downloadUrl: `/api/export/download/${file}`
        });
      }
    }

    // 按创建时间排序
    novelFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({
      novelId,
      exports: novelFiles
    });

  } catch (error) {
    console.error('Error fetching export history:', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
});

// 导出为MDX格式（用于博客发布）
router.post('/mdx/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const {
      chapterIds,
      author = 'AI Novel Assistant',
      category = 'novel',
      tags = [],
      series,
      seoDescription,
      coverImage
    } = req.body;

    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: {
          where: chapterIds ? { id: { in: chapterIds } } : undefined,
          orderBy: { chapterNumber: 'asc' }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const exportedFiles = [];

    for (const chapter of novel.chapters) {
      const slug = `${novel.title}-chapter-${chapter.chapterNumber}`
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      const wordCount = chapter.wordCount || 0;
      const readingTime = Math.ceil(wordCount / 200);

      const frontmatter = {
        title: `${novel.title} - 第${chapter.chapterNumber}章: ${chapter.title}`,
        author,
        publishedAt: chapter.updatedAt.toISOString(),
        category,
        tags: [...tags, novel.genre || 'fiction', 'novel'],
        series: series || novel.title,
        chapterNumber: chapter.chapterNumber,
        description: seoDescription || chapter.outline || `${novel.title}的第${chapter.chapterNumber}章`,
        wordCount,
        readingTime: `${readingTime} min read`,
        draft: chapter.status !== 'published',
        slug
      };

      if (coverImage) {
        frontmatter.coverImage = coverImage;
      }

      if (novel.description) {
        frontmatter.novelDescription = novel.description;
      }

      let mdxContent = '---\n';
      for (const [key, value] of Object.entries(frontmatter)) {
        if (Array.isArray(value)) {
          mdxContent += `${key}:\n${value.map(v => `  - ${v}`).join('\n')}\n`;
        } else if (typeof value === 'string' && value.includes('\n')) {
          mdxContent += `${key}: |\n${value.split('\n').map(line => `  ${line}`).join('\n')}\n`;
        } else {
          mdxContent += `${key}: ${JSON.stringify(value)}\n`;
        }
      }
      mdxContent += '---\n\n';

      if (chapter.outline) {
        mdxContent += `## 章节概要\n\n${chapter.outline}\n\n`;
      }

      mdxContent += `## 正文\n\n`;

      if (chapter.content) {
        const contentParagraphs = chapter.content
          .split('\n\n')
          .map(para => para.trim())
          .filter(para => para.length > 0)
          .join('\n\n');

        mdxContent += contentParagraphs + '\n\n';
      } else {
        mdxContent += '*内容待完善*\n\n';
      }

      if (chapter.plotPoints) {
        mdxContent += `---\n\n## 章节要点\n\n${chapter.plotPoints}\n\n`;
      }

      mdxContent += `---\n\n`;
      mdxContent += `*本章节由 AI Novel Assistant 生成*\n`;
      mdxContent += `*更新时间: ${chapter.updatedAt.toLocaleDateString('zh-CN')}*\n`;

      const filename = `${slug}.mdx`;
      const filePath = path.join(EXPORT_DIR, filename);

      await fs.writeFile(filePath, mdxContent, 'utf8');

      exportedFiles.push({
        filename,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        downloadUrl: `/api/export/download/${filename}`,
        fileSize: mdxContent.length,
        slug
      });
    }

    res.json({
      success: true,
      novelTitle: novel.title,
      exportedChapters: exportedFiles.length,
      files: exportedFiles
    });

  } catch (error) {
    console.error('Error exporting MDX:', error);
    res.status(500).json({ error: 'Failed to export MDX' });
  }
});

// 批量下载MDX文件为ZIP
router.post('/mdx/:novelId/batch', async (req, res) => {
  try {
    const { novelId } = req.params;
    const archiver = require('archiver');

    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const zipFilename = `${novel.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_mdx_${Date.now()}.zip`;
    const zipPath = path.join(EXPORT_DIR, zipFilename);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.json({
        success: true,
        filename: zipFilename,
        downloadUrl: `/api/export/download/${zipFilename}`,
        fileSize: archive.pointer()
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    for (const chapter of novel.chapters) {
      const slug = `${novel.title}-chapter-${chapter.chapterNumber}`
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      const filename = `${slug}.mdx`;
      const filePath = path.join(EXPORT_DIR, filename);

      if (await fs.pathExists(filePath)) {
        archive.file(filePath, { name: filename });
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('Error creating MDX batch:', error);
    res.status(500).json({ error: 'Failed to create batch export' });
  }
});

// 清理旧的导出文件
router.delete('/cleanup', async (req, res) => {
  try {
    const { olderThan } = req.query;
    const days = parseInt(olderThan) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const files = await fs.readdir(EXPORT_DIR);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(EXPORT_DIR, file);
      const stats = await fs.stat(filePath);

      if (stats.birthtime < cutoffDate) {
        await fs.remove(filePath);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      deletedFiles: deletedCount,
      message: `Cleaned up ${deletedCount} files older than ${days} days`
    });

  } catch (error) {
    console.error('Error cleaning up exports:', error);
    res.status(500).json({ error: 'Failed to cleanup export files' });
  }
});

module.exports = router;
