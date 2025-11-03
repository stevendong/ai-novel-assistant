<template>
  <div :class="['chapter-nav-sidebar', { collapsed: isCollapsed }]">
    <!-- 头部 -->
    <div class="sidebar-header">
      <div class="header-title" v-if="!isCollapsed">
        <BookOutlined />
        <span>{{ t('chapterNavigation.title') }}</span>
      </div>
      <a-button
        type="text"
        size="small"
        class="collapse-btn"
        @click="toggleCollapse"
      >
        <template #icon>
          <MenuUnfoldOutlined v-if="isCollapsed" />
          <MenuFoldOutlined v-else />
        </template>
      </a-button>
    </div>

    <!-- 新增按钮区域（固定，不滚动） -->
    <div class="sidebar-add-section" v-if="!isCollapsed">
      <a-button
        type="primary"
        size="small"
        block
        @click="showAddChapterModal"
        class="create-chapter-btn"
      >
        <template #icon><PlusOutlined /></template>
        {{ t('chapterNavigation.addChapter') }}
      </a-button>
    </div>

    <!-- 工具栏 -->
    <div class="sidebar-toolbar" v-if="!isCollapsed">
      <a-space direction="vertical" :size="8" style="width: 100%">
        <!-- 搜索框 -->
        <a-input
          v-model:value="searchText"
          :placeholder="t('chapterNavigation.searchPlaceholder')"
          size="small"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>

        <!-- 筛选器 -->
        <a-select
          v-model:value="statusFilter"
          :placeholder="t('chapterNavigation.statusPlaceholder')"
          size="small"
          style="width: 100%"
          allow-clear
        >
          <a-select-option value="">{{ t('chapterNavigation.statusAll') }}</a-select-option>
          <a-select-option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
      </a-space>
    </div>

    <!-- 章节列表 -->
    <div class="chapter-list" v-if="!isCollapsed" ref="chapterListRef">
      <div
        v-for="chapter in filteredChapters"
        :key="chapter.id"
        :class="[
          'chapter-item',
          { active: chapter.id === currentChapterId }
        ]"
        @click="handleSelectChapter(chapter)"
      >
        <div class="chapter-main">
          <div class="chapter-number">
            {{ t('chapterNavigation.chapterNumber', { number: chapter.chapterNumber }) }}
          </div>
          <div class="chapter-title">
            {{ chapter.title }}
          </div>
        </div>

        <div class="chapter-meta">
          <a-tag
            :color="getStatusColor(chapter.status)"
            size="small"
          >
            {{ getStatusLabel(chapter.status) }}
          </a-tag>
          <span class="word-count">
            {{ t('chapterNavigation.wordCount', { count: formatNumber(getWordCount(chapter.content)) }) }}
          </span>
        </div>

        <!-- 进度条（如果有目标字数） -->
        <div
          v-if="chapter.targetWordCount"
          class="chapter-progress"
        >
          <a-progress
            :percent="getProgress(chapter)"
            :show-info="false"
            :stroke-color="{
              '0%': '#667eea',
              '100%': '#764ba2'
            }"
            size="small"
          />
        </div>
      </div>

      <!-- 加载更多指示器 -->
      <div v-if="loading || hasMore" class="load-more-indicator">
        <a-spin v-if="loading" size="small" />
        <span v-if="!loading && hasMore" class="load-more-text">
          {{ t('chapterNavigation.loadMore', { loaded: formatNumber(chapters.length), total: formatNumber(total || 0) }) }}
        </span>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredChapters.length === 0 && !loading" class="empty-state">
        <a-empty
          :image="emptyImage"
          :description="t('chapterNavigation.empty')"
        />
      </div>
    </div>

    <!-- 折叠状态下的新增按钮（固定） -->
    <div class="sidebar-mini-add-section" v-else>
      <a-tooltip :title="t('chapterNavigation.miniAddTooltip', { shortcut: addChapterShortcut })" placement="right">
        <div
          class="chapter-mini-add-btn"
          @click="showAddChapterModal"
        >
          <PlusOutlined />
        </div>
      </a-tooltip>
    </div>

    <!-- 折叠状态下的章节列表 -->
    <div class="chapter-mini-list" v-if="isCollapsed" ref="chapterMiniListRef">
      <a-tooltip
        v-for="chapter in filteredChapters"
        :key="chapter.id"
        :title="t('chapterNavigation.miniItemTooltip', { number: chapter.chapterNumber, title: chapter.title || '-' })"
        placement="right"
      >
        <div
          :class="[
            'chapter-mini-item',
            { active: chapter.id === currentChapterId }
          ]"
          @click="handleSelectChapter(chapter)"
        >
          {{ chapter.chapterNumber }}
        </div>
      </a-tooltip>

      <!-- 加载更多指示器（折叠状态） -->
      <div v-if="loading || hasMore" class="load-more-mini-indicator">
        <a-spin v-if="loading" size="small" />
        <a-tooltip
          v-else-if="hasMore"
          :title="t('chapterNavigation.miniLoadMoreTooltip', { loaded: formatNumber(chapters.length), total: formatNumber(total || 0) })"
          placement="right"
        >
          <div class="load-more-mini-dot">···</div>
        </a-tooltip>
      </div>
    </div>

    <!-- 新增章节对话框 -->
    <a-modal
      v-model:open="addChapterVisible"
      :title="t('chapterNavigation.addModal.title')"
      width="500px"
      @ok="handleAddChapter"
      :confirm-loading="creating"
      @cancel="handleCancelAdd"
    >
      <a-form layout="vertical">
        <a-form-item
          :label="t('chapterNavigation.addModal.titleLabel')"
          :required="true"
          :validate-status="titleError ? 'error' : ''"
          :help="titleError"
        >
          <a-input
            v-model:value="newChapterForm.title"
            :placeholder="t('chapterNavigation.addModal.titlePlaceholder')"
            :maxlength="100"
            show-count
            @pressEnter="handleAddChapter"
          />
        </a-form-item>

        <a-form-item :label="t('chapterNavigation.addModal.outlineLabel')">
          <a-textarea
            v-model:value="newChapterForm.outline"
            :placeholder="t('chapterNavigation.addModal.outlinePlaceholder')"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>

        <a-alert
          :message="t('chapterNavigation.addModal.infoMessage')"
          :description="t('chapterNavigation.addModal.infoDescription', { number: nextChapterNumber, status: getStatusLabel(planningStatus) })"
          type="info"
          show-icon
          style="margin-top: 8px"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message, Empty } from 'ant-design-vue'
