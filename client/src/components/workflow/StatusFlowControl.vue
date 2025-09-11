<template>
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
      <a-space wrap>
        <!-- 推进按钮 -->
        <a-button
          v-if="nextTransition && nextTransition.canTransition"
          type="primary"
          :loading="transitioning"
          @click="handleAdvance"
        >
          推进到{{ workflowService.getStatusText(nextTransition.to, entityType) }}
        </a-button>

        <!-- 批量操作（仅章节） -->
        <a-dropdown v-if="entityType === 'chapter' && showBatchActions">
          <a-button>
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
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

        <!-- 状态历史 -->
        <a-button 
          ghost 
          @click="showHistoryModal = true"
        >
          <HistoryOutlined />
          变更历史
        </a-button>

        <!-- 手动修改状态 -->
        <a-button 
          v-if="showManualChange"
          ghost 
          @click="showManualModal = true"
        >
          <EditOutlined />
          手动修改
        </a-button>
      </a-space>

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
      title="状态变更历史"
      :footer="null"
      width="800px"
    >
      <a-timeline>
        <a-timeline-item
          v-for="item in statusHistory"
          :key="item.id"
          :color="getHistoryColor(item.triggeredBy)"
        >
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">
                {{ item.fromStatus ? `${workflowService.getStatusText(item.fromStatus, entityType)} → ` : '' }}
                {{ workflowService.getStatusText(item.toStatus, entityType) }}
              </span>
              <span class="text-xs text-gray-500">
                {{ formatDate(item.createdAt) }}
              </span>
            </div>
            <div class="text-sm text-gray-600">
              <span class="inline-flex items-center">
                <UserOutlined v-if="item.triggeredBy === 'user'" class="mr-1" />
                <RobotOutlined v-else class="mr-1" />
                {{ item.triggeredBy === 'user' ? '手动操作' : '系统自动' }}
              </span>
              <span v-if="item.reason" class="ml-2">- {{ item.reason }}</span>
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-modal>
  </div>
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
  RobotOutlined
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
      manualConfig.value.reason || '手动修改状态'
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
  @apply bg-white rounded-lg border p-4;
}

.status-progress :deep(.ant-steps-item-title) {
  font-size: 12px;
}

.status-progress :deep(.ant-steps-item-description) {
  font-size: 11px;
}

.status-actions {
  @apply pt-4 border-t border-gray-100;
}
</style>