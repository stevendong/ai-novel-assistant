1<template>
  <div class="status-flow-control">
    <!-- 状态进度显示 -->
    <div class="status-progress mb-4">
      <a-steps
        :current="currentStep"
        size="small"
        :status="stepStatus"
      >
        <a-step
          v-for="(status, index) in allStatuses"
          :key="status.value"
          :title="status.label"
          :description="index === currentStep ? '当前阶段' : ''"
        />
      </a-steps>
    </div>

    <!-- 状态操作区域 -->
    <div class="status-actions">
      <!-- 主要操作区域 -->
      <div class="primary-actions">
        <!-- 推进按钮 -->
        <a-button
          v-if="nextTransition && nextTransition.canTransition"
          type="primary"
          size="large"
          :loading="transitioning"
          class="advance-btn"
          @click="handleAdvance"
        >
          <template #icon>
            <RocketOutlined />
          </template>
          推进到{{ workflowService.getStatusText(nextTransition.to, entityType) }}
        </a-button>

        <!-- 批量操作（仅章节） -->
        <a-dropdown v-if="entityType === 'chapter' && showBatchActions">
          <a-button type="default" class="batch-btn">
            <template #icon>
              <FastForwardOutlined />
            </template>
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu class="batch-menu">
              <a-menu-item key="auto-advance" @click="handleAutoAdvance">
                <RocketOutlined />
                自动推进
              </a-menu-item>
              <a-menu-item key="batch-advance" @click="showBatchModal = true">
                <FastForwardOutlined />
                批量推进
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <!-- 次要操作区域 -->
      <div class="secondary-actions">
        <!-- 状态历史 -->
        <a-button
          type="text"
          size="small"
          class="history-btn"
          @click="showHistoryModal = true"
        >
          <template #icon>
            <HistoryOutlined />
          </template>
          历史
        </a-button>

        <!-- 手动修改状态 -->
        <a-button
          v-if="showManualChange"
          type="primary"
          ghost
          size="small"
          class="manual-edit-btn"
          @click="showManualModal = true"
        >
          <template #icon>
            <EditOutlined />
          </template>
          手动修改
        </a-button>
      </div>
    </div>

      <!-- 状态说明 -->
      <div v-if="nextTransition && !nextTransition.canTransition" class="mt-3">
        <a-alert
          :message="`无法推进: ${nextTransition.reason}`"
          type="warning"
          show-icon
          closable
        />
      </div>

      <!-- 可用流转提示 -->
      <div v-else-if="availableTransitions.length > 1" class="mt-3">
        <a-alert
          message="存在多个可用流转选项"
          type="info"
          show-icon
        >
          <template #description>
            <div class="space-y-1">
              <div
                v-for="transition in availableTransitions.slice(1)"
                :key="`${transition.from}-${transition.to}`"
                class="text-sm"
              >
                → {{ workflowService.getStatusText(transition.to, entityType) }}
                <span v-if="!transition.canTransition" class="text-red-500">
                  ({{ transition.reason }})
                </span>
              </div>
            </div>
          </template>
        </a-alert>
      </div>
    </div>

    <!-- 批量推进对话框 -->
    <a-modal
      v-model:open="showBatchModal"
      title="批量推进章节状态"
      :confirm-loading="batchProcessing"
      @ok="handleBatchAdvance"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">从状态</label>
          <a-select
            v-model:value="batchConfig.fromStatus"
            placeholder="选择起始状态"
            class="w-full"
          >
            <a-select-option
              v-for="status in allStatuses.slice(0, -1)"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">到状态</label>
          <a-select
            v-model:value="batchConfig.toStatus"
            placeholder="选择目标状态"
            class="w-full"
          >
            <a-select-option
              v-for="status in allStatuses.slice(1)"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </a-select-option>
          </a-select>
        </div>
      </div>
    </a-modal>

    <!-- 手动修改状态对话框 -->
    <a-modal
      v-model:open="showManualModal"
      title="手动修改状态"
      :confirm-loading="transitioning"
      @ok="handleManualChange"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">目标状态</label>
          <a-select
            v-model:value="manualConfig.toStatus"
            placeholder="选择目标状态"
            class="w-full"
          >
            <a-select-option
              v-for="status in allStatuses"
              :key="status.value"
              :value="status.value"
              :disabled="status.value === currentStatus"
            >
              {{ status.label }}
            </a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">变更原因</label>
          <a-textarea
            v-model:value="manualConfig.reason"
            placeholder="请说明修改原因"
            :rows="3"
          />
        </div>
      </div>
    </a-modal>

    <!-- 状态历史对话框 -->
    <a-modal
      v-model:open="showHistoryModal"
      :footer="null"
      width="900px"
      class="history-modal"
    >
      <template #title>
        <div class="history-modal-title">
          <HistoryOutlined class="mr-2" />
          状态变更历史
        </div>
      </template>

      <div class="history-content">
        <a-empty v-if="statusHistory.length === 0" description="暂无变更历史" />

        <div v-else class="history-timeline">
          <div
            v-for="(item, index) in statusHistory"
            :key="item.id"
            class="history-item"
            :class="{ 'history-item-last': index === statusHistory.length - 1 }"
          >
            <!-- 时间线点 -->
            <div class="timeline-dot" :class="getDotClass(item.triggeredBy)">
              <UserOutlined v-if="item.triggeredBy === 'user' || item.triggeredBy === 'manual'" />
              <RobotOutlined v-else />
            </div>

            <!-- 内容区域 -->
            <div class="history-content-area">
              <div class="history-header">
                <div class="status-transition">
                  <span v-if="item.fromStatus" class="from-status">
                    {{ workflowService.getStatusText(item.fromStatus, entityType) }}
                  </span>
                  <ArrowRightOutlined v-if="item.fromStatus" class="arrow-icon" />
                  <span class="to-status">
                    {{ workflowService.getStatusText(item.toStatus, entityType) }}
                  </span>
                </div>
                <div class="history-time">
                  {{ formatDate(item.createdAt) }}
                </div>
              </div>

              <div class="history-meta">
                <a-tag
                  :color="getTagColor(item.triggeredBy)"
                  size="small"
                  class="trigger-tag"
                >
                  {{ getTriggerText(item.triggeredBy) }}
                </a-tag>
                <span v-if="item.reason" class="reason-text">
                  {{ item.reason }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  DownOutlined,
  RocketOutlined,
  FastForwardOutlined,
  HistoryOutlined,
  EditOutlined,
  UserOutlined,
  RobotOutlined,
  ArrowRightOutlined
} from '@ant-design/icons-vue'
import { workflowService } from '@/services/workflowService'
import type { StatusTransition, StatusHistory } from '@/types'

