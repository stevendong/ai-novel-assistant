<template>
  <div class="chapter-plot-points">
    <div class="plot-points-header">
      <h4 class="section-title">剧情要点</h4>
      <a-tooltip title="添加关键的剧情点,帮助组织章节内容">
        <QuestionCircleOutlined class="help-icon" />
      </a-tooltip>
    </div>

    <div class="plot-points-list">
      <TransitionGroup name="plot-point">
        <div
          v-for="(point, index) in plotPoints"
          :key="`plot-point-${index}`"
          class="plot-point-item"
        >
          <div class="plot-point-header">
            <span class="plot-point-number">{{ index + 1 }}</span>
            <a-select
              v-model:value="point.type"
              class="plot-point-type"
              @change="handleChange"
            >
              <a-select-option value="conflict">
                <ThunderboltOutlined /> 冲突
              </a-select-option>
              <a-select-option value="discovery">
                <BulbOutlined /> 发现
              </a-select-option>
              <a-select-option value="emotion">
                <HeartOutlined /> 情感
              </a-select-option>
              <a-select-option value="action">
                <RocketOutlined /> 动作
              </a-select-option>
              <a-select-option value="dialogue">
                <CommentOutlined /> 对话
              </a-select-option>
            </a-select>
          </div>

          <a-input
            v-model:value="point.description"
            placeholder="描述这个情节要点..."
            class="plot-point-description"
            @change="handleChange"
          />

          <div class="plot-point-actions">
            <a-button
              type="text"
              size="small"
              :disabled="index === 0"
              @click="moveUp(index)"
              title="上移"
            >
              <template #icon><ArrowUpOutlined /></template>
            </a-button>
            <a-button
              type="text"
              size="small"
              :disabled="index === plotPoints.length - 1"
              @click="moveDown(index)"
              title="下移"
            >
              <template #icon><ArrowDownOutlined /></template>
            </a-button>
            <a-button
              type="text"
              danger
              size="small"
              @click="removePlotPoint(index)"
              title="删除"
            >
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>
        </div>
      </TransitionGroup>

      <a-empty
        v-if="plotPoints.length === 0"
        description="暂无剧情要点"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        class="empty-state"
      />
    </div>

    <a-button
      type="dashed"
      block
      @click="addPlotPoint"
      class="add-plot-point-btn"
    >
      <template #icon><PlusOutlined /></template>
      添加剧情要点
    </a-button>

    <div v-if="plotPoints.length > 0" class="plot-points-stats">
      <a-space :size="4">
        <InfoCircleOutlined class="stats-icon" />
        <span class="stats-text">
          共 {{ plotPoints.length }} 个剧情要点
        </span>
        <a-divider type="vertical" />
        <span class="stats-breakdown">
          <span v-for="(count, type) in typeStats" :key="type" class="type-stat">
            {{ getTypeLabel(type) }}: {{ count }}
          </span>
        </span>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Empty } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  HeartOutlined,
  RocketOutlined,
  CommentOutlined
} from '@ant-design/icons-vue'
import type { PlotPoint } from '@/types'

interface Props {
  modelValue: PlotPoint[] | string[] | any[]  // 支持旧格式(字符串数组)
}

interface Emits {
  (e: 'update:modelValue', value: PlotPoint[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 内部剧情点列表
const plotPoints = ref<PlotPoint[]>([])

// 规范化剧情点数据(处理旧格式兼容性)
const normalizePlotPoints = (value: any[]): PlotPoint[] => {
  if (!value || !Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    // 如果是字符串,转换为对象格式
    if (typeof item === 'string') {
      return {
        type: 'action',
        description: item
      }
    }
    // 如果已经是对象格式,确保有必需的字段
    if (typeof item === 'object' && item !== null) {
      return {
        type: item.type || 'action',
        description: item.description || ''
      }
    }
    // 其他情况返回空对象
    return {
      type: 'action',
      description: ''
    }
  })
}

// 监听外部变化,同步到内部
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      plotPoints.value = normalizePlotPoints(newValue)
    }
  },
  { immediate: true, deep: true }
)

// 统计各类型数量
const typeStats = computed(() => {
  const stats: Record<string, number> = {}
  plotPoints.value.forEach(point => {
    stats[point.type] = (stats[point.type] || 0) + 1
  })
  return stats
})

// 获取类型标签
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'conflict': '冲突',
    'discovery': '发现',
    'emotion': '情感',
    'action': '动作',
    'dialogue': '对话'
  }
  return labels[type] || type
}

// 添加剧情要点
const addPlotPoint = () => {
  plotPoints.value.push({
    type: 'action',
    description: ''
  })
  handleChange()
}

// 删除剧情要点
const removePlotPoint = (index: number) => {
  plotPoints.value.splice(index, 1)
  handleChange()
}

// 上移剧情要点
const moveUp = (index: number) => {
  if (index === 0) return
  const temp = plotPoints.value[index]
  plotPoints.value[index] = plotPoints.value[index - 1]
  plotPoints.value[index - 1] = temp
  handleChange()
}

// 下移剧情要点
const moveDown = (index: number) => {
  if (index === plotPoints.value.length - 1) return
  const temp = plotPoints.value[index]
  plotPoints.value[index] = plotPoints.value[index + 1]
  plotPoints.value[index + 1] = temp
  handleChange()
}

// 处理变化
const handleChange = () => {
  emit('update:modelValue', [...plotPoints.value])
}
</script>

<style scoped>
.chapter-plot-points {
  width: 100%;
}

/* Header */
.plot-points-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text);
}

.help-icon {
  color: var(--theme-text-tertiary);
  font-size: 14px;
  cursor: help;
}

/* Plot Points List */
.plot-points-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 60px;
}

.plot-point-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 12px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.plot-point-item:hover {
  border-color: var(--theme-primary);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.plot-point-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plot-point-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--theme-primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.plot-point-type {
  width: 130px;
}

.plot-point-type :deep(.ant-select-selector) {
  border-radius: 4px;
}

.plot-point-description {
  grid-column: 2 / 3;
}

.plot-point-actions {
  display: flex;
  gap: 4px;
}

/* Empty State */
.empty-state {
  padding: 24px 0;
}

/* Add Button */
.add-plot-point-btn {
  margin-bottom: 12px;
  border-style: dashed;
  border-radius: 6px;
  height: 40px;
  font-weight: 500;
}

.add-plot-point-btn:hover {
  border-color: var(--theme-primary);
  color: var(--theme-primary);
}

/* Stats */
.plot-points-stats {
  padding: 12px;
  background: var(--theme-bg-base);
  border-radius: 6px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.stats-icon {
  color: var(--theme-primary);
}

.stats-text {
  font-weight: 500;
}

.stats-breakdown {
  display: flex;
  gap: 12px;
}

.type-stat {
  color: var(--theme-text-tertiary);
}

/* Transitions */
.plot-point-move,
.plot-point-enter-active,
.plot-point-leave-active {
  transition: all 0.3s ease;
}

.plot-point-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.plot-point-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.plot-point-leave-active {
  position: absolute;
}

/* Responsive */
@media (max-width: 768px) {
  .plot-point-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .plot-point-header {
    grid-column: 1;
  }

  .plot-point-description {
    grid-column: 1;
  }

  .plot-point-actions {
    grid-column: 1;
    justify-content: flex-end;
  }

  .stats-breakdown {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
