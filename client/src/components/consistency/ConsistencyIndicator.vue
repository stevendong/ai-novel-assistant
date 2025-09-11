<template>
  <div class="consistency-indicator" v-if="!loading">
    <!-- 无问题状态 -->
    <div v-if="issueCount === 0" class="status-indicator status-good" :class="sizeClass">
      <a-tooltip title="无一致性问题">
        <CheckCircleFilled class="status-icon" />
        <span v-if="showText" class="status-text">通过</span>
      </a-tooltip>
    </div>

    <!-- 有问题状态 -->
    <div v-else class="status-indicator status-warning" :class="sizeClass" @click="showDetails">
      <a-tooltip :title="`发现 ${issueCount} 个一致性问题，点击查看详情`">
        <div class="issue-badge">
          <ExclamationCircleFilled 
            class="status-icon" 
            :class="getIconClass()"
          />
          <span class="issue-count">{{ issueCount > 99 ? '99+' : issueCount }}</span>
        </div>
      </a-tooltip>
    </div>

    <!-- 健康度分数（可选显示） -->
    <div v-if="showScore && healthScore !== null" class="health-score" :class="sizeClass">
      <a-tooltip :title="`一致性健康度: ${healthScore}%`">
        <div class="score-wrapper" :class="getScoreClass(healthScore)">
          {{ healthScore }}%
        </div>
      </a-tooltip>
    </div>
  </div>

  <!-- 加载状态 -->
  <div v-else class="consistency-indicator loading" :class="sizeClass">
    <a-spin size="small" />
  </div>

  <!-- 问题详情模态框 -->
  <a-modal
    v-model:visible="detailsVisible"
    title="章节一致性问题"
    width="600px"
    :footer="null"
    @cancel="detailsVisible = false"
  >
    <div v-if="issues.length > 0" class="issues-list">
      <div class="issues-summary mb-4">
        <a-statistic-group>
          <a-statistic
            title="总问题"
            :value="issueCount"
            prefix=""
            suffix="个"
          />
          <a-statistic
            title="严重问题"
            :value="highSeverityCount"
            prefix=""
            suffix="个"
            :value-style="{ color: '#f5222d' }"
          />
          <a-statistic
            title="健康度"
            :value="healthScore"
            prefix=""
            suffix="%"
            :value-style="{ color: getScoreColor(healthScore) }"
          />
        </a-statistic-group>
      </div>

      <a-divider />

      <div class="space-y-3">
        <div
          v-for="issue in issues"
          :key="issue.id"
          class="issue-item p-3 border rounded"
          :class="{
            'border-red-300 bg-red-50': issue.severity === 'high',
            'border-yellow-300 bg-yellow-50': issue.severity === 'medium',
            'border-gray-300 bg-gray-50': issue.severity === 'low',
            'opacity-60': issue.resolved
          }"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-1">
                <a-tag :color="getTypeColor(issue.type)" size="small">
                  {{ getTypeName(issue.type) }}
                </a-tag>
                <a-tag :color="getSeverityColor(issue.severity)" size="small">
                  {{ getSeverityName(issue.severity) }}
                </a-tag>
                <span v-if="issue.resolved" class="text-green-600 text-xs">
                  ✓ 已解决
                </span>
              </div>
              
              <div class="text-sm text-gray-800 leading-relaxed">
                {{ issue.issue }}
              </div>
            </div>

            <div class="flex space-x-1 ml-2">
              <a-tooltip :title="issue.resolved ? '标记为未解决' : '标记为已解决'">
                <a-button 
                  size="small" 
                  type="text"
                  @click="toggleResolveStatus(issue)"
                >
                  <CheckOutlined v-if="!issue.resolved" />
                  <UndoOutlined v-else />
                </a-button>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-6 text-gray-500">
      暂无一致性问题
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { 
  CheckCircleFilled, 
  ExclamationCircleFilled,
  CheckOutlined,
  UndoOutlined 
} from '@ant-design/icons-vue'
import { consistencyService } from '@/services/consistencyService'

