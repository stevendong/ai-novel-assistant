const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const EPub = require('epub-gen');
const { v4: uuidv4 } = require('uuid');
const TurndownService = require('turndown');
const prisma = require('../utils/prismaClient');
const router = express.Router();

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
});

turndownService.addRule('paragraph', {
  filter: 'p',
  replacement: (content) => {
    return '\n\n' + content.trim() + '\n\n';
  }
});

turndownService.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '  \n'
});

const convertHtmlToMarkdown = (html) => {
  if (!html) return '';

  let content = html;

  content = content.replace(/<p>/gi, '\n\n');
  content = content.replace(/<\/p>/gi, '\n\n');
  content = content.replace(/<br\s*\/?>/gi, '  \n');
  content = content.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  content = content.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  content = content.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  content = content.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  content = content.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  content = content.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  content = content.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  content = content.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n');
  content = content.replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n');
  content = content.replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n');
  content = content.replace(/<ul>/gi, '\n');
  content = content.replace(/<\/ul>/gi, '\n');
  content = content.replace(/<ol>/gi, '\n');
  content = content.replace(/<\/ol>/gi, '\n');
  content = content.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  content = content.replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n');
  content = content.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  content = content.replace(/<pre>(.*?)<\/pre>/gi, '```\n$1\n```\n\n');
  content = content.replace(/<a\s+href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  content = content.replace(/<img\s+src=["']([^"']*)["']\s+alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  content = content.replace(/<img\s+src=["']([^"']*)["'][^>]*>/gi, '![]($1)');

  content = content.replace(/<[^>]+>/g, '');

  content = content.replace(/&nbsp;/g, ' ');
  content = content.replace(/&lt;/g, '<');
  content = content.replace(/&gt;/g, '>');
  content = content.replace(/&amp;/g, '&');
  content = content.replace(/&quot;/g, '"');
  content = content.replace(/&#39;/g, "'");

  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.trim();

  return content;
};

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
      author = 'Author Name',
      category = '小说',
      tags = [],
      series,
      seoDescription,
      coverImage,
      featured = true
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

    if (novel.chapters.length === 1) {
      const chapter = novel.chapters[0];
      const filename = `chapter-${chapter.chapterNumber}.mdx`;

      const chapterDate = chapter.updatedAt.toISOString().split('T')[0];

      const escapedDescription = (seoDescription || chapter.outline?.substring(0, 200) || `${novel.title}的第${chapter.chapterNumber}章`)
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ');

      let mdxContent = '---\n';
      mdxContent += `title: "${chapter.title}"\n`;
      mdxContent += `date: "${chapterDate}"\n`;
      mdxContent += `description: "${escapedDescription}"\n`;
      mdxContent += `author: "${author}"\n`;
      mdxContent += `category: "${category}"\n`;

      const chapterTags = [...tags];
      if (novel.genre && !chapterTags.includes(novel.genre)) {
        chapterTags.push(novel.genre);
      }
      if (chapterTags.length > 0) {
        mdxContent += `tags: [${chapterTags.map(t => `"${t}"`).join(', ')}]\n`;
      } else {
        mdxContent += `tags: []\n`;
      }

      mdxContent += `featured: ${featured}\n`;
      mdxContent += `draft: ${chapter.status !== 'published'}\n`;
      mdxContent += '---\n\n';

      if (chapter.content) {
        const markdownContent = convertHtmlToMarkdown(chapter.content);
        mdxContent += markdownContent + '\n';
      } else {
        mdxContent += '*内容待完善*\n';
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(mdxContent);
    } else {
      const archiver = require('archiver');
      const zipFilename = `${novel.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_mdx.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);

      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });

      archive.pipe(res);

      for (const chapter of novel.chapters) {
        const filename = `chapter-${chapter.chapterNumber}.mdx`;
        const chapterDate = chapter.updatedAt.toISOString().split('T')[0];

        const escapedDescription = (seoDescription || chapter.outline?.substring(0, 200) || `${novel.title}的第${chapter.chapterNumber}章`)
          .replace(/"/g, '\\"')
          .replace(/\n/g, ' ');

        let mdxContent = '---\n';
        mdxContent += `title: "${chapter.title}"\n`;
        mdxContent += `date: "${chapterDate}"\n`;
        mdxContent += `description: "${escapedDescription}"\n`;
        mdxContent += `author: "${author}"\n`;
        mdxContent += `category: "${category}"\n`;

        const chapterTags = [...tags];
        if (novel.genre && !chapterTags.includes(novel.genre)) {
          chapterTags.push(novel.genre);
        }
        if (chapterTags.length > 0) {
          mdxContent += `tags: [${chapterTags.map(t => `"${t}"`).join(', ')}]\n`;
        } else {
          mdxContent += `tags: []\n`;
        }

        mdxContent += `featured: ${featured}\n`;
        mdxContent += `draft: ${chapter.status !== 'published'}\n`;
        mdxContent += '---\n\n';

        if (chapter.content) {
          const markdownContent = convertHtmlToMarkdown(chapter.content);
          mdxContent += markdownContent + '\n';
        } else {
          mdxContent += '*内容待完善*\n';
        }

        archive.append(mdxContent, { name: filename });
      }

      await archive.finalize();
    }

  } catch (error) {
    console.error('Error exporting MDX:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export MDX' });
    }
  }
});

// 导出单章节为MDX格式
router.post('/chapter/mdx/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const {
      author = 'Author Name',
      category = '小说',
      tags = [],
      seoDescription,
      coverImage,
      featured = true
    } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: true
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = chapter.novel;
    const filename = `chapter-${chapter.chapterNumber}.mdx`;

    const chapterDate = chapter.updatedAt.toISOString().split('T')[0];

    const escapedDescription = (seoDescription || chapter.outline?.substring(0, 200) || `${novel.title}的第${chapter.chapterNumber}章`)
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ');

    let mdxContent = '---\n';
    mdxContent += `title: "${chapter.title}"\n`;
    mdxContent += `date: "${chapterDate}"\n`;
    mdxContent += `description: "${escapedDescription}"\n`;
    mdxContent += `author: "${author}"\n`;
    mdxContent += `category: "${category}"\n`;

    const chapterTags = [...tags];
    if (novel.genre && !chapterTags.includes(novel.genre)) {
      chapterTags.push(novel.genre);
    }
    if (chapterTags.length > 0) {
      mdxContent += `tags: [${chapterTags.map(t => `"${t}"`).join(', ')}]\n`;
    } else {
      mdxContent += `tags: []\n`;
    }

    mdxContent += `featured: ${featured}\n`;
    mdxContent += `draft: ${chapter.status !== 'published'}\n`;
    mdxContent += '---\n\n';

    if (chapter.content) {
      const markdownContent = convertHtmlToMarkdown(chapter.content);
      mdxContent += markdownContent + '\n';
    } else {
      mdxContent += '*内容待完善*\n';
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(mdxContent);

  } catch (error) {
    console.error('Error exporting chapter as MDX:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export chapter as MDX' });
    }
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