interface Props {
  entityType: 'novel' | 'chapter'
  entityId: string
  currentStatus: string
  novelId?: string
  showBatchActions?: boolean
  showManualChange?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBatchActions: false,
  showManualChange: false
})

const emit = defineEmits<{
  statusChanged: [newStatus: string]
  batchCompleted: [result: any]
}>()

// 响应式数据
const availableTransitions = ref<StatusTransition[]>([])
const statusHistory = ref<StatusHistory[]>([])
const transitioning = ref(false)
const batchProcessing = ref(false)
const loading = ref(false)

// 对话框状态
const showBatchModal = ref(false)
const showManualModal = ref(false)
const showHistoryModal = ref(false)

// 配置
const batchConfig = ref({
  fromStatus: '',
  toStatus: ''
})

const manualConfig = ref({
  toStatus: '',
  reason: ''
})

// 计算属性
const allStatuses = computed(() => workflowService.getAllStatuses(props.entityType))

const currentStep = computed(() =>
  workflowService.getStatusStep(props.currentStatus, props.entityType)
)

const stepStatus = computed(() => {
  if (nextTransition.value && !nextTransition.value.canTransition) {
    return 'error'
  }
  return 'process'
})

const nextTransition = computed(() => {
  return availableTransitions.value.find(t => t.from === props.currentStatus) || null
})

// 方法
const loadTransitions = async () => {
  try {
    loading.value = true
    availableTransitions.value = await workflowService.getAvailableTransitions(
      props.entityType,
      props.entityId
    )
  } catch (error) {
    console.error('Failed to load transitions:', error)
    message.error('加载状态流转选项失败')
  } finally {
    loading.value = false
  }
}

