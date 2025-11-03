<template>
  <div class="chapter-consistency">
    <div class="consistency-header">
      <div class="header-title">
        <h3>{{ t('chapterEditor.consistency.title') }}</h3>
        <a-tag v-if="unresolvedCount > 0" :color="unresolvedCount > 0 ? 'error' : 'success'">
          {{ t('chapterEditor.consistency.unresolvedTag', { count: unresolvedCount }) }}
        </a-tag>
      </div>
      <a-space>
        <a-button
          type="default"
          @click="showFilterModal = true"
          v-if="issues.length > 0"
        >
          <template #icon><FilterOutlined /></template>
          {{ t('chapterEditor.consistency.actions.filter') }}
        </a-button>
        <a-button
          type="primary"
          :loading="checking"
          @click="handleCheck"
        >
          <template #icon><CheckCircleOutlined /></template>
          {{ checking ? t('chapterEditor.consistency.actions.checking') : t('chapterEditor.consistency.actions.check') }}
        </a-button>
      </a-space>
    </div>

    <!-- 筛选器 -->
    <div v-if="issues.length > 0" class="consistency-filters">
      <a-space :size="8" wrap>
        <a-radio-group v-model:value="severityFilter" button-style="solid" size="small">
          <a-radio-button value="all">{{ t('chapterEditor.consistency.filters.severity.all') }}</a-radio-button>
          <a-radio-button value="high">
            <WarningOutlined /> {{ t('chapterEditor.consistency.filters.severity.high') }}
          </a-radio-button>
          <a-radio-button value="medium">
            <ExclamationCircleOutlined /> {{ t('chapterEditor.consistency.filters.severity.medium') }}
          </a-radio-button>
          <a-radio-button value="low">
            <InfoCircleOutlined /> {{ t('chapterEditor.consistency.filters.severity.low') }}
          </a-radio-button>
        </a-radio-group>

        <a-divider type="vertical" />

        <a-radio-group v-model:value="statusFilter" button-style="solid" size="small">
          <a-radio-button value="all">{{ t('chapterEditor.consistency.filters.status.all') }}</a-radio-button>
          <a-radio-button value="unresolved">{{ t('chapterEditor.consistency.filters.status.unresolved') }}</a-radio-button>
          <a-radio-button value="resolved">{{ t('chapterEditor.consistency.filters.status.resolved') }}</a-radio-button>
        </a-radio-group>
      </a-space>
    </div>

    <!-- 问题列表 -->
    <a-list
      v-if="filteredIssues.length > 0"
      :data-source="filteredIssues"
      class="consistency-list"
    >
      <template #renderItem="{ item, index }">
        <a-list-item class="consistency-item" :class="{ 'resolved-item': item.resolved }">
          <a-list-item-meta>
            <template #title>
              <div class="issue-title">
                <a-space :size="8">
                  <span class="issue-number">#{{ index + 1 }}</span>
                  <a-tag :color="getSeverityColor(item.severity)">
                    {{ getSeverityText(item.severity) }}
                  </a-tag>
                  <a-tag :color="getTypeColor(item.type)">
                    {{ getTypeText(item.type) }}
                  </a-tag>
                  <a-tag v-if="item.resolved" color="success">
                    <CheckOutlined /> {{ t('chapterEditor.consistency.issue.resolved') }}
                  </a-tag>
                </a-space>
              </div>
            </template>
            <template #description>
              <div class="issue-description">
                {{ item.issue }}
              </div>
              <div class="issue-meta">
                <ClockCircleOutlined />
                {{ formatDate(item.createdAt) }}
              </div>
            </template>
          </a-list-item-meta>

          <template #actions>
            <a-space>
              <a-tooltip v-if="!item.resolved" :title="t('chapterEditor.consistency.issue.markResolvedTooltip')">
                <a-button
                  type="text"
                  size="small"
                  @click="handleResolve(item.id)"
                >
                  <template #icon><CheckOutlined /></template>
                  {{ t('chapterEditor.consistency.issue.markResolved') }}
                </a-button>
              </a-tooltip>
              <a-tooltip v-else :title="t('chapterEditor.consistency.issue.reopenTooltip')">
                <a-button
                  type="text"
                  size="small"
                  @click="handleUnresolve(item.id)"
                >
                  <template #icon><CloseOutlined /></template>
                  {{ t('chapterEditor.consistency.issue.reopen') }}
                </a-button>
              </a-tooltip>
              <a-popconfirm
                :title="t('chapterEditor.consistency.issue.deleteConfirm')"
                :ok-text="t('common.confirm')"
                :cancel-text="t('common.cancel')"
                @confirm="handleDelete(item.id)"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- 空状态 -->
    <a-empty
      v-else-if="!checking"
      :description="issues.length === 0 ? t('chapterEditor.consistency.empty.noIssues') : t('chapterEditor.consistency.empty.noResults')"
      class="empty-state"
    >
      <template #image>
        <CheckCircleOutlined
          v-if="issues.length === 0"
          style="font-size: 48px; color: #52c41a;"
        />
        <FilterOutlined
          v-else
          style="font-size: 48px; color: #d9d9d9;"
        />
      </template>
      <a-button v-if="issues.length === 0" type="primary" @click="handleCheck">
        <template #icon><CheckCircleOutlined /></template>
        {{ t('chapterEditor.consistency.actions.check') }}
      </a-button>
    </a-empty>

    <!-- 检查中状态 -->
    <div v-if="checking" class="checking-state">
      <a-spin size="large" :tip="t('chapterEditor.consistency.checking.tip')">
        <div class="checking-content">
          <p>{{ t('chapterEditor.consistency.checking.description') }}</p>
        </div>
      </a-spin>
    </div>

    <!-- 统计信息 -->
    <div v-if="issues.length > 0" class="consistency-stats">
      <a-row :gutter="16">
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ t('chapterEditor.consistency.stats.total') }}</div>
            <div class="stat-value">{{ issues.length }}</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card high">
            <div class="stat-label">{{ t('chapterEditor.consistency.stats.high') }}</div>
            <div class="stat-value">{{ severityStats.high }}</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card medium">
            <div class="stat-label">{{ t('chapterEditor.consistency.stats.medium') }}</div>
            <div class="stat-value">{{ severityStats.medium }}</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card low">
            <div class="stat-label">{{ t('chapterEditor.consistency.stats.low') }}</div>
            <div class="stat-value">{{ severityStats.low }}</div>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue'