import {
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'
import { chapterService } from '@/services/chapterService'
import {
  ChapterStatus,
  getChapterStatusColor,
  getChapterStatusText,
  getAllChapterStatuses
} from '@/constants/status'

interface Props {
  chapters: Chapter[]
  currentChapterId?: string
  loading?: boolean
  novelId?: string
  hasMore?: boolean
  total?: number
  maxChapterNumber?: number
}

interface Emits {
  (e: 'select', chapter: Chapter): void
  (e: 'create'): void
  (e: 'created', chapter: Chapter): void
  (e: 'refresh'): void
  (e: 'load-more'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: false,
  total: 0,
  maxChapterNumber: 0
})

const emit = defineEmits<Emits>()
const { t, locale } = useI18n()

// localStorage key
const STORAGE_KEY = 'chapter-nav-sidebar-collapsed'

// 从 localStorage 读取初始状态
const getInitialCollapsedState = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== null ? JSON.parse(saved) : false
  } catch (error) {
    console.error('Failed to read sidebar state from localStorage:', error)
    return false
  }
}

// 状态
const isCollapsed = ref(getInitialCollapsedState())
const searchText = ref('')
const statusFilter = ref('')
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE
const localeCode = computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en-US'))

const formatNumber = (value: number) => value.toLocaleString(localeCode.value)

const getStatusLabel = (status: string) => {
  const key = `chapter.status.${status}`
  const translated = t(key)
  return translated === key ? getChapterStatusText(status) : translated
}