const loadHistory = async () => {
  try {
    statusHistory.value = await workflowService.getStatusHistory(
      props.entityType,
      props.entityId,
      20
    )
  } catch (error) {
    console.error('Failed to load history:', error)
    message.error('加载状态历史失败')
  }
}

const handleAdvance = async () => {
  if (!nextTransition.value) return

  try {
    transitioning.value = true
    const result = await workflowService.transitionStatus(
      props.entityType,
      props.entityId,
      nextTransition.value.to,
      '推进到下一阶段'
    )

    message.success(
      `状态已从"${workflowService.getStatusText(result.fromStatus, props.entityType)}"推进到"${workflowService.getStatusText(result.toStatus, props.entityType)}"`
    )

    emit('statusChanged', result.toStatus)
    await Promise.all([loadTransitions(), loadHistory()])
  } catch (error: any) {
    console.error('Failed to advance status:', error)
    message.error(`状态推进失败: ${error.message}`)
  } finally {
    transitioning.value = false
  }
}

const handleAutoAdvance = async () => {
  if (!props.novelId) {
    message.error('缺少小说ID，无法执行自动推进')
    return
  }

  try {
    batchProcessing.value = true
    const result = await workflowService.autoAdvance(props.novelId)

    if (result.successful > 0) {
      message.success(`成功自动推进了 ${result.successful} 个状态`)
    } else {
      message.info('没有可以自动推进的状态')
    }

    emit('batchCompleted', result)
    await Promise.all([loadTransitions(), loadHistory()])
  } catch (error: any) {
    console.error('Failed to auto advance:', error)
    message.error(`自动推进失败: ${error.message}`)
  } finally {
    batchProcessing.value = false
  }
}

const handleBatchAdvance = async () => {
  if (!props.novelId || !batchConfig.value.fromStatus || !batchConfig.value.toStatus) {
    message.error('请完整填写批量操作配置')
    return
  }

  try {
    batchProcessing.value = true
    const result = await workflowService.batchAdvanceStatus(
      props.novelId,
      batchConfig.value.fromStatus,
      batchConfig.value.toStatus
    )

    if (result.successful > 0) {
      message.success(`成功批量推进了 ${result.successful} 个章节`)
    } else {
      message.info('没有符合条件的章节被推进')
    }

    showBatchModal.value = false
    batchConfig.value = { fromStatus: '', toStatus: '' }
    emit('batchCompleted', result)
    await Promise.all([loadTransitions(), loadHistory()])
  } catch (error: any) {
    console.error('Failed to batch advance:', error)
    message.error(`批量推进失败: ${error.message}`)
  } finally {
    batchProcessing.value = false
  }
}

const handleManualChange = async () => {
  if (!manualConfig.value.toStatus) {
    message.error('请选择目标状态')
    return
  }

  try {
    transitioning.value = true
    const result = await workflowService.transitionStatus(
      props.entityType,
      props.entityId,
      manualConfig.value.toStatus,
      manualConfig.value.reason || '手动修改状态',
      'manual'
    )

    message.success(
      `状态已从"${workflowService.getStatusText(result.fromStatus, props.entityType)}"修改为"${workflowService.getStatusText(result.toStatus, props.entityType)}"`
    )

    showManualModal.value = false
    manualConfig.value = { toStatus: '', reason: '' }
    emit('statusChanged', result.toStatus)
    await Promise.all([loadTransitions(), loadHistory()])
  } catch (error: any) {
    console.error('Failed to change status manually:', error)
    message.error(`状态修改失败: ${error.message}`)
  } finally {
    transitioning.value = false
  }
}

const getHistoryColor = (triggeredBy: string) => {
  return triggeredBy === 'user' ? 'blue' : 'green'
}

const getDotClass = (triggeredBy: string) => {
  if (triggeredBy === 'user' || triggeredBy === 'manual') {
    return 'timeline-dot-user'
  }
  return 'timeline-dot-system'
}

const getTagColor = (triggeredBy: string) => {
  if (triggeredBy === 'user') return 'blue'
  if (triggeredBy === 'manual') return 'orange'
  return 'green'
}