import type { ConsistencyCheck } from '@/types'
import { chapterService } from '@/services/chapterService'
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: ConsistencyCheck[]
  chapterId: string
}

interface Emits {
  (e: 'update:modelValue', value: ConsistencyCheck[]): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t, locale } = useI18n()

// 内部状态
const issues = ref<ConsistencyCheck[]>([])
const checking = ref(false)
const severityFilter = ref<'all' | 'high' | 'medium' | 'low'>('all')
const statusFilter = ref<'all' | 'resolved' | 'unresolved'>('all')
const showFilterModal = ref(false)

// 监听外部数据变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      issues.value = [...newValue]
    }
  },
  { immediate: true, deep: true }
)

// 未解决问题数量
const unresolvedCount = computed(() => {
  return issues.value.filter(issue => !issue.resolved).length
})

// 统计各严重程度数量
const severityStats = computed(() => {
  const stats = {
    high: 0,
    medium: 0,
    low: 0
  }

  issues.value.forEach(issue => {
    if (issue.severity in stats) {
      stats[issue.severity as keyof typeof stats]++
    }
  })

  return stats
})

// 过滤后的问题列表
const filteredIssues = computed(() => {
  let filtered = [...issues.value]

  // 按严重程度过滤
  if (severityFilter.value !== 'all') {
    filtered = filtered.filter(issue => issue.severity === severityFilter.value)
  }

  // 按状态过滤
  if (statusFilter.value === 'resolved') {
    filtered = filtered.filter(issue => issue.resolved)
  } else if (statusFilter.value === 'unresolved') {
    filtered = filtered.filter(issue => !issue.resolved)
  }

  return filtered
})

// 获取严重程度颜色
const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    'low': 'default',
    'medium': 'warning',
    'high': 'error'
  }
  return colors[severity] || 'default'
}

// 获取严重程度文本
const getSeverityText = (severity: string): string => {
  const texts: Record<string, string> = {
    'low': t('chapterEditor.consistency.filters.severity.lowShort'),
    'medium': t('chapterEditor.consistency.filters.severity.mediumShort'),
    'high': t('chapterEditor.consistency.filters.severity.highShort')
  }
  return texts[severity] || severity
}

// 获取类型颜色
const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'character': 'blue',
    'setting': 'purple',
    'timeline': 'orange',
    'logic': 'green'
  }
  return colors[type] || 'default'
}