const statusOptions = computed(() =>
  getAllChapterStatuses().map(status => ({
    value: status.value,
    label: getStatusLabel(status.value)
  }))
)

const planningStatus = ChapterStatus.PLANNING

// 列表容器 ref
const chapterListRef = ref<HTMLElement | null>(null)
const chapterMiniListRef = ref<HTMLElement | null>(null)

// 检测操作系统
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

// 快捷键提示文本
const addChapterShortcut = computed(() => {
  return isMac.value ? '⌘+N' : 'Ctrl+N'
})

// 新增章节相关状态
const addChapterVisible = ref(false)
const creating = ref(false)
const titleError = ref('')
const newChapterForm = ref({
  title: '',
  outline: ''
})

// 过滤后的章节列表
const filteredChapters = computed(() => {
  let result = [...props.chapters]

  // 按章节号排序
  result.sort((a, b) => a.chapterNumber - b.chapterNumber)

  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(
      chapter =>
        chapter.title.toLowerCase().includes(search) ||
        chapter.chapterNumber.toString().includes(search)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(chapter => chapter.status === statusFilter.value)
  }

  return result
})

// 下一个章节号（使用服务端返回的最大章节号）
const nextChapterNumber = computed(() => {
  // 优先使用服务端返回的 maxChapterNumber
  if (props.maxChapterNumber !== undefined && props.maxChapterNumber > 0) {
    return props.maxChapterNumber + 1
  }

  // 降级方案：从已加载章节中计算
  if (props.chapters.length === 0) return 1
  const maxNumber = Math.max(...props.chapters.map(c => c.chapterNumber))
  return maxNumber + 1
})

// 保存状态到 localStorage
const saveCollapsedState = (collapsed: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
    console.log('[章节导航] 状态已保存:', collapsed ? '收起' : '展开')
  } catch (error) {
    console.error('[章节导航] Failed to save sidebar state to localStorage:', error)
  }
}

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 监听状态变化并自动保存
watch(isCollapsed, (newValue) => {
  saveCollapsedState(newValue)
})

// 滚动加载
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target) return

  const { scrollTop, scrollHeight, clientHeight } = target
  const scrollBottom = scrollHeight - scrollTop - clientHeight

  // 距离底部小于 50px 时触发加载
  if (scrollBottom < 50 && props.hasMore && !props.loading) {
    console.log('[章节导航] 触发加载更多')
    emit('load-more')
  }
}

// 生命周期
onMounted(() => {
  console.log('[章节导航] 侧边栏初始状态:', isCollapsed.value ? '收起' : '展开')

  // 添加滚动监听
  if (chapterListRef.value) {
    chapterListRef.value.addEventListener('scroll', handleScroll)
  }
  if (chapterMiniListRef.value) {
    chapterMiniListRef.value.addEventListener('scroll', handleScroll)
  }
})

// 清理
onBeforeUnmount(() => {
  if (chapterListRef.value) {
    chapterListRef.value.removeEventListener('scroll', handleScroll)
  }
  if (chapterMiniListRef.value) {
    chapterMiniListRef.value.removeEventListener('scroll', handleScroll)
  }
})

const handleSelectChapter = (chapter: Chapter) => {
  emit('select', chapter)
}

const handleCreateChapter = () => {
  emit('create')
}

// 显示新增章节对话框
const showAddChapterModal = () => {
  if (!props.novelId) {
    message.error(t('chapterNavigation.messages.selectProject'))
    return
  }

  addChapterVisible.value = true
  newChapterForm.value = {
    title: '',
    outline: ''
  }
  titleError.value = ''
}

// 取消新增
const handleCancelAdd = () => {
  addChapterVisible.value = false
  newChapterForm.value = {
    title: '',
    outline: ''
  }
  titleError.value = ''
}

