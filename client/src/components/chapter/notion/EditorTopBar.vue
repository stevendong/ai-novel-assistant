<template>
  <div class="editor-topbar theme-bg-container border-b theme-border">
    <div class="flex items-center justify-between h-12 px-4">
      <!-- 左侧：项目信息和导航 -->
      <div class="flex items-center space-x-4">
        <!-- 项目信息 -->
        <div class="flex items-center space-x-3">
          <a-button type="text" @click="$emit('go-back')" class="hover:bg-gray-100 h-8">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            返回
          </a-button>

          <a-divider type="vertical" class="h-4" />

          <div class="flex items-center space-x-2">
            <a-avatar size="small" class="bg-blue-500">
              <FileTextOutlined />
            </a-avatar>
            <div class="flex flex-col">
              <span class="text-sm font-medium theme-text-primary leading-none">
                第{{ chapter.chapterNumber }}章
              </span>
              <span class="text-xs theme-text-secondary leading-none mt-1">
                {{ chapter.title || '未命名章节' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 章节导航 -->
        <div class="flex items-center space-x-1">
          <a-button
            type="text"
            size="small"
            :disabled="currentIndex <= 0"
            @click="$emit('go-previous')"
            class="h-8 w-8"
            title="上一章 (Ctrl+Left)"
          >
            <LeftOutlined />
          </a-button>

          <a-dropdown trigger="click" placement="bottomLeft">
            <a-button type="text" size="small" class="h-8 min-w-[100px] px-2">
              <span class="flex items-center justify-between w-full">
                <span>章节导航</span>
                <DownOutlined class="text-xs" />
              </span>
            </a-button>
            <template #overlay>
              <a-menu class="w-64 max-h-80 overflow-y-auto">
                <a-menu-item
                  v-for="chap in allChapters"
                  :key="chap.id"
                  @click="$emit('switch-chapter', chap.id)"
                  :class="{ 'ant-menu-item-selected': chap.id === chapter.id }"
                >
                  <div class="flex items-center justify-between w-full">
                    <div class="flex flex-col flex-1 min-w-0">
                      <span class="text-sm font-medium truncate">
                        第{{ chap.chapterNumber }}章：{{ chap.title || '未命名' }}
                      </span>
                      <span class="text-xs theme-text-secondary truncate">
                        {{ chap.statusText || '草稿' }} · {{ chap.wordCount || 0 }}字
                      </span>
                    </div>
                    <a-tag
                      v-if="chap.id === chapter.id"
                      color="blue"
                      size="small"
                      class="ml-2 flex-shrink-0"
                    >
                      当前
                    </a-tag>
                  </div>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>

          <a-button
            type="text"
            size="small"
            :disabled="currentIndex >= allChapters.length - 1"
            @click="$emit('go-next')"
            class="h-8 w-8"
            title="下一章 (Ctrl+Right)"
          >
            <RightOutlined />
          </a-button>

          <span class="text-xs theme-text-secondary px-2">
            {{ currentIndex + 1 }} / {{ allChapters.length }}
          </span>
        </div>
      </div>

      <!-- 右侧：状态和操作 -->
      <div class="flex items-center space-x-2">
        <!-- 保存状态 -->
        <div class="flex items-center space-x-2">
          <template v-if="saving">
            <a-spin size="small" />
            <span class="text-xs theme-text-secondary">保存中...</span>
          </template>
          <template v-else-if="hasUnsavedChanges">
            <a-tag color="orange" class="m-0">
              <ClockCircleOutlined />
              未保存
            </a-tag>
          </template>
          <template v-else>
            <a-tag color="green" class="m-0">
              <CheckCircleOutlined />
              已保存
            </a-tag>
          </template>
        </div>

        <a-divider type="vertical" class="h-4" />

        <!-- 主要操作 -->
        <a-space size="small">
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            :disabled="!hasUnsavedChanges"
            @click="$emit('save')"
            class="h-8"
            title="保存 (Ctrl+S)"
          >
            <template #icon>
              <SaveOutlined />
            </template>
            保存
          </a-button>

          <a-dropdown :trigger="['click']">
            <a-button size="small" class="h-8">
              <MoreOutlined />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="focus" @click="$emit('toggle-focus')">
                  <FullscreenOutlined />
                  专注模式 (Ctrl+Enter)
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="export">
                  <ExportOutlined />
                  导出章节
                </a-menu-item>
                <a-menu-item key="settings">
                  <SettingOutlined />
                  章节设置
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="help">
                  <QuestionCircleOutlined />
                  帮助文档
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  FileTextOutlined,
  SaveOutlined,
  MoreOutlined,
  FullscreenOutlined,
  ExportOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'

interface Props {
  chapter: any
  hasUnsavedChanges: boolean
  saving: boolean
  allChapters: any[]
  currentIndex: number
}

defineProps<Props>()

defineEmits<{
  (e: 'go-back'): void
  (e: 'go-previous'): void
  (e: 'go-next'): void
  (e: 'switch-chapter', chapterId: string): void
  (e: 'save'): void
  (e: 'toggle-focus'): void
}>()
</script>

<style scoped>
.editor-topbar {
  height: 48px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-container);
}

:deep(.ant-btn-text:hover) {
  background: rgba(0, 0, 0, 0.06);
}

:deep(.ant-menu-item-selected) {
  background-color: #e6f7ff;
}
</style>
