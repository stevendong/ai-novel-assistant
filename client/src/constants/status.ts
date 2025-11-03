import i18n from '@/i18n'

// 统一的状态管理配置

// 小说状态枚举
export enum NovelStatus {
  CONCEPT = 'concept',
  DRAFT = 'draft',
  PLANNING = 'planning',
  WRITING = 'writing',
  EDITING = 'editing',
  COMPLETED = 'completed',
  PUBLISHED = 'published'
}

// 章节状态枚举
export enum ChapterStatus {
  PLANNING = 'planning',
  OUTLINED = 'outlined',
  WRITING = 'writing',
  REVIEWING = 'reviewing',
  EDITING = 'editing',
  COMPLETED = 'completed'
}

// 小说状态默认文本（用于回退，当缺少翻译时）
const NOVEL_STATUS_DEFAULT_TEXT: Record<NovelStatus, string> = {
  [NovelStatus.CONCEPT]: '构思中',
  [NovelStatus.DRAFT]: '草稿',
  [NovelStatus.PLANNING]: '策划中',
  [NovelStatus.WRITING]: '写作中',
  [NovelStatus.EDITING]: '编辑中',
  [NovelStatus.COMPLETED]: '已完成',
  [NovelStatus.PUBLISHED]: '已发布'
}

// 章节状态默认文本（用于回退，当缺少翻译时）
const CHAPTER_STATUS_DEFAULT_TEXT: Record<ChapterStatus, string> = {
  [ChapterStatus.PLANNING]: '策划中',
  [ChapterStatus.OUTLINED]: '大纲完成',
  [ChapterStatus.WRITING]: '写作中',
  [ChapterStatus.REVIEWING]: '审阅中',
  [ChapterStatus.EDITING]: '编辑中',
  [ChapterStatus.COMPLETED]: '已完成'
}

// 国际化 key 配置
const NOVEL_STATUS_I18N_KEY: Record<NovelStatus, string> = {
  [NovelStatus.CONCEPT]: 'status.novel.concept',
  [NovelStatus.DRAFT]: 'status.novel.draft',
  [NovelStatus.PLANNING]: 'status.novel.planning',
  [NovelStatus.WRITING]: 'status.novel.writing',
  [NovelStatus.EDITING]: 'status.novel.editing',
  [NovelStatus.COMPLETED]: 'status.novel.completed',
  [NovelStatus.PUBLISHED]: 'status.novel.published'
}

const CHAPTER_STATUS_I18N_KEY: Record<ChapterStatus, string> = {
  [ChapterStatus.PLANNING]: 'status.chapter.planning',
  [ChapterStatus.OUTLINED]: 'status.chapter.outlined',
  [ChapterStatus.WRITING]: 'status.chapter.writing',
  [ChapterStatus.REVIEWING]: 'status.chapter.reviewing',
  [ChapterStatus.EDITING]: 'status.chapter.editing',
  [ChapterStatus.COMPLETED]: 'status.chapter.completed'
}

// 小说状态颜色映射
export const NOVEL_STATUS_COLOR: Record<NovelStatus, string> = {
  [NovelStatus.CONCEPT]: '#8c8c8c',
  [NovelStatus.DRAFT]: '#d4b106',
  [NovelStatus.PLANNING]: '#722ed1',
  [NovelStatus.WRITING]: '#1890ff',
  [NovelStatus.EDITING]: '#fa8c16',
  [NovelStatus.COMPLETED]: '#52c41a',
  [NovelStatus.PUBLISHED]: '#13c2c2'
}

// 章节状态颜色映射
export const CHAPTER_STATUS_COLOR: Record<ChapterStatus, string> = {
  [ChapterStatus.PLANNING]: '#8c8c8c',
  [ChapterStatus.OUTLINED]: '#d4b106',
  [ChapterStatus.WRITING]: '#1890ff',
  [ChapterStatus.REVIEWING]: '#722ed1',
  [ChapterStatus.EDITING]: '#fa8c16',
  [ChapterStatus.COMPLETED]: '#52c41a'
}

// 状态排序权重（用于列表排序）
export const NOVEL_STATUS_WEIGHT: Record<NovelStatus, number> = {
  [NovelStatus.CONCEPT]: 1,
  [NovelStatus.DRAFT]: 2,
  [NovelStatus.PLANNING]: 3,
  [NovelStatus.WRITING]: 4,
  [NovelStatus.EDITING]: 5,
  [NovelStatus.COMPLETED]: 6,
  [NovelStatus.PUBLISHED]: 7
}