// 新增章节
const handleAddChapter = async () => {
  // 验证标题
  if (!newChapterForm.value.title.trim()) {
    titleError.value = t('chapterNavigation.validation.titleRequired')
    return
  }

  if (!props.novelId) {
    message.error(t('chapterNavigation.messages.missingNovelId'))
    return
  }

  creating.value = true
  titleError.value = ''

  try {
    const newChapter = await chapterService.createChapter({
      novelId: props.novelId,
      title: newChapterForm.value.title.trim(),
      chapterNumber: nextChapterNumber.value,
      outline: newChapterForm.value.outline.trim()
    })

    message.success(t('chapterNavigation.messages.createSuccess'))
    addChapterVisible.value = false

    // 重置表单
    newChapterForm.value = {
      title: '',
      outline: ''
    }

    // 触发创建成功事件
    emit('created', newChapter)
    emit('refresh')
  } catch (error) {
    console.error('Failed to create chapter:', error)
    message.error(t('chapterNavigation.messages.createFailure'))
  } finally {
    creating.value = false
  }
}

const getStatusColor = (status: string) => getChapterStatusColor(status)

const getWordCount = (content?: string) => {
  if (!content) return 0
  // 移除HTML标签
  const text = content.replace(/<[^>]*>/g, '')
  return text.length
}

const getProgress = (chapter: Chapter) => {
  if (!chapter.targetWordCount) return 0
  const current = getWordCount(chapter.content)
  return Math.min(100, Math.round((current / chapter.targetWordCount) * 100))
}

// 暴露方法供父组件调用
defineExpose({
  showAddChapterModal
})
</script>

<style scoped>
/* ============================================
   章节导航侧边栏 - 使用全局主题变量
   适配亮色和暗色模式
   ============================================ */

/* ============================================
   品牌色和交互状态变量定义
   ============================================ */
.chapter-nav-sidebar {
  /* 品牌色 - 亮色模式 */
  --brand-primary: #1890ff;
  --brand-primary-hover: #40a9ff;
  --brand-primary-active: #096dd9;

  /* 交互状态 - 亮色模式 */
  --hover-bg: rgba(24, 144, 255, 0.04);
  --hover-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  --active-bg: var(--theme-selected-bg);
  --active-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);

  /* 滚动条 - 亮色模式 */
  --scrollbar-track: #f0f0f0;
  --scrollbar-thumb: #d1d5db;
  --scrollbar-thumb-hover: #9ca3af;

  /* 布局 */
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-elevated);
  border-right: 1px solid var(--theme-border);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.3s ease,
              border-color 0.3s ease;
  width: 280px;
  overflow: hidden;
}

.chapter-nav-sidebar.collapsed {
  width: 60px;
}

/* ============================================
   暗色模式变量覆盖
   ============================================ */
@media (prefers-color-scheme: dark) {
  .chapter-nav-sidebar {
    /* 品牌色 - 暗色模式 */
    --brand-primary: #4096ff;
    --brand-primary-hover: #69b1ff;
    --brand-primary-active: #1677ff;

    /* 交互状态 - 暗色模式 */
    --hover-bg: rgba(64, 150, 255, 0.08);
    --hover-shadow: 0 2px 8px rgba(64, 150, 255, 0.15);
    --active-bg: var(--theme-selected-bg);
    --active-shadow: 0 2px 8px rgba(64, 150, 255, 0.2);

    /* 滚动条 - 暗色模式 */
    --scrollbar-track: #2a2a2a;
    --scrollbar-thumb: #404040;
    --scrollbar-thumb-hover: #505050;
  }
}

/* ============================================
   头部区域
   ============================================ */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.collapse-btn {
  flex-shrink: 0;
  color: var(--theme-text-secondary);
  transition: color 0.3s ease;
}

.collapse-btn:hover {
  color: var(--brand-primary);
}

/* ============================================
   新增按钮区域（固定，不滚动）
   ============================================ */
.sidebar-add-section {
  padding: 12px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 新建章节按钮样式 */
.sidebar-add-section :deep(.create-chapter-btn) {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-active) 100%);
  border-color: transparent;
  color: #ffffff;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-add-section :deep(.create-chapter-btn:hover) {
  background: linear-gradient(135deg, var(--brand-primary-hover) 0%, var(--brand-primary) 100%);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
  transform: translateY(-1px);
  border-color: transparent;
}

