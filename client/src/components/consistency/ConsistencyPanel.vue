<template>
  <div class="consistency-panel h-full flex flex-col">
    <!-- 头部工具栏 -->
    <div class="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium text-gray-900">一致性检查</h3>
        <div class="flex space-x-2">
          <a-button 
            type="primary" 
            size="small"
            :loading="checking"
            @click="runConsistencyCheck"
          >
            <template #icon>
              <ScanOutlined />
            </template>
            检查当前章节
          </a-button>
          <a-button 
            size="small"
            :loading="batchChecking"
            @click="runBatchCheck"
          >
            批量检查
          </a-button>
        </div>
      </div>

      <!-- 快速统计 -->
      <div class="grid grid-cols-4 gap-3 text-sm">
        <div class="bg-white p-2 rounded border text-center">
          <div class="text-xs text-gray-500">总问题</div>
          <div class="font-semibold text-lg">{{ stats.totalIssues }}</div>
        </div>
        <div class="bg-red-50 border-red-200 p-2 rounded border text-center">
          <div class="text-xs text-red-600">严重</div>
          <div class="font-semibold text-lg text-red-600">{{ stats.highSeverity }}</div>
        </div>
        <div class="bg-yellow-50 border-yellow-200 p-2 rounded border text-center">
          <div class="text-xs text-yellow-700">中等</div>
          <div class="font-semibold text-lg text-yellow-700">{{ stats.mediumSeverity }}</div>
        </div>
        <div class="bg-green-50 border-green-200 p-2 rounded border text-center">
          <div class="text-xs text-green-600">已解决</div>
          <div class="font-semibold text-lg text-green-600">{{ stats.resolvedIssues }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选工具 -->
    <div class="flex-shrink-0 p-4 border-b border-gray-100 bg-white">
      <div class="grid grid-cols-2 gap-3">
        <a-select
          v-model:value="filters.type"
          placeholder="问题类型"
          allow-clear
          size="small"
          @change="fetchIssues"
        >
          <a-select-option value="character">角色一致性</a-select-option>
          <a-select-option value="setting">世界设定</a-select-option>
          <a-select-option value="timeline">时间线</a-select-option>
          <a-select-option value="logic">逻辑一致性</a-select-option>
        </a-select>
        
        <a-select
          v-model:value="filters.severity"
          placeholder="严重程度"
          allow-clear
          size="small"
          @change="fetchIssues"
        >
          <a-select-option value="high">严重</a-select-option>
          <a-select-option value="medium">中等</a-select-option>
          <a-select-option value="low">轻微</a-select-option>
        </a-select>
      </div>
      
      <div class="flex justify-between items-center mt-3">
        <a-radio-group
          v-model:value="filters.resolved"
          size="small"
          button-style="solid"
          @change="fetchIssues"
        >
          <a-radio-button :value="null">全部</a-radio-button>
          <a-radio-button :value="false">未解决</a-radio-button>
          <a-radio-button :value="true">已解决</a-radio-button>
        </a-radio-group>

        <div class="flex space-x-2">
          <a-button 
            size="small"
            :disabled="selectedIssues.length === 0"
            @click="batchResolve(true)"
          >
            批量解决
          </a-button>
          <a-dropdown>
            <a-button size="small">
              更多操作
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="handleMenuClick">
                <a-menu-item key="export">导出报告</a-menu-item>
                <a-menu-item key="clear-resolved">清除已解决</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="settings">检查设置</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- 问题列表 -->
    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="p-4 text-center">
        <a-spin size="large" />
        <div class="mt-2 text-gray-500">加载中...</div>
      </div>

      <div v-else-if="issues.length === 0" class="p-8 text-center text-gray-500">
        <div class="text-4xl mb-3">✅</div>
        <div class="text-lg font-medium mb-1">暂无问题</div>
        <div class="text-sm">
          {{ hasFilters ? '当前筛选条件下没有问题' : '所有检查都已通过' }}
        </div>
      </div>

      <div v-else>
        <div class="p-3">
          <a-checkbox
            :indeterminate="indeterminate"
            :checked="checkAll"
            @change="onCheckAllChange"
            class="mb-3"
          >
            全选 ({{ selectedIssues.length }}/{{ issues.length }})
          </a-checkbox>
        </div>

        <div class="space-y-2 px-3 pb-3">
          <div
            v-for="issue in issues"
            :key="issue.id"
            class="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
            :class="{
              'border-red-200 bg-red-50': issue.severity === 'high',
              'border-yellow-200 bg-yellow-50': issue.severity === 'medium',
              'border-gray-200': issue.severity === 'low',
              'opacity-60': issue.resolved
            }"
          >
            <div class="flex items-start justify-between">
              <a-checkbox
                v-model:checked="selectedIssues"
                :value="issue.id"
                class="mr-3 mt-1"
              />
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <a-tag 
                    :color="getTypeColor(issue.type)" 
                    size="small"
                  >
                    {{ getTypeName(issue.type) }}
                  </a-tag>
                  <a-tag 
                    :color="getSeverityColor(issue.severity)"
                    size="small"
                  >
                    {{ getSeverityName(issue.severity) }}
                  </a-tag>
                  <span v-if="issue.resolved" class="text-green-600 text-xs">
                    ✓ 已解决
                  </span>
                </div>
                
                <div class="text-sm text-gray-800 leading-relaxed mb-2">
                  {{ issue.issue }}
                </div>
                
                <div class="text-xs text-gray-500">
                  {{ formatDate(issue.createdAt) }}
                </div>
              </div>

              <div class="flex space-x-1 ml-2">
                <a-tooltip title="查看详情">
                  <a-button 
                    size="small" 
                    type="text"
                    @click="viewIssueDetails(issue)"
                  >
                    <EyeOutlined />
                  </a-button>
                </a-tooltip>
                
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
                
                <a-popconfirm
                  title="确定要删除这个问题吗？"
                  @confirm="deleteIssue(issue.id)"
                >
                  <a-button 
                    size="small" 
                    type="text"
                    danger
                  >
                    <DeleteOutlined />
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 问题详情模态框 -->
    <a-modal
      v-model:visible="detailsVisible"
      title="问题详情"
      width="800px"
      :footer="null"
    >
      <div v-if="selectedIssueDetails">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">问题类型</label>
            <a-tag :color="getTypeColor(selectedIssueDetails.issue.type)">
              {{ getTypeName(selectedIssueDetails.issue.type) }}
            </a-tag>
            <a-tag :color="getSeverityColor(selectedIssueDetails.issue.severity)" class="ml-2">
              {{ getSeverityName(selectedIssueDetails.issue.severity) }}
            </a-tag>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">问题描述</label>
            <div class="bg-gray-50 p-3 rounded text-sm">
              {{ selectedIssueDetails.issue.issue }}
            </div>
          </div>
          
          <div v-if="selectedIssueDetails.context.relatedCharacters?.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">相关角色</label>
            <div class="flex flex-wrap gap-2">
              <a-tag v-for="char in selectedIssueDetails.context.relatedCharacters" :key="char.id">
                {{ char.name }}
              </a-tag>
            </div>
          </div>
          
          <div v-if="selectedIssueDetails.context.relatedSettings?.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">相关设定</label>
            <div class="flex flex-wrap gap-2">
              <a-tag v-for="setting in selectedIssueDetails.context.relatedSettings" :key="setting.id">
                {{ setting.name }}
              </a-tag>
            </div>
          </div>
          
          <div v-if="selectedIssueDetails.context.relatedChapters?.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">相关章节</label>
            <div class="space-y-1">
              <div 
                v-for="chapter in selectedIssueDetails.context.relatedChapters" 
                :key="chapter.id"
                class="text-sm text-blue-600 cursor-pointer hover:underline"
                @click="jumpToChapter(chapter.id)"
              >
                第{{ chapter.chapterNumber }}章: {{ chapter.title }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { 
  ScanOutlined, 
  DownOutlined, 
  EyeOutlined, 
  CheckOutlined, 
  UndoOutlined, 
  DeleteOutlined 
} from '@ant-design/icons-vue'
import { consistencyService } from '@/services/consistencyService'
import { useProjectStore } from '@/stores/project'

const props = defineProps({
  currentChapterId: {
    type: String,
    default: null
  },
  currentNovelId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['issue-updated', 'jump-to-chapter'])

const projectStore = useProjectStore()

// 状态管理
const loading = ref(false)
const checking = ref(false)
const batchChecking = ref(false)
const issues = ref([])
const stats = ref({
  totalIssues: 0,
  highSeverity: 0,
  mediumSeverity: 0,
  lowSeverity: 0,
  resolvedIssues: 0,
  unresolvedIssues: 0
})

// 筛选状态
const filters = ref({
  type: null,
  severity: null,
  resolved: null
})

// 选择状态
const selectedIssues = ref([])
const checkAll = ref(false)
const indeterminate = ref(false)

// 详情模态框
const detailsVisible = ref(false)
const selectedIssueDetails = ref(null)

// 计算属性
const hasFilters = computed(() => {
  return filters.value.type || filters.value.severity || filters.value.resolved !== null
})

// 监听选择变化
watch(() => selectedIssues.value, (val) => {
  indeterminate.value = val.length > 0 && val.length < issues.value.length
  checkAll.value = val.length === issues.value.length && issues.value.length > 0
}, { deep: true })

// 方法
const fetchIssues = async () => {
  if (!props.currentChapterId) return
  
  loading.value = true
  try {
    const response = await consistencyService.getChapterIssues(
      props.currentChapterId,
      filters.value
    )
    issues.value = response
    updateStats()
  } catch (error) {
    message.error('获取一致性问题失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const total = issues.value.length
  const high = issues.value.filter(i => i.severity === 'high').length
  const medium = issues.value.filter(i => i.severity === 'medium').length
  const low = issues.value.filter(i => i.severity === 'low').length
  const resolved = issues.value.filter(i => i.resolved).length
  
  stats.value = {
    totalIssues: total,
    highSeverity: high,
    mediumSeverity: medium,
    lowSeverity: low,
    resolvedIssues: resolved,
    unresolvedIssues: total - resolved
  }
}

const runConsistencyCheck = async () => {
  if (!props.currentChapterId) {
    message.warning('请先选择要检查的章节')
    return
  }
  
  checking.value = true
  try {
    await consistencyService.checkChapter(props.currentChapterId)
    message.success('一致性检查完成')
    await fetchIssues()
    emit('issue-updated')
  } catch (error) {
    message.error('一致性检查失败')
    console.error(error)
  } finally {
    checking.value = false
  }
}

const runBatchCheck = async () => {
  if (!props.currentNovelId) {
    message.warning('请先选择小说项目')
    return
  }
  
  batchChecking.value = true
  try {
    await consistencyService.batchCheck(props.currentNovelId)
    message.success('批量检查完成')
    await fetchIssues()
    emit('issue-updated')
  } catch (error) {
    message.error('批量检查失败')
    console.error(error)
  } finally {
    batchChecking.value = false
  }
}

const onCheckAllChange = (e) => {
  selectedIssues.value = e.target.checked ? issues.value.map(i => i.id) : []
}

const toggleResolveStatus = async (issue) => {
  try {
    await consistencyService.resolveIssue(issue.id, !issue.resolved)
    issue.resolved = !issue.resolved
    updateStats()
    message.success(`已${issue.resolved ? '解决' : '重新打开'}问题`)
    emit('issue-updated')
  } catch (error) {
    message.error('操作失败')
    console.error(error)
  }
}

const batchResolve = async (resolved) => {
  if (selectedIssues.value.length === 0) return
  
  try {
    await consistencyService.batchResolve(selectedIssues.value, resolved)
    
    // 更新本地状态
    issues.value.forEach(issue => {
      if (selectedIssues.value.includes(issue.id)) {
        issue.resolved = resolved
      }
    })
    
    selectedIssues.value = []
    updateStats()
    message.success(`已批量${resolved ? '解决' : '重新打开'} ${selectedIssues.value.length} 个问题`)
    emit('issue-updated')
  } catch (error) {
    message.error('批量操作失败')
    console.error(error)
  }
}

const deleteIssue = async (issueId) => {
  try {
    await consistencyService.deleteIssue(issueId)
    issues.value = issues.value.filter(i => i.id !== issueId)
    selectedIssues.value = selectedIssues.value.filter(id => id !== issueId)
    updateStats()
    message.success('问题已删除')
    emit('issue-updated')
  } catch (error) {
    message.error('删除失败')
    console.error(error)
  }
}

const viewIssueDetails = async (issue) => {
  try {
    const details = await consistencyService.getIssueDetails(issue.id)
    selectedIssueDetails.value = details
    detailsVisible.value = true
  } catch (error) {
    message.error('获取问题详情失败')
    console.error(error)
  }
}

const jumpToChapter = (chapterId) => {
  emit('jump-to-chapter', chapterId)
  detailsVisible.value = false
}

const handleMenuClick = ({ key }) => {
  switch (key) {
    case 'export':
      exportReport()
      break
    case 'clear-resolved':
      clearResolved()
      break
    case 'settings':
      openSettings()
      break
  }
}

const exportReport = () => {
  // TODO: 实现导出功能
  message.info('导出功能开发中...')
}

const clearResolved = async () => {
  const resolvedIssues = issues.value.filter(i => i.resolved).map(i => i.id)
  if (resolvedIssues.length === 0) {
    message.info('没有已解决的问题需要清除')
    return
  }
  
  try {
    await Promise.all(resolvedIssues.map(id => consistencyService.deleteIssue(id)))
    issues.value = issues.value.filter(i => !i.resolved)
    selectedIssues.value = selectedIssues.value.filter(id => !resolvedIssues.includes(id))
    updateStats()
    message.success(`已清除 ${resolvedIssues.length} 个已解决的问题`)
    emit('issue-updated')
  } catch (error) {
    message.error('清除操作失败')
    console.error(error)
  }
}

const openSettings = () => {
  // TODO: 打开检查设置
  message.info('检查设置功能开发中...')
}

// 工具方法
const getTypeColor = (type) => {
  const colors = {
    character: 'blue',
    setting: 'green',
    timeline: 'orange',
    logic: 'red'
  }
  return colors[type] || 'default'
}

const getTypeName = (type) => {
  const names = {
    character: '角色一致性',
    setting: '世界设定',
    timeline: '时间线',
    logic: '逻辑一致性'
  }
  return names[type] || type
}

const getSeverityColor = (severity) => {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'gray'
  }
  return colors[severity] || 'default'
}

const getSeverityName = (severity) => {
  const names = {
    high: '严重',
    medium: '中等',
    low: '轻微'
  }
  return names[severity] || severity
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听属性变化
watch(() => props.currentChapterId, (newId) => {
  if (newId) {
    fetchIssues()
  } else {
    issues.value = []
    updateStats()
  }
}, { immediate: true })

onMounted(() => {
  if (props.currentChapterId) {
    fetchIssues()
  }
})
</script>

<style scoped>
.consistency-panel {
  background: #fafafa;
}

.consistency-panel :deep(.ant-tag) {
  border-radius: 12px;
  font-size: 11px;
}

.consistency-panel :deep(.ant-checkbox-wrapper) {
  align-items: flex-start;
}
</style>