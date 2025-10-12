<template>
  <div
    v-if="visible"
    class="editor-left-sidebar theme-bg-container border-r theme-border flex flex-col"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <!-- 侧边栏头部 -->
    <div class="px-4 py-3 border-b theme-border flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <a-avatar size="small" class="bg-blue-500">
          <BulbOutlined />
        </a-avatar>
        <div>
          <h3 class="text-sm font-medium theme-text-primary leading-none">章节辅助</h3>
          <span class="text-xs theme-text-secondary">大纲与情节</span>
        </div>
      </div>
      <a-button type="text" size="small" @click="$emit('update:visible', false)" class="h-8 w-8">
        <MenuFoldOutlined />
      </a-button>
    </div>

    <!-- 可滚动内容区 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- 大纲面板 -->
      <a-card size="small" :bordered="false" class="shadow-sm">
        <template #title>
          <div class="flex items-center space-x-2">
            <FileTextOutlined class="text-blue-500" />
            <span class="text-sm font-medium">章节大纲</span>
          </div>
        </template>
        <div class="space-y-3">
          <a-textarea
            :value="outlineMarkdown"
            @update:value="$emit('update:outline', $event)"
            :rows="8"
            placeholder="在这里编写章节大纲...&#10;&#10;支持Markdown语法"
            class="font-mono text-sm"
          />
          <a-button type="primary" block size="small" @click="$emit('ai-outline')" class="h-8">
            <template #icon>
              <RobotOutlined />
            </template>
            AI 生成大纲
          </a-button>
        </div>
      </a-card>

      <!-- 情节要点 -->
      <a-card size="small" :bordered="false" class="shadow-sm">
        <template #title>
          <div class="flex items-center space-x-2">
            <FlagOutlined class="text-orange-500" />
            <span class="text-sm font-medium">情节要点</span>
          </div>
        </template>
        <div class="space-y-3">
          <div
            v-for="(point, index) in chapter.plotPoints"
            :key="index"
            class="p-3 rounded border theme-border bg-white"
          >
            <div class="flex items-start space-x-2">
              <a-select
                :value="point.type"
                @change="(val) => updatePlotPoint(index, val, point.description)"
                size="small"
                style="width: 100px"
                class="flex-shrink-0"
              >
                <a-select-option value="conflict">
                  <FireOutlined class="text-red-500" />
                  冲突
                </a-select-option>
                <a-select-option value="discovery">
                  <BulbOutlined class="text-yellow-500" />
                  发现
                </a-select-option>
                <a-select-option value="emotion">
                  <HeartOutlined class="text-pink-500" />
                  情感
                </a-select-option>
                <a-select-option value="action">
                  <ThunderboltOutlined class="text-blue-500" />
                  行动
                </a-select-option>
                <a-select-option value="dialogue">
                  <MessageOutlined class="text-green-500" />
                  对话
                </a-select-option>
              </a-select>
              <a-input
                :value="point.description"
                @update:value="(val) => updatePlotPoint(index, point.type, val)"
                size="small"
                placeholder="描述情节要点..."
                class="flex-1"
              />
              <a-button
                type="text"
                danger
                size="small"
                @click="$emit('remove-plot-point', index)"
                class="h-8 w-8"
              >
                <DeleteOutlined />
              </a-button>
            </div>
          </div>

          <a-button type="dashed" block size="small" @click="$emit('add-plot-point')" class="h-8">
            <PlusOutlined />
            添加要点
          </a-button>
        </div>
      </a-card>

      <!-- 快速操作 -->
      <a-card size="small" :bordered="false" class="shadow-sm">
        <template #title>
          <div class="flex items-center space-x-2">
            <RocketOutlined class="text-purple-500" />
            <span class="text-sm font-medium">AI 助手</span>
          </div>
        </template>
        <div class="space-y-2">
          <a-button block size="small" @click="$emit('ai-outline')" class="h-8">
            <RobotOutlined />
            生成大纲
          </a-button>
          <a-button-group block class="w-full">
            <a-button size="small" @click="$emit('ai-content', 500)" class="flex-1 h-8">
              500字
            </a-button>
            <a-button size="small" @click="$emit('ai-content', 1000)" class="flex-1 h-8">
              1000字
            </a-button>
            <a-button size="small" @click="$emit('ai-content', 2000)" class="flex-1 h-8">
              2000字
            </a-button>
          </a-button-group>
          <a-button block size="small" @click="$emit('consistency-check')" class="h-8">
            <CheckCircleOutlined />
            一致性检查
          </a-button>
        </div>
      </a-card>
    </div>

    <!-- 调整宽度手柄 -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    ></div>
  </div>

  <!-- 收起时的展开按钮 -->
  <div v-else class="flex items-center justify-center py-2 border-r theme-border theme-bg-container">
    <a-button type="text" @click="$emit('update:visible', true)" class="h-8 w-8">
      <MenuUnfoldOutlined />
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FlagOutlined,
  RocketOutlined,
  BulbOutlined,
  FireOutlined,
  HeartOutlined,
  ThunderboltOutlined,
  MessageOutlined
} from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  chapter: any
  outlineMarkdown: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:outline', value: string): void
  (e: 'add-plot-point'): void
  (e: 'update-plot-point', index: number, point: any): void
  (e: 'remove-plot-point', index: number): void
  (e: 'ai-outline'): void
  (e: 'ai-content', length: number): void
  (e: 'consistency-check'): void
}>()

const activePanels = ref(['outline', 'plot-points'])
const sidebarWidth = ref(280)
const isResizing = ref(false)

const updatePlotPoint = (index: number, type: string, description: string) => {
  emit('update-plot-point', index, { type, description })
}

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const diff = e.clientX - startX
    const newWidth = Math.min(Math.max(startWidth + diff, 240), 400)
    sidebarWidth.value = newWidth
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.editor-left-sidebar {
  position: relative;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: var(--theme-bg-container);
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  transition: background-color 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background-color: rgba(24, 144, 255, 0.3);
}

:deep(.ant-card-head) {
  padding: 12px 16px;
  min-height: auto;
  border-bottom: 1px solid var(--theme-border);
}

:deep(.ant-card-body) {
  padding: 16px;
}

:deep(.ant-card-small > .ant-card-body) {
  padding: 12px;
}
</style>
