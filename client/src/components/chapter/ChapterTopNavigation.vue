<template>
  <div class="chapter-top-navigation">
    <!-- 返回章节列表按钮 -->
    <a-tooltip title="返回章节列表">
      <a-button
        type="text"
        @click="handleBackToList"
        class="nav-button back-button"
      >
        <template #icon><UnorderedListOutlined /></template>
        <span class="nav-text">章节列表</span>
      </a-button>
    </a-tooltip>

    <!-- 上一章按钮 -->
    <a-tooltip :title="prevChapter ? `上一章：${prevChapter.title}` : '没有上一章'">
      <a-button
        type="text"
        :disabled="!prevChapter"
        @click="handlePrev"
        class="nav-button"
      >
        <template #icon><LeftOutlined /></template>
        <span class="nav-text">上一章</span>
      </a-button>
    </a-tooltip>

    <!-- 当前章节信息 -->
    <div class="current-chapter">
      <div class="chapter-badge">
        第{{ currentChapter?.chapterNumber }}章
      </div>
      <a-divider type="vertical" />
      <div class="chapter-title-display">
        {{ currentChapter?.title || '未命名章节' }}
      </div>

      <!-- 快速跳转下拉菜单 -->
      <a-dropdown :trigger="['click']">
        <a-button type="text" size="small" class="quick-jump-btn">
          <template #icon><DownOutlined /></template>
        </a-button>
        <template #overlay>
          <a-menu
            class="chapter-jump-menu"
            :selected-keys="currentChapter ? [currentChapter.id] : []"
            @click="handleMenuClick"
          >
            <a-menu-item-group title="快速跳转">
              <a-menu-item
                v-for="chapter in allChapters"
                :key="chapter.id"
              >
                <div class="menu-chapter-item">
                  <span class="menu-chapter-number">
                    第{{ chapter.chapterNumber }}章
                  </span>
                  <span class="menu-chapter-title">
                    {{ chapter.title }}
                  </span>
                  <a-tag
                    :color="getStatusColor(chapter.status)"
                    size="small"
                  >
                    {{ getStatusText(chapter.status) }}
                  </a-tag>
                </div>
              </a-menu-item>
            </a-menu-item-group>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- 下一章按钮 -->
    <a-tooltip :title="nextChapter ? `下一章：${nextChapter.title}` : '没有下一章'">
      <a-button
        type="text"
        :disabled="!nextChapter"
        @click="handleNext"
        class="nav-button"
      >
        <span class="nav-text">下一章</span>
        <template #icon><RightOutlined /></template>
      </a-button>
    </a-tooltip>

    <!-- 快捷键提示 -->
    <div class="keyboard-hints">
      {{ isMac ? '⌘' : 'Ctrl' }} + ←/→
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'

interface Props {
  currentChapter?: Chapter
  allChapters: Chapter[]
}

interface Emits {
  (e: 'navigate', chapterId: string): void
  (e: 'prev'): void
  (e: 'next'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

// 是否是 Mac 系统
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

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

const handleMenuClick = ({ key }: { key: string }) => {
  emit('navigate', key)
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planning: 'blue',
    writing: 'orange',
    reviewing: 'purple',
    completed: 'green'
  }
  return colors[status] || 'default'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    planning: '规划中',
    writing: '写作中',
    reviewing: 'purple',
    completed: '已完成'
  }
  return texts[status] || status
}

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* 下拉菜单样式 */
.chapter-jump-menu {
  max-height: 400px;
  overflow-y: auto;
  min-width: 300px;
}

.menu-chapter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-chapter-number {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.menu-chapter-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
