<template>
  <div class="ai-suggestion-list">
    <!-- 头部 -->
    <div class="suggestion-header">
      <ThunderboltOutlined class="icon" />
      <span class="title">AI续写建议</span>
      <a-tag v-if="loading" color="processing" size="small">
        生成中...
      </a-tag>
    </div>

    <!-- 建议列表 -->
    <div class="suggestion-items">
      <!-- 实际建议列表 -->
      <template v-if="!loading && validItems.length > 0">
        <div
          v-for="(item, index) in validItems"
          :key="item.id"
          :class="['suggestion-item', { selected: index === selectedIndex }]"
          @click="selectItem(index)"
          @mouseenter="selectedIndex = index"
        >
          <!-- 序号 -->
          <div class="item-number">{{ index + 1 }}</div>

          <!-- 文本内容 -->
          <div class="item-content">
            <div class="item-text">{{ item.text }}</div>

            <!-- 置信度指示器 -->
            <div class="item-meta">
              <div class="confidence-bar">
                <div
                  class="confidence-fill"
                  :style="{ width: `${item.confidence * 100}%` }"
                ></div>
              </div>
              <span class="confidence-text">
                {{ Math.round(item.confidence * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-if="!loading && validItems.length === 0" class="empty-state">
        <a-empty
          :image="emptyImage"
          description="暂无建议"
        />
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <a-spin size="small" />
        <span>AI正在思考...</span>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="suggestion-footer">
      <div class="hints">
        <span class="hint">
          <span class="hint-icon">⌨️</span>
          <kbd>↑</kbd><kbd>↓</kbd> 选择
        </span>
        <span class="hint">
          <kbd>Tab</kbd> 接受
        </span>
        <span class="hint">
          <kbd>Esc</kbd> 取消
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Empty } from 'ant-design-vue'
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import type { SuggestionItem } from '@/extensions/aiSuggestion'

interface Props {
  items: SuggestionItem[]
  command: (item: SuggestionItem) => void
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const selectedIndex = ref(0)
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE

const validItems = computed(() => {
  return props.items.filter(item => item.id !== 'loading')
})

const selectItem = (index: number) => {
  if (validItems.value[index]) {
    props.command(validItems.value[index])
  }
}

const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(0, selectedIndex.value - 1)
    return true
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(
      validItems.value.length - 1,
      selectedIndex.value + 1
    )
    return true
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault()
    selectItem(selectedIndex.value)
    return true
  }

  return false
}

// 暴露给父组件
defineExpose({
  onKeyDown
})

// 生命周期
onMounted(() => {
  selectedIndex.value = 0
})
</script>

<style scoped>
.ai-suggestion-list {
  min-width: 320px;
  max-width: 600px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 头部 */
.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.suggestion-header .icon {
  font-size: 14px;
}

.suggestion-header .title {
  flex: 1;
}

/* 建议项列表 */
.suggestion-items {
  max-height: 500px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: #f5f7ff;
}

.suggestion-item.selected {
  background: linear-gradient(90deg, #f0f3ff 0%, #f5f7ff 100%);
  border-left: 3px solid #2B32B2;
}

/* 序号 */
.item-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8eaff;
  color: #2B32B2;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.suggestion-item.selected .item-number {
  background: #2B32B2;
  color: white;
}

/* 内容区域 */
.item-content {
  flex: 1;
  min-width: 0;
}

.item-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 6px;
  word-wrap: break-word;
}

/* 元信息 */
.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-bar {
  flex: 1;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a 0%, #95de64 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.confidence-text {
  font-size: 11px;
  color: #999;
  font-weight: 500;
}

/* 快捷键提示 */
.item-hint {
  flex-shrink: 0;
}

/* 空状态 */
.empty-state {
  padding: 32px 16px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #999;
  font-size: 13px;
}

/* 底部 */
.suggestion-footer {
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.hints {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #999;
}

.hint {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hint-icon {
  font-size: 12px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin: 0 2px;
}

/* 滚动条样式 */
.suggestion-items::-webkit-scrollbar {
  width: 6px;
}

.suggestion-items::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.suggestion-items::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.suggestion-items::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .ai-suggestion-list {
    background: #1f1f1f;
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.6),
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .suggestion-header {
    background: linear-gradient(135deg, #5568d3 0%, #6a4c93 100%);
  }

  .suggestion-item {
    border-bottom-color: #2a2a2a;
  }

  .suggestion-item:hover {
    background: #2a2a2a;
  }

  .suggestion-item.selected {
    background: linear-gradient(90deg, #252837 0%, #2a2a3a 100%);
    border-left-color: #7c8adb;
  }

  .item-number {
    background: #2a2d45;
    color: #8b96eb;
  }

  .suggestion-item.selected .item-number {
    background: #7c8adb;
    color: white;
  }

  .item-text {
    color: #e8e8e8;
  }

  .confidence-bar {
    background: #2a2a2a;
  }

  .confidence-text {
    color: #888;
  }

  .loading-state {
    color: #888;
  }

  .suggestion-footer {
    background: #1a1a1a;
    border-top-color: #2a2a2a;
  }

  .hints {
    color: #888;
  }

  kbd {
    background: #2a2a2a;
    border-color: #404040;
    color: #e8e8e8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .suggestion-items::-webkit-scrollbar-track {
    background: #2a2a2a;
  }

  .suggestion-items::-webkit-scrollbar-thumb {
    background: #404040;
  }

  .suggestion-items::-webkit-scrollbar-thumb:hover {
    background: #505050;
  }
}

.dark .ai-suggestion-list {
  background: #1f1f1f;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.6),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

.dark .suggestion-header {
  background: linear-gradient(135deg, #5568d3 0%, #6a4c93 100%);
}

.dark .suggestion-item {
  border-bottom-color: #2a2a2a;
}

.dark .suggestion-item:hover {
  background: #2a2a2a;
}

.dark .suggestion-item.selected {
  background: linear-gradient(90deg, #252837 0%, #2a2a3a 100%);
  border-left-color: #7c8adb;
}

.dark .item-number {
  background: #2a2d45;
  color: #8b96eb;
}

.dark .suggestion-item.selected .item-number {
  background: #7c8adb;
  color: white;
}

.dark .item-text {
  color: #e8e8e8;
}

.dark .confidence-bar {
  background: #2a2a2a;
}

.dark .confidence-text {
  color: #888;
}

.dark .loading-state {
  color: #888;
}

.dark .suggestion-footer {
  background: #1a1a1a;
  border-top-color: #2a2a2a;
}

.dark .hints {
  color: #888;
}

.dark kbd {
  background: #2a2a2a;
  border-color: #404040;
  color: #e8e8e8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dark .suggestion-items::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.dark .suggestion-items::-webkit-scrollbar-thumb {
  background: #404040;
}

.dark .suggestion-items::-webkit-scrollbar-thumb:hover {
  background: #505050;
}
</style>