// 获取类型文本
const getTypeText = (type: string): string => {
  const texts: Record<string, string> = {
    'character': t('chapterEditor.consistency.types.character'),
    'setting': t('chapterEditor.consistency.types.setting'),
    'timeline': t('chapterEditor.consistency.types.timeline'),
    'logic': t('chapterEditor.consistency.types.logic')
  }
  return texts[type] || type
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes === 0
        ? t('chapterEditor.consistency.time.justNow')
        : t('chapterEditor.consistency.time.minutesAgo', { value: minutes })
    }
    return t('chapterEditor.consistency.time.hoursAgo', { value: hours })
  } else if (days === 1) {
    return t('chapterEditor.consistency.time.yesterday')
  } else if (days < 7) {
    return t('chapterEditor.consistency.time.daysAgo', { value: days })
  }
  const localeTag = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return date.toLocaleDateString(localeTag)
}

// 执行一致性检查
const handleCheck = async () => {
  checking.value = true
  try {
    // TODO: 调用 AI 检查一致性 API
    await new Promise(resolve => setTimeout(resolve, 2000)) // 模拟 API 调用

    message.success(t('chapterEditor.consistency.messages.checkSuccess'))

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to check consistency:', error)
    message.error(t('chapterEditor.consistency.messages.checkFailed'))
  } finally {
    checking.value = false
  }
}

// 标记为已解决
const handleResolve = async (issueId: string) => {
  try {
    // TODO: 调用 API 标记为已解决
    const issue = issues.value.find(i => i.id === issueId)
    if (issue) {
      issue.resolved = true
    }

    message.success(t('chapterEditor.consistency.messages.resolveSuccess'))

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to resolve issue:', error)
    message.error(t('chapterEditor.consistency.messages.resolveFailed'))
  }
}

// 重新打开
const handleUnresolve = async (issueId: string) => {
  try {
    // TODO: 调用 API 重新打开
    const issue = issues.value.find(i => i.id === issueId)
    if (issue) {
      issue.resolved = false
    }

    message.success(t('chapterEditor.consistency.messages.reopenSuccess'))

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to unresolve issue:', error)
    message.error(t('chapterEditor.consistency.messages.reopenFailed'))
  }
}

// 删除问题
const handleDelete = async (issueId: string) => {
  try {
    // TODO: 调用 API 删除问题
    const index = issues.value.findIndex(i => i.id === issueId)
    if (index !== -1) {
      issues.value.splice(index, 1)
    }

    message.success(t('chapterEditor.consistency.messages.deleteSuccess'))

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to delete issue:', error)
    message.error(t('chapterEditor.consistency.messages.deleteFailed'))
  }
}
</script>

<style scoped>
.chapter-consistency {
  width: 100%;
}

/* Header */
.consistency-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--theme-border);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text);
}

/* Filters */
.consistency-filters {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--theme-bg-base);
  border-radius: 6px;
}

/* Consistency List */
.consistency-list {
  background: transparent;
  margin-bottom: 16px;
}

.consistency-item {
  padding: 16px !important;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-left: 4px solid #ff4d4f;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.consistency-item.resolved-item {
  border-left-color: #52c41a;
  opacity: 0.7;
}

.consistency-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.issue-title {
  margin-bottom: 8px;
}

.issue-number {
  font-weight: 600;
  color: var(--theme-text-secondary);
}

.issue-description {
  color: var(--theme-text);
  margin-bottom: 8px;
  line-height: 1.6;
}

.issue-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme-text-tertiary);
}

/* Empty State */
.empty-state {
  padding: 48px 24px;
  background: var(--theme-bg-container);
  border: 1px dashed var(--theme-border);
  border-radius: 8px;
  margin-bottom: 16px;
}

/* Checking State */
.checking-state {
  padding: 48px 24px;
  background: var(--theme-bg-container);
  border: 1px dashed var(--theme-border);
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.checking-content {
  margin-top: 16px;
  color: var(--theme-text-secondary);
}

/* Stats */
.consistency-stats {
  margin-top: 16px;
}

.stat-card {
  padding: 16px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card.high {
  border-left: 4px solid #ff4d4f;
}

.stat-card.medium {
  border-left: 4px solid #faad14;
}

.stat-card.low {
  border-left: 4px solid #d9d9d9;
}

.stat-label {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text);
}

/* Responsive */
@media (max-width: 768px) {
  .consistency-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .consistency-filters {
    overflow-x: auto;
  }
}
</style>