const props = defineProps({
  chapterId: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  showText: {
    type: Boolean,
    default: false
  },
  showScore: {
    type: Boolean,
    default: false
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['status-updated'])

// 状态管理
const loading = ref(false)
const issues = ref([])
const healthScore = ref(null)
const detailsVisible = ref(false)

// 计算属性
const issueCount = computed(() => issues.value.length)

const highSeverityCount = computed(() => 
  issues.value.filter(issue => issue.severity === 'high').length
)

const sizeClass = computed(() => `size-${props.size}`)

// 获取图标样式类
const getIconClass = () => {
  if (highSeverityCount.value > 0) {
    return 'text-red-500'
  }
  const mediumCount = issues.value.filter(issue => issue.severity === 'medium').length
  if (mediumCount > 0) {
    return 'text-yellow-500'
  }
  return 'text-gray-500'
}

// 获取分数样式类
const getScoreClass = (score) => {
  if (score >= 80) return 'score-good'
  if (score >= 60) return 'score-warning'
  return 'score-danger'
}

// 获取分数颜色
const getScoreColor = (score) => {
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#faad14'
  return '#f5222d'
}

// 获取问题类型颜色
const getTypeColor = (type) => {
  const colors = {
    character: 'blue',
    setting: 'green',
    timeline: 'orange',
    logic: 'red'
  }
  return colors[type] || 'default'
}

// 获取问题类型名称
const getTypeName = (type) => {
  const names = {
    character: '角色一致性',
    setting: '世界设定',
    timeline: '时间线',
    logic: '逻辑一致性'
  }
  return names[type] || type
}

// 获取严重程度颜色
const getSeverityColor = (severity) => {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'gray'
  }
  return colors[severity] || 'default'
}

// 获取严重程度名称
const getSeverityName = (severity) => {
  const names = {
    high: '严重',
    medium: '中等',
    low: '轻微'
  }
  return names[severity] || severity
}

// 加载章节一致性状态
const loadConsistencyStatus = async () => {
  if (!props.chapterId) return
  
  loading.value = true
  try {
    // 并行获取问题列表和健康度分数
    const [issuesResponse, scoreResponse] = await Promise.all([
      consistencyService.getChapterIssues(props.chapterId),
      props.showScore ? consistencyService.getChapterHealthScore(props.chapterId) : null
    ])
    
    issues.value = issuesResponse || []
    healthScore.value = scoreResponse?.score || null
    
    // 发射状态更新事件
    emit('status-updated', {
      chapterId: props.chapterId,
      issueCount: issues.value.length,
      healthScore: healthScore.value,
      hasHighSeverity: highSeverityCount.value > 0
    })
  } catch (error) {
    console.error('获取一致性状态失败:', error)
    issues.value = []
    healthScore.value = null
  } finally {
    loading.value = false
  }
}

// 显示详情
const showDetails = () => {
  detailsVisible.value = true
}

// 切换问题解决状态
const toggleResolveStatus = async (issue) => {
  try {
    await consistencyService.resolveIssue(issue.id, !issue.resolved)
    issue.resolved = !issue.resolved
    message.success(`已${issue.resolved ? '解决' : '重新打开'}问题`)
    
    // 重新计算统计信息并发射更新事件
    emit('status-updated', {
      chapterId: props.chapterId,
      issueCount: issues.value.length,
      healthScore: healthScore.value,
      hasHighSeverity: highSeverityCount.value > 0
    })
  } catch (error) {
    message.error('操作失败')
    console.error(error)
  }
}

// 监听刷新触发器
watch(() => props.refreshTrigger, () => {
  loadConsistencyStatus()
})

// 监听章节ID变化
watch(() => props.chapterId, (newId) => {
  if (newId) {
    loadConsistencyStatus()
  }
}, { immediate: true })

onMounted(() => {
  loadConsistencyStatus()
})
</script>

<style scoped>
.consistency-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  transition: all 0.2s;
}

.status-indicator:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.status-good .status-icon {
  color: #52c41a;
}

.status-warning .status-icon {
  /* 颜色由 getIconClass 动态设置 */
}

.issue-badge {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.issue-count {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  margin-left: 2px;
}

.health-score {
  display: inline-flex;
  align-items: center;
}

.score-wrapper {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 2px;
  background-color: #f0f0f0;
}

.score-good {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.score-warning {
  background-color: #fffbe6;
  color: #faad14;
  border: 1px solid #ffe58f;
}

.score-danger {
  background-color: #fff2f0;
  color: #f5222d;
  border: 1px solid #ffccc7;
}

/* 尺寸样式 */
.size-small .status-icon {
  font-size: 12px;
}

.size-small .status-text {
  font-size: 11px;
}

.size-small .issue-count {
  font-size: 9px;
}

.size-small .score-wrapper {
  font-size: 9px;
  padding: 0px 2px;
}

.size-medium .status-icon {
  font-size: 14px;
}

.size-medium .status-text {
  font-size: 12px;
}

.size-medium .issue-count {
  font-size: 10px;
}

.size-medium .score-wrapper {
  font-size: 10px;
  padding: 1px 4px;
}

.size-large .status-icon {
  font-size: 16px;
}

.size-large .status-text {
  font-size: 13px;
}

.size-large .issue-count {
  font-size: 11px;
}

.size-large .score-wrapper {
  font-size: 11px;
  padding: 2px 6px;
}

.loading {
  opacity: 0.6;
}

/* 模态框样式 */
.issues-summary :deep(.ant-statistic-group) {
  justify-content: space-around;
}

.issues-summary :deep(.ant-statistic-title) {
  font-size: 12px;
  margin-bottom: 4px;
}

.issues-summary :deep(.ant-statistic-content) {
  font-size: 18px;
}

.issue-item {
  transition: all 0.2s;
}

.issue-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>