const getTriggerText = (triggeredBy: string) => {
  if (triggeredBy === 'user') return '手动操作'
  if (triggeredBy === 'manual') return '手动修改'
  return '系统自动'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 生命周期
onMounted(async () => {
  await Promise.all([loadTransitions(), loadHistory()])
})

// 监听状态变化
watch(() => props.currentStatus, async () => {
  await loadTransitions()
})
</script>

<style scoped>
.status-flow-control {
  @apply rounded-lg border p-4;
  background-color: var(--theme-bg-container);
  border-color: var(--theme-border);
}

.status-progress :deep(.ant-steps-item-title) {
  font-size: 12px;
}

.status-progress :deep(.ant-steps-item-description) {
  font-size: 11px;
}

.status-actions {
  @apply pt-4 border-t flex items-center justify-between;
  border-color: var(--theme-border);
  gap: 16px;
}

.primary-actions {
  @apply flex items-center gap-3;
}

.secondary-actions {
  @apply flex items-center gap-2;
}

.advance-btn {
  @apply font-medium shadow-lg transition-all duration-300;
  min-width: 140px;
}

.advance-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
}

.batch-btn {
  @apply transition-all duration-200;
  border-color: var(--theme-border);
}

.batch-btn:hover {
  border-color: var(--theme-selected-border);
  color: var(--theme-selected-border);
}

.batch-menu {
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 按钮样式 */
.history-btn {
  @apply transition-all duration-200;
  color: var(--theme-text-secondary);
}

.history-btn:hover {
  color: var(--theme-selected-border);
  background-color: var(--theme-selected-bg);
}

.manual-edit-btn {
  @apply transition-all duration-200 font-medium;
  border-color: var(--theme-selected-border);
  color: var(--theme-selected-border);
}

.manual-edit-btn:hover {
  background-color: var(--theme-selected-bg);
  border-color: var(--theme-selected-hover-bg);
}

/* 历史对话框样式 */
.history-modal :deep(.ant-modal-header) {
  background: var(--theme-bg-elevated);
  border-bottom: 1px solid var(--theme-border);
}

.history-modal :deep(.ant-modal-content) {
  background: var(--theme-bg-container);
}

.history-modal-title {
  @apply flex items-center font-semibold;
  color: var(--theme-text);
}

.history-content {
  max-height: 500px;
  overflow-y: auto;
}

.history-timeline {
  position: relative;
  padding: 16px 0;
}

.history-item {
  @apply flex relative mb-6;
  padding-left: 40px;
}

.history-item-last {
  margin-bottom: 0;
}

.history-item::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: -24px;
  width: 2px;
  background: var(--theme-border);
}

.history-item-last::before {
  display: none;
}

.timeline-dot {
  @apply absolute w-8 h-8 rounded-full flex items-center justify-center text-white;
  left: 0;
  top: 0;
  font-size: 12px;
}

.timeline-dot-user {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.timeline-dot-system {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
}

.history-content-area {
  @apply flex-1;
  background: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.history-content-area:hover {
  border-color: var(--theme-selected-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-header {
  @apply flex items-center justify-between mb-3;
}

.status-transition {
  @apply flex items-center gap-2;
}

.from-status {
  @apply px-2 py-1 text-xs rounded;
  background: var(--theme-consistency-medium-bg);
  color: var(--theme-consistency-medium-text);
  border: 1px solid var(--theme-consistency-medium-border);
}

.to-status {
  @apply px-2 py-1 text-xs rounded font-medium;
  background: var(--theme-consistency-low-bg);
  color: var(--theme-consistency-low-text);
  border: 1px solid var(--theme-consistency-low-border);
}

.arrow-icon {
  @apply text-sm;
  color: var(--theme-text-secondary);
}

.history-time {
  @apply text-xs;
  color: var(--theme-text-secondary);
}

.history-meta {
  @apply flex items-center gap-2;
}

.trigger-tag {
  border-radius: 4px;
  font-weight: 500;
}

.reason-text {
  @apply text-sm;
  color: var(--theme-text-secondary);
  font-style: italic;
}
</style>