.sidebar-add-section :deep(.create-chapter-btn:active) {
  background: linear-gradient(135deg, var(--brand-primary-active) 0%, var(--brand-primary) 100%);
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.25);
  transform: translateY(0);
  border-color: transparent;
}

.sidebar-add-section :deep(.create-chapter-btn .anticon) {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.sidebar-add-section :deep(.create-chapter-btn:hover .anticon) {
  transform: rotate(90deg);
}

/* ============================================
   工具栏区域
   ============================================ */
.sidebar-toolbar {
  padding: 12px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* ============================================
   章节列表区域
   ============================================ */
.chapter-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: var(--theme-bg-elevated);
  transition: background-color 0.3s ease;
}

/* 章节项容器 */
.chapter-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--theme-bg-container);
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chapter-item:hover {
  border-color: var(--brand-primary);
  background: var(--hover-bg);
  box-shadow: var(--hover-shadow);
  transform: translateY(-1px);
}

.chapter-item.active {
  border-color: var(--theme-selected-border);
  background: var(--active-bg);
  box-shadow: var(--active-shadow);
}

/* 章节主体信息 */
.chapter-main {
  margin-bottom: 8px;
}

.chapter-number {
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  opacity: 0.7;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
  transition: color 0.3s ease;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.3s ease;
}

.chapter-item:hover .chapter-title {
  color: var(--brand-primary);
}

.chapter-item.active .chapter-title {
  color: var(--brand-primary-active);
  font-weight: 600;
}

/* 章节元信息 */
.chapter-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.word-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  transition: color 0.3s ease;
}

/* 进度条 */
.chapter-progress {
  margin-top: 8px;
}

/* 空状态 */
.empty-state {
  padding: 32px 16px;
  text-align: center;
}

/* 加载更多指示器 */
.load-more-indicator {
  padding: 16px;
  text-align: center;
  color: var(--theme-text-secondary);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.load-more-text {
  opacity: 0.7;
  font-weight: 500;
}

/* ============================================
   折叠状态 - 缩略视图
   ============================================ */

/* 折叠状态下的新增按钮区域（固定） */
.sidebar-mini-add-section {
  padding: 8px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 折叠状态下的新增按钮 */
.chapter-mini-add-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-active) 100%);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 16px;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
}

.chapter-mini-add-btn:hover {
  background: linear-gradient(135deg, var(--brand-primary-hover) 0%, var(--brand-primary) 100%);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transform: scale(1.1);
}

.chapter-mini-add-btn:active {
  background: linear-gradient(135deg, var(--brand-primary-active) 0%, var(--brand-primary) 100%);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.35);
  transform: scale(1.05);
}

.chapter-mini-add-btn .anticon {
  transition: transform 0.3s ease;
}

.chapter-mini-add-btn:hover .anticon {
  transform: rotate(90deg);
}

/* 折叠状态下的章节列表 */
.chapter-mini-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: var(--theme-bg-elevated);
  transition: background-color 0.3s ease;
}

.chapter-mini-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  background: var(--theme-bg-container);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-text-secondary);
}

.chapter-mini-item:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary-hover);
  background: var(--hover-bg);
  transform: scale(1.05);
}

.chapter-mini-item.active {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: #ffffff;
  box-shadow: var(--active-shadow);
}

/* 折叠状态加载指示器 */
.load-more-mini-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  margin-top: 8px;
}

.load-more-mini-dot {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: var(--theme-bg-container);
  border: 2px solid var(--theme-border);
  border-radius: 6px;
  color: var(--theme-text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: default;
  opacity: 0.6;
}

/* ============================================
   滚动条样式 - 隐藏
   ============================================ */
.chapter-list::-webkit-scrollbar,
.chapter-mini-list::-webkit-scrollbar {
  width: 0px;
  display: none;
}

.chapter-list {
  /* Firefox */
  scrollbar-width: none;
  /* IE 和 Edge */
  -ms-overflow-style: none;
}

.chapter-mini-list {
  /* Firefox */
  scrollbar-width: none;
  /* IE 和 Edge */
  -ms-overflow-style: none;
}
</style>
