<template>
  <div class="h-full p-6 overflow-y-auto bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">进度统计</h1>
      
      <!-- Overall Progress -->
      <a-card class="mb-6" title="总体进度">
        <a-row :gutter="[16, 16]">
          <a-col :span="6">
            <a-statistic
              title="总字数"
              :value="totalWords"
              suffix="字"
              :value-style="{ color: '#3f8600' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="已完成章节"
              :value="completedChapters"
              :suffix="`/ ${totalChapters}`"
              :value-style="{ color: '#1890ff' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="写作天数"
              :value="writingDays"
              suffix="天"
              :value-style="{ color: '#722ed1' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="平均日产"
              :value="averageWordsPerDay"
              suffix="字/天"
              :value-style="{ color: '#eb2f96' }"
            />
          </a-col>
        </a-row>
        
        <div class="mt-6">
          <h4 class="text-sm font-medium text-gray-700 mb-2">完成进度</h4>
          <a-progress 
            :percent="overallProgress" 
            :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
            class="mb-2"
          />
          <p class="text-sm text-gray-500">
            预计完成时间：{{ estimatedCompletionDate }}
          </p>
        </div>
      </a-card>

      <a-row :gutter="[16, 16]" class="mb-6">
        <!-- Writing Activity Chart -->
        <a-col :span="16">
          <a-card title="写作活跃度" size="small">
            <div class="h-64 flex items-center justify-center text-gray-500">
              写作活跃度图表区域
              <br>
              (可集成 Chart.js 或其他图表库)
            </div>
          </a-card>
        </a-col>
        
        <!-- Word Count Trends -->
        <a-col :span="8">
          <a-card title="字数趋势" size="small" class="mb-4">
            <a-space direction="vertical" class="w-full">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">今日新增</span>
                <span class="text-lg font-semibold text-green-600">+{{ todayWords }}字</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">本周新增</span>
                <span class="text-lg font-semibold text-blue-600">+{{ weekWords }}字</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">本月新增</span>
                <span class="text-lg font-semibold text-purple-600">+{{ monthWords }}字</span>
              </div>
            </a-space>
          </a-card>
        </a-col>
      </a-row>

      <!-- Chapter Progress -->
      <a-card title="章节进度" class="mb-6">
        <a-table 
          :columns="chapterColumns" 
          :data-source="chapterProgress" 
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getChapterStatusColor(record.status)">
                {{ getChapterStatusText(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <a-progress 
                :percent="record.progress" 
                size="small" 
                :show-info="false"
              />
              <span class="ml-2 text-sm">{{ record.progress }}%</span>
            </template>
            <template v-else-if="column.key === 'wordCount'">
              {{ record.wordCount.toLocaleString() }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space size="small">
                <a-button type="text" size="small" @click="editChapter(record)">
                  编辑
                </a-button>
                <a-button type="text" size="small" @click="viewChapter(record)">
                  查看
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- Writing Goals -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-card title="写作目标" size="small">
            <a-space direction="vertical" class="w-full">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">日目标 ({{ dailyGoal }}字)</span>
                  <span class="text-sm">{{ Math.round((todayWords / dailyGoal) * 100) }}%</span>
                </div>
                <a-progress 
                  :percent="Math.min((todayWords / dailyGoal) * 100, 100)" 
                  size="small"
                  :stroke-color="todayWords >= dailyGoal ? '#52c41a' : '#1890ff'"
                />
              </div>
              
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">周目标 ({{ weeklyGoal }}字)</span>
                  <span class="text-sm">{{ Math.round((weekWords / weeklyGoal) * 100) }}%</span>
                </div>
                <a-progress 
                  :percent="Math.min((weekWords / weeklyGoal) * 100, 100)" 
                  size="small"
                  :stroke-color="weekWords >= weeklyGoal ? '#52c41a' : '#1890ff'"
                />
              </div>
              
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">月目标 ({{ monthlyGoal }}字)</span>
                  <span class="text-sm">{{ Math.round((monthWords / monthlyGoal) * 100) }}%</span>
                </div>
                <a-progress 
                  :percent="Math.min((monthWords / monthlyGoal) * 100, 100)" 
                  size="small"
                  :stroke-color="monthWords >= monthlyGoal ? '#52c41a' : '#1890ff'"
                />
              </div>
            </a-space>
          </a-card>
        </a-col>
        
        <a-col :span="12">
          <a-card title="成就徽章" size="small">
            <div class="grid grid-cols-3 gap-3">
              <div 
                v-for="achievement in achievements" 
                :key="achievement.id"
                class="text-center p-2 border rounded-lg"
                :class="achievement.earned ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'"
              >
                <div class="text-2xl mb-1">{{ achievement.icon }}</div>
                <div class="text-xs text-gray-600">{{ achievement.title }}</div>
                <div v-if="!achievement.earned" class="text-xs text-gray-400 mt-1">
                  {{ achievement.description }}
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { NovelStatistics, ChapterProgress, WritingGoals, Achievement } from '@/types'
import { novelService } from '@/services/novelService'

// Props - 当前项目ID
const props = defineProps<{
  novelId?: string
}>()

// 响应式数据
const statistics = ref<NovelStatistics | null>(null)
const chapterProgress = ref<ChapterProgress[]>([])
const writingGoals = ref<WritingGoals | null>(null)
const loading = ref(false)

// 计算属性
const totalWords = computed(() => statistics.value?.overview.totalWords || 0)
const completedChapters = computed(() => statistics.value?.chapters.completed || 0)
const totalChapters = computed(() => statistics.value?.chapters.total || 0)
const writingDays = computed(() => statistics.value?.overview.writingDays || 0)
const todayWords = computed(() => statistics.value?.recentActivity.todayWords || 0)
const weekWords = computed(() => statistics.value?.recentActivity.weekWords || 0)
const monthWords = computed(() => statistics.value?.recentActivity.monthWords || 0)

const dailyGoal = computed(() => writingGoals.value?.daily.target || 1000)
const weeklyGoal = computed(() => writingGoals.value?.weekly.target || 7000)
const monthlyGoal = computed(() => writingGoals.value?.monthly.target || 30000)

const averageWordsPerDay = computed(() => statistics.value?.overview.averageWordsPerDay || 0)
const overallProgress = computed(() => statistics.value?.overview.overallProgress || 0)
const estimatedCompletionDate = computed(() => statistics.value?.overview.estimatedCompletionDate || '暂无预计')

// Mock achievements - 实际项目中可以从 API 获取
const achievements = ref<Achievement[]>([
  { id: '1', icon: '✍️', title: '初试笔墨', description: '完成第一章', earned: true },
  { id: '2', icon: '📖', title: '日积月累', description: '连续写作7天', earned: true },
  { id: '3', icon: '🎯', title: '目标达成', description: '达成月目标', earned: false },
  { id: '4', icon: '💎', title: '精益求精', description: '修改章节10次', earned: false },
  { id: '5', icon: '🏆', title: '创作大师', description: '完成10万字', earned: false },
  { id: '6', icon: '🌟', title: '持之以恒', description: '连续写作30天', earned: false }
])

// 表格列配置
const chapterColumns = [
  { title: '章节', dataIndex: 'title', key: 'title' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '字数', dataIndex: 'wordCount', key: 'wordCount', width: 100 },
  { title: '进度', dataIndex: 'progress', key: 'progress', width: 150 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 120 },
  { title: '操作', key: 'actions', width: 120 }
]

// 加载数据
const loadData = async () => {
  if (!props.novelId) {
    // 如果没有提供小说ID，尝试获取第一个小说的统计信息
    try {
      const novels = await novelService.getNovels()
      if (novels.length === 0) return
      
      const novelId = novels[0].id
      await loadStatisticsData(novelId)
    } catch (error) {
      console.error('Failed to load novels:', error)
    }
    return
  }
  
  await loadStatisticsData(props.novelId)
}

const loadStatisticsData = async (novelId: string) => {
  try {
    loading.value = true
    const [stats, progress, goals] = await Promise.all([
      novelService.getNovelStatistics(novelId),
      novelService.getChapterProgress(novelId),
      novelService.getWritingGoals(novelId)
    ])
    
    statistics.value = stats
    chapterProgress.value = progress
    writingGoals.value = goals
  } catch (error) {
    console.error('Failed to load statistics:', error)
    message.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// 工具函数
const getChapterStatusColor = (status: string) => {
  const colors = {
    'planning': 'default',
    'writing': 'processing',
    'reviewing': 'warning', 
    'completed': 'success'
  }
  return colors[status as keyof typeof colors] || 'default'
}

const getChapterStatusText = (status: string) => {
  const texts = {
    'planning': '规划中',
    'writing': '写作中',
    'reviewing': '审核中',
    'completed': '已完成'
  }
  return texts[status as keyof typeof texts] || status
}

// 操作函数
const editChapter = (chapter: ChapterProgress) => {
  console.log('Edit chapter:', chapter)
  // TODO: 跳转到章节编辑页面或打开编辑对话框
}

const viewChapter = (chapter: ChapterProgress) => {
  console.log('View chapter:', chapter)
  // TODO: 跳转到章节详情页面
}
</script>