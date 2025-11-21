<template>
  <div class="chapter-top-navigation">
    <!-- 返回章节列表按钮 -->
    <a-tooltip :title="t('chapterTopNav.backTooltip')">
      <a-button
        type="text"
        @click="handleBackToList"
        class="nav-button back-button"
      >
        <template #icon><UnorderedListOutlined /></template>
        <span class="nav-text">{{ t('chapterTopNav.backLabel') }}</span>
      </a-button>
    </a-tooltip>

    <!-- 上一章按钮 -->
    <a-tooltip :title="prevChapter ? t('chapterTopNav.prevTooltip', { title: prevChapter.title || t('chapterTopNav.untitled') }) : t('chapterTopNav.noPrev')">
      <a-button
        type="text"
        :disabled="!prevChapter"
        @click="handlePrev"
        class="nav-button"
      >
        <template #icon><LeftOutlined /></template>
        <span class="nav-text">{{ t('chapterTopNav.prevLabel') }}</span>
      </a-button>
    </a-tooltip>

    <!-- 当前章节信息 -->
    <div class="current-chapter">
      <div class="chapter-badge">
        {{ t('chapterTopNav.chapterNumber', { number: currentChapter?.chapterNumber ?? '-' }) }}
      </div>
      <a-divider type="vertical" />
      <div class="chapter-title-display">
        {{ currentChapter?.title || t('chapterTopNav.untitled') }}
      </div>

      <!-- 快速跳转下拉菜单 -->
      <a-dropdown v-model:open="dropdownVisible" :trigger="['click']">
        <a-button type="text" size="small" class="quick-jump-btn">
          <template #icon><DownOutlined /></template>
        </a-button>
        <template #overlay>
          <div class="chapter-jump-menu-container">
            <div class="menu-header">{{ t('chapterTopNav.quickJump') }}</div>
            <div class="menu-list" ref="menuListRef">
              <div
                v-for="chapter in sortedChapters"
                :key="chapter.id"
                :class="[
                  'menu-chapter-item',
                  { active: currentChapter?.id === chapter.id }
                ]"
                @click="handleMenuClick(chapter.id)"
              >
                <span class="menu-chapter-number">
                  {{ t('chapterTopNav.chapterNumber', { number: chapter.chapterNumber }) }}
                </span>
                <span class="menu-chapter-title">
                  {{ chapter.title || t('chapterTopNav.untitled') }}
                </span>
                <a-tag
                  :color="getStatusColor(chapter.status)"
                  size="small"
                >
                  {{ getStatusLabel(chapter.status) }}
                </a-tag>
              </div>

              <!-- 加载更多指示器 -->
              <div v-if="loading || hasMore" class="menu-load-more">
                <a-spin v-if="loading" size="small" />
                <span v-else class="load-more-text">
                  {{ t('chapterTopNav.loadMore', { loaded: formatNumber(allChapters.length), total: formatNumber(total || 0) }) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </a-dropdown>
    </div>

    <!-- 下一章按钮 -->
    <a-tooltip :title="nextChapter ? t('chapterTopNav.nextTooltip', { title: nextChapter.title || t('chapterTopNav.untitled') }) : t('chapterTopNav.noNext')">
      <a-button
        type="text"
        :disabled="!nextChapter"
        @click="handleNext"
        class="nav-button"
      >
        <span class="nav-text">{{ t('chapterTopNav.nextLabel') }}</span>
        <template #icon><RightOutlined /></template>
      </a-button>
    </a-tooltip>

    <!-- 快捷键提示 -->
    <div class="keyboard-hints">
      {{ t('chapterTopNav.keyboardHints', { modifier: isMac ? '⌘' : 'Ctrl' }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'
import { getChapterStatusColor, getChapterStatusText } from '@/constants/status'

interface Props {
  currentChapter?: Chapter
  allChapters: Chapter[]
  loading?: boolean
  hasMore?: boolean
  total?: number
}

interface Emits {
  (e: 'navigate', chapterId: string): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'load-more'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: false,
  total: 0
})

const emit = defineEmits<Emits>()
const router = useRouter()
const { t, locale } = useI18n()

// 菜单容器 ref
const menuListRef = ref<HTMLElement | null>(null)
// 下拉菜单可见状态
const dropdownVisible = ref(false)

// 是否是 Mac 系统
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

const localeCode = computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en-US'))

const formatNumber = (value: number) => value.toLocaleString(localeCode.value)

const getStatusLabel = (status: string) => {
  const key = `chapter.status.${status}`
  const translated = t(key)
  return translated === key ? getChapterStatusText(status) : translated
}

// 排序后的章节列表
const sortedChapters = computed(() => {
  return [...props.allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
})

// 上一章
const prevChapter = computed(() => {
  if (!props.currentChapter) return null
  const currentIndex = sortedChapters.value.findIndex(
    c => c.id === props.currentChapter?.id
  )
  return currentIndex > 0 ? sortedChapters.value[currentIndex - 1] : null
})

// 下一章
const nextChapter = computed(() => {
  if (!props.currentChapter) return null
  const currentIndex = sortedChapters.value.findIndex(
    c => c.id === props.currentChapter?.id
  )
  return currentIndex < sortedChapters.value.length - 1
    ? sortedChapters.value[currentIndex + 1]
    : null
})

// 方法
const handleBackToList = () => {
  router.push({ name: 'chapters' })
}

const handlePrev = () => {
  if (prevChapter.value) {
    emit('navigate', prevChapter.value.id)
    emit('prev')
  }
}

const handleNext = () => {
  if (nextChapter.value) {
    emit('navigate', nextChapter.value.id)
    emit('next')
  }
}

const handleMenuClick = (chapterId: string) => {
  emit('navigate', chapterId)
}

// 滚动加载
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target) return

  const { scrollTop, scrollHeight, clientHeight } = target
  const scrollBottom = scrollHeight - scrollTop - clientHeight

  console.log('[章节顶部导航] 滚动检测', {
    scrollTop,
    scrollHeight,
    clientHeight,
    scrollBottom,
    hasMore: props.hasMore,
    loading: props.loading
  })

  // 距离底部小于 30px 时触发加载
  if (scrollBottom < 30 && props.hasMore && !props.loading) {
    console.log('[章节顶部导航] 触发加载更多')
    emit('load-more')
  }
}

// 监听下拉菜单可见性变化，动态绑定/解绑滚动监听
watch(dropdownVisible, async (visible) => {
  if (visible) {
    // 下拉菜单打开时，等待 DOM 渲染完成后绑定滚动监听
    await nextTick()
    if (menuListRef.value) {
      console.log('[章节顶部导航] 绑定滚动监听器')
      menuListRef.value.addEventListener('scroll', handleScroll)
    }
  } else {
    // 下拉菜单关闭时，解绑滚动监听
    if (menuListRef.value) {
      console.log('[章节顶部导航] 解绑滚动监听器')
      menuListRef.value.removeEventListener('scroll', handleScroll)
    }
  }
})

const getStatusColor = (status: string) => getChapterStatusColor(status)

// 暴露方法供父组件使用
defineExpose({
  handlePrev,
  handleNext
})
</script>

<style scoped>
.chapter-top-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

/* 导航按钮 */
.nav-button {
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.nav-button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.nav-button:disabled {
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 返回按钮特殊样式 */
.back-button {
  margin-right: 12px;
  font-weight: 500;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-2px);
}

.nav-text {
  margin: 0 4px;
}

/* 当前章节信息 */
.current-chapter {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: white;
  font-weight: 600;
  max-width: 600px;
  margin: 0 16px;
}

.chapter-badge {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.chapter-title-display {
  flex: 1;
  text-align: center;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-jump-btn {
  color: white;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.quick-jump-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* 快捷键提示 */
.keyboard-hints {
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 下拉菜单容器 */
.chapter-jump-menu-container {
  min-width: 320px;
  background: var(--theme-bg-container);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.menu-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-text-secondary);
  background: var(--theme-bg-elevated);
  border-bottom: 1px solid var(--theme-border);
}

.menu-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

/* 隐藏滚动条 */
.menu-list::-webkit-scrollbar {
  width: 0px;
  display: none;
}

.menu-list {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.menu-chapter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-chapter-item:hover {
  background: var(--theme-bg-elevated);
}

.menu-chapter-item.active {
  background: var(--theme-selected-bg);
  border-left: 3px solid var(--theme-primary-color, #1488CC);
}

.menu-chapter-number {
  font-size: 12px;
  color: var(--theme-text-secondary);
  white-space: nowrap;
  min-width: 60px;
}

.menu-chapter-title {
  flex: 1;
  font-size: 13px;
  color: var(--theme-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-chapter-item.active .menu-chapter-title {
  font-weight: 600;
  color: var(--theme-primary-color, #1488CC);
}

.menu-load-more {
  padding: 12px;
  text-align: center;
  color: var(--theme-text-secondary);
  font-size: 12px;
}

.load-more-text {
  opacity: 0.7;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .nav-text {
    display: none;
  }

  .keyboard-hints {
    display: none;
  }

  .chapter-title-display {
    font-size: 13px;
  }
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .chapter-top-navigation {
    background: linear-gradient(135deg, #5568d3 0%, #6a4c93 100%);
  }
}
</style>