export const CHAPTER_STATUS_WEIGHT: Record<ChapterStatus, number> = {
  [ChapterStatus.PLANNING]: 1,
  [ChapterStatus.OUTLINED]: 2,
  [ChapterStatus.WRITING]: 3,
  [ChapterStatus.REVIEWING]: 4,
  [ChapterStatus.EDITING]: 5,
  [ChapterStatus.COMPLETED]: 6
}

// 状态过渡规则
export const NOVEL_STATUS_TRANSITIONS: Record<NovelStatus, NovelStatus[]> = {
  [NovelStatus.CONCEPT]: [NovelStatus.DRAFT, NovelStatus.PLANNING],
  [NovelStatus.DRAFT]: [NovelStatus.PLANNING, NovelStatus.WRITING],
  [NovelStatus.PLANNING]: [NovelStatus.WRITING, NovelStatus.DRAFT],
  [NovelStatus.WRITING]: [NovelStatus.EDITING, NovelStatus.PLANNING],
  [NovelStatus.EDITING]: [NovelStatus.COMPLETED, NovelStatus.WRITING],
  [NovelStatus.COMPLETED]: [NovelStatus.PUBLISHED, NovelStatus.EDITING],
  [NovelStatus.PUBLISHED]: [NovelStatus.EDITING]
}

export const CHAPTER_STATUS_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  [ChapterStatus.PLANNING]: [ChapterStatus.OUTLINED, ChapterStatus.WRITING],
  [ChapterStatus.OUTLINED]: [ChapterStatus.WRITING, ChapterStatus.PLANNING],
  [ChapterStatus.WRITING]: [ChapterStatus.REVIEWING, ChapterStatus.OUTLINED],
  [ChapterStatus.REVIEWING]: [ChapterStatus.EDITING, ChapterStatus.WRITING],
  [ChapterStatus.EDITING]: [ChapterStatus.COMPLETED, ChapterStatus.REVIEWING],
  [ChapterStatus.COMPLETED]: [ChapterStatus.EDITING]
}

const translateStatus = (key: string, fallback?: string): string => {
  const translated = i18n.global.t(key) as string
  if (translated && translated !== key) {
    return translated
  }
  return fallback ?? key
}

// 工具函数
export const getNovelStatusText = (status: string): string => {
  const novelStatus = status as NovelStatus
  const key = NOVEL_STATUS_I18N_KEY[novelStatus]
  if (key) {
    return translateStatus(key, NOVEL_STATUS_DEFAULT_TEXT[novelStatus])
  }
  return status
}

export const getChapterStatusText = (status: string): string => {
  const chapterStatus = status as ChapterStatus
  const key = CHAPTER_STATUS_I18N_KEY[chapterStatus]
  if (key) {
    return translateStatus(key, CHAPTER_STATUS_DEFAULT_TEXT[chapterStatus])
  }
  return status
}

export const getNovelStatusColor = (status: string): string => {
  return NOVEL_STATUS_COLOR[status as NovelStatus] || '#8c8c8c'
}

export const getChapterStatusColor = (status: string): string => {
  return CHAPTER_STATUS_COLOR[status as ChapterStatus] || '#8c8c8c'
}

export const isValidNovelStatus = (status: string): status is NovelStatus => {
  return Object.values(NovelStatus).includes(status as NovelStatus)
}

export const isValidChapterStatus = (status: string): status is ChapterStatus => {
  return Object.values(ChapterStatus).includes(status as ChapterStatus)
}

// 获取所有状态选项（用于下拉框等）
export const getAllNovelStatuses = (): { value: NovelStatus; label: string; color: string }[] => {
  return Object.values(NovelStatus).map(status => ({
    value: status,
    label: getNovelStatusText(status),
    color: NOVEL_STATUS_COLOR[status]
  }))
}

export const getAllChapterStatuses = (): { value: ChapterStatus; label: string; color: string }[] => {
  return Object.values(ChapterStatus).map(status => ({
    value: status,
    label: getChapterStatusText(status),
    color: CHAPTER_STATUS_COLOR[status]
  }))
}
