const express = require('express');
const router = express.Router();
const multer = require('multer');
const importService = require('../services/importService');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.md', '.docx', '.epub', '.markdown'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;

    const result = await importService.parseFile(buffer, originalname, null);

    res.json({
      success: true,
      data: result,
      filename: originalname
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      error: 'Failed to parse file',
      message: error.message
    });
  }
});

router.post('/create-novel', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;

    const { originalname, buffer } = req.file;
    const { genre, rating, targetWordCount } = req.body;

    const importData = await importService.parseFile(buffer, originalname, null);

    const novel = await importService.createNovelFromImport(
      prisma,
      userId,
      importData,
      {
        genre: genre || 'Fantasy',
        rating: rating || 'General',
        targetWordCount: targetWordCount ? parseInt(targetWordCount) : null
      }
    );

    const fullNovel = await prisma.novel.findUnique({
      where: { id: novel.id },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        _count: {
          select: {
            chapters: true,
            characters: true,
            settings: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: fullNovel,
      message: `Successfully imported "${fullNovel.title}" with ${fullNovel.chapters.length} chapters`
    });
  } catch (error) {
    console.error('Import novel error:', error);
    res.status(500).json({
      error: 'Failed to import novel',
      message: error.message
    });
  }
});

router.post('/add-chapters/:novelId', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { novelId } = req.params;
    const { startNumber } = req.body;
    const { originalname, buffer } = req.file;
    const userId = req.user.id;

    const novel = await prisma.novel.findUnique({
      where: { id: novelId }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    if (novel.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this novel' });
    }

    const importData = await importService.parseFile(buffer, originalname, null);

    const chapters = await importService.addChaptersToNovel(
      prisma,
      novelId,
      importData.chapters,
      startNumber ? parseInt(startNumber) : null
    );

    res.json({
      success: true,
      data: chapters,
      message: `Successfully added ${chapters.length} chapters to the novel`
    });
  } catch (error) {
    console.error('Add chapters error:', error);
    res.status(500).json({
      error: 'Failed to add chapters',
      message: error.message
    });
  }
});

router.post('/preview-chapters', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    const { chapterIndices } = req.body;

    const importData = await importService.parseFile(buffer, originalname, null);

    let chapters = importData.chapters;
    if (chapterIndices) {
      const indices = JSON.parse(chapterIndices);
      chapters = chapters.filter((_, index) => indices.includes(index));
    }

    res.json({
      success: true,
      data: {
        title: importData.title,
        chapters,
        metadata: {
          totalChapters: importData.chapters.length,
          selectedChapters: chapters.length,
          totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
        }
      }
    });
  } catch (error) {
    console.error('Preview chapters error:', error);
    res.status(500).json({
      error: 'Failed to preview chapters',
      message: error.message
    });
  }
});

module.exports = router;
