import { apiClient } from './apiClient';

export interface ParsedChapter {
  title: string;
  content: string;
  wordCount: number;
}

export interface ImportMetadata {
  totalWords: number;
  chapterCount: number;
  totalChapters?: number;
  selectedChapters?: number;
}

export interface ParsedNovelData {
  title: string;
  author?: string;
  description?: string;
  chapters: ParsedChapter[];
  metadata: ImportMetadata;
}

export interface ImportOptions {
  genre?: string;
  rating?: string;
  targetWordCount?: number;
  startNumber?: number;
}

export interface ParseResponse {
  success: boolean;
  data: ParsedNovelData;
  filename: string;
}

export interface ImportResponse {
  success: boolean;
  data: any;
  message: string;
}

class ImportService {
  async parseFile(file: File): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/import/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  async createNovelFromFile(
    file: File,
    options: ImportOptions = {}
  ): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.genre) formData.append('genre', options.genre);
    if (options.rating) formData.append('rating', options.rating);
    if (options.targetWordCount) {
      formData.append('targetWordCount', options.targetWordCount.toString());
    }

    const response = await apiClient.post('/api/import/create-novel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  async addChaptersToNovel(
    novelId: string,
    file: File,
    options: ImportOptions = {}
  ): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.startNumber) {
      formData.append('startNumber', options.startNumber.toString());
    }

    const response = await apiClient.post(
      `/api/import/add-chapters/${novelId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  }

  async previewChapters(
    file: File,
    chapterIndices?: number[]
  ): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (chapterIndices && chapterIndices.length > 0) {
      formData.append('chapterIndices', JSON.stringify(chapterIndices));
    }

    const response = await apiClient.post('/api/import/preview-chapters', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  getSupportedFormats(): string[] {
    return ['.txt', '.md', '.markdown', '.docx', '.epub'];
  }

  getSupportedMimeTypes(): string[] {
    return [
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/epub+zip'
    ];
  }

  isValidFileType(file: File): boolean {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    return this.getSupportedFormats().includes(ext);
  }

  getFileExtension(filename: string): string {
    return filename.toLowerCase().slice(filename.lastIndexOf('.'));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default new ImportService();
