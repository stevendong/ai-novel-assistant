/**
 * 服务器端文本处理工具函数
 */

/**
 * 计算有效字数，忽略空格、换行等无意义字符
 * @param {string} text 待统计的文本
 * @param {Object} options 配置选项
 * @param {boolean} options.removeMarkdown 是否移除markdown标记
 * @param {boolean} options.removeHtml 是否移除HTML标签
 * @param {boolean} options.removePunctuation 是否移除标点符号
 * @returns {number} 有效字数
 */
function countValidWords(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const {
    removeMarkdown = false,
    removeHtml = false,
    removePunctuation = false
  } = options;

  let processedText = text;

  // 移除HTML标签
  if (removeHtml) {
    processedText = processedText.replace(/<[^>]*>/g, '');
  }

  // 移除Markdown标记
  if (removeMarkdown) {
    processedText = processedText
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, '')
      // 移除加粗标记
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // 移除斜体标记
      .replace(/\*(.*?)\*/g, '$1')
      // 移除删除线标记
      .replace(/~~(.*?)~~/g, '$1')
      // 移除代码块标记
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码标记
      .replace(/`([^`]+)`/g, '$1')
      // 移除图片标记
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // 移除链接标记，保留链接文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // 移除分割线
      .replace(/^---+$/gm, '')
      .replace(/^\*\*\*+$/gm, '')
      // 移除表格标记
      .replace(/\|/g, '');
  }

  // 移除标点符号（可选）
  if (removePunctuation) {
    // 移除中文标点
    processedText = processedText.replace(/[，。；：！？""''（）【】《》]/g, '');
    // 移除英文标点
    processedText = processedText.replace(/[,.;:!?"'()\[\]<>]/g, '');
  }

  // 移除所有空白字符（空格、制表符、换行符等）
  processedText = processedText.replace(/\s+/g, '');

  return processedText.length;
}

/**
 * 计算段落数量
 * @param {string} text 文本内容
 * @returns {number} 段落数量
 */
function countParagraphs(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  return text
    .split(/\n\s*\n/)
    .filter(paragraph => paragraph.trim().length > 0)
    .length;
}

/**
 * 计算句子数量
 * @param {string} text 文本内容
 * @returns {number} 句子数量
 */
function countSentences(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // 先移除HTML和Markdown标记
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 按中文句号、英文句号、感叹号、问号分割
  const sentences = cleanText
    .split(/[。！？.!?]+/)
    .filter(sentence => sentence.trim().length > 0);

  return sentences.length;
}

/**
 * 获取文本统计信息
 * @param {string} text 文本内容
 * @param {Object} options 配置选项
 * @returns {Object} 统计信息
 */
function getTextStats(text, options = {}) {
  return {
    // 有效字数（忽略空格换行）
    validWords: countValidWords(text, options),
    // 原始字符数
    totalChars: text.length,
    // 段落数
    paragraphs: countParagraphs(text),
    // 句子数
    sentences: countSentences(text),
    // 空白字符数
    whitespaceChars: text.length - text.replace(/\s/g, '').length
  };
}

/**
 * 格式化字数显示
 * @param {number} count 字数
 * @param {string} unit 单位（默认为"字"）
 * @returns {string} 格式化后的字数
 */
function formatWordCount(count, unit = '字') {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万${unit}`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}千${unit}`;
  }
  return `${count}${unit}`;
}

/**
 * 计算阅读时间（按中文阅读速度估算）
 * @param {number} wordCount 字数
 * @param {number} wordsPerMinute 每分钟阅读字数，默认300字/分钟
 * @returns {Object} 阅读时间信息
 */
function estimateReadingTime(wordCount, wordsPerMinute = 300) {
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  let text;
  if (minutes < 1) {
    text = '不到1分钟';
  } else if (minutes < 60) {
    text = `约${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    text = remainingMinutes > 0 ? `约${hours}小时${remainingMinutes}分钟` : `约${hours}小时`;
  }

  return { minutes, text };
}

module.exports = {
  countValidWords,
  countParagraphs,
  countSentences,
  getTextStats,
  formatWordCount,
  estimateReadingTime
};