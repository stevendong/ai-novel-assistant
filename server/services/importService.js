const mammoth = require('mammoth');
const { EPub } = require('epub2');
const MarkdownIt = require('markdown-it');
const JSZip = require('jszip');
const fs = require('fs-extra');
const path = require('path');
const { countValidWords } = require('../utils/textUtils');

const md = new MarkdownIt();

class ImportService {
  async parseFile(buffer, filename, fileType) {
    const ext = fileType || path.extname(filename).toLowerCase().slice(1);

    switch (ext) {
      case 'txt':
        return this.parseTxt(buffer);
      case 'md':
      case 'markdown':
        return this.parseMarkdown(buffer);
      case 'docx':
        return this.parseDocx(buffer);
      case 'epub':
        return this.parseEpub(buffer);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  parseTxt(buffer) {
    const content = buffer.toString('utf-8');
    const chapters = this.detectChapters(content);

    return {
      title: this.extractTitle(content),
      chapters,
      metadata: {
        totalWords: countValidWords(content),
        chapterCount: chapters.length
      }
    };
  }

  parseMarkdown(buffer) {
    const content = buffer.toString('utf-8');
    const chapters = this.detectChaptersMarkdown(content);

    return {
      title: this.extractTitle(content),
      chapters: chapters.map(ch => ({
        ...ch,
        content: md.render(ch.content)
      })),
      metadata: {
        totalWords: countValidWords(content),
        chapterCount: chapters.length
      }
    };
  }

  async parseDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;
    const chapters = this.detectChapters(content);

    return {
      title: this.extractTitle(content),
      chapters,
      metadata: {
        totalWords: countValidWords(content),
        chapterCount: chapters.length
      }
    };
  }

  async parseEpub(buffer) {
    const tempDir = path.join(__dirname, '../temp');
    await fs.ensureDir(tempDir);

    const tempFile = path.join(tempDir, `temp-${Date.now()}.epub`);
    await fs.writeFile(tempFile, buffer);

    return new Promise((resolve, reject) => {
      const epub = new EPub(tempFile);

      epub.on('end', async () => {
        try {
          const metadata = {
            title: epub.metadata.title || 'Untitled',
            author: epub.metadata.creator || '',
            description: epub.metadata.description || ''
          };

          const chapters = [];
          const flow = epub.flow || [];

          for (let i = 0; i < flow.length; i++) {
            const chapter = flow[i];
            const chapterContent = await new Promise((res, rej) => {
              epub.getChapter(chapter.id, (error, text) => {
                if (error) rej(error);
                else res(text);
              });
            });

            const textContent = this.stripHtml(chapterContent);
            if (textContent.trim().length > 100) {
              chapters.push({
                title: chapter.title || `Chapter ${i + 1}`,
                content: textContent,
                wordCount: countValidWords(textContent)
              });
            }
          }

          await fs.remove(tempFile);

          resolve({
            title: metadata.title,
            author: metadata.author,
            description: metadata.description,
            chapters,
            metadata: {
              totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
              chapterCount: chapters.length
            }
          });
        } catch (error) {
          await fs.remove(tempFile);
          reject(error);
        }
      });

      epub.on('error', async (error) => {
        await fs.remove(tempFile);
        reject(error);
      });

      epub.parse();
    });
  }

  detectChapters(content) {
    const lines = content.split('\n');
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 0;

    const chapterPatterns = [
      /^(?:chapter|第)\s*(\d+|[一二三四五六七八九十百千]+)\s*[：:章]?\s*(.*?)$/i,
      /^(?:ch\.?|chap\.?)\s*(\d+)\s*[：:-]?\s*(.*?)$/i,
      /^(\d+)\s*[\.、]\s*(.*?)$/,
      /^#\s+(.+)$/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isChapterStart = false;

      for (const pattern of chapterPatterns) {
        const match = line.match(pattern);
        if (match) {
          if (currentChapter && currentChapter.content.trim()) {
            chapters.push({
              title: currentChapter.title,
              content: currentChapter.content.trim(),
              wordCount: countValidWords(currentChapter.content)
            });
          }

          chapterNumber++;
          currentChapter = {
            title: line || `Chapter ${chapterNumber}`,
            content: ''
          };
          isChapterStart = true;
          break;
        }
      }

      if (!isChapterStart) {
        if (!currentChapter) {
          currentChapter = {
            title: `Chapter 1`,
            content: ''
          };
          chapterNumber = 1;
        }
        currentChapter.content += line + '\n';
      }
    }

    if (currentChapter && currentChapter.content.trim()) {
      chapters.push({
        title: currentChapter.title,
        content: currentChapter.content.trim(),
        wordCount: countValidWords(currentChapter.content)
      });
    }

    if (chapters.length === 0 && content.trim()) {
      chapters.push({
        title: 'Chapter 1',
        content: content.trim(),
        wordCount: countValidWords(content)
      });
    }

    return chapters;
  }

  detectChaptersMarkdown(content) {
    const lines = content.split('\n');
    const chapters = [];
    let currentChapter = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,2})\s+(.+)$/);

      if (headerMatch) {
        if (currentChapter && currentChapter.content.trim()) {
          chapters.push({
            title: currentChapter.title,
            content: currentChapter.content.trim(),
            wordCount: countValidWords(currentChapter.content)
          });
        }

        currentChapter = {
          title: headerMatch[2].trim(),
          content: ''
        };
      } else {
        if (!currentChapter) {
          currentChapter = {
            title: 'Chapter 1',
            content: ''
          };
        }
        currentChapter.content += line + '\n';
      }
    }

    if (currentChapter && currentChapter.content.trim()) {
      chapters.push({
        title: currentChapter.title,
        content: currentChapter.content.trim(),
        wordCount: countValidWords(currentChapter.content)
      });
    }

    if (chapters.length === 0 && content.trim()) {
      chapters.push({
        title: 'Chapter 1',
        content: content.trim(),
        wordCount: countValidWords(content)
      });
    }

    return chapters;
  }

  extractTitle(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 100) {
        return firstLine.replace(/^[#\s]+/, '');
      }
    }
    return 'Untitled Novel';
  }

  stripHtml(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async createNovelFromImport(prisma, userId, importData, options = {}) {
    const {
      genre = 'Fantasy',
      rating = 'General',
      targetWordCount = null
    } = options;

    const totalWords = importData.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    const novel = await prisma.novel.create({
      data: {
        userId,
        title: importData.title || 'Untitled Novel',
        description: importData.description || '',
        genre,
        rating,
        status: 'in_progress',
        wordCount: totalWords,
        targetWordCount: targetWordCount || totalWords * 1.2,
        aiSettings: {
          create: {
            rating: rating
          }
        }
      }
    });

    for (let i = 0; i < importData.chapters.length; i++) {
      const chapter = importData.chapters[i];
      await prisma.chapter.create({
        data: {
          novelId: novel.id,
          chapterNumber: i + 1,
          title: chapter.title,
          content: chapter.content,
          outline: '',
          plotPoints: [],
          status: 'completed',
          wordCount: chapter.wordCount
        }
      });
    }

    return novel;
  }

  async addChaptersToNovel(prisma, novelId, chapters, startNumber = null) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: { chapters: true }
    });

    if (!novel) {
      throw new Error('Novel not found');
    }

    const nextChapterNumber = startNumber || (novel.chapters.length + 1);
    const createdChapters = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const created = await prisma.chapter.create({
        data: {
          novelId,
          chapterNumber: nextChapterNumber + i,
          title: chapter.title,
          content: chapter.content,
          outline: '',
          plotPoints: [],
          status: 'completed',
          wordCount: chapter.wordCount
        }
      });
      createdChapters.push(created);
    }

    const newWordCount = novel.wordCount + chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    await prisma.novel.update({
      where: { id: novelId },
      data: { wordCount: newWordCount }
    });

    return createdChapters;
  }
}

module.exports = new ImportService();
