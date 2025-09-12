<template>
  <div class="progress-stats-container">
    <div class="max-w-7xl mx-auto p-6">
      <!-- 页面标题 -->
      <a-row class="mb-8">
        <a-col :span="24">
          <div class="page-header">
            <h1 class="page-title">
              <DashboardOutlined />
              进度统计
            </h1>
            <p class="page-subtitle">追踪您的创作进程，激发写作动力</p>
          </div>
        </a-col>
      </a-row>

      <!-- 核心指标卡片组 -->
      <a-row :gutter="[16, 16]" class="mb-6">
        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="metric-card metric-card-blue" hoverable :loading="loading">
            <template #extra>
              <EditOutlined class="metric-icon" />
            </template>
            <a-statistic
              title="总字数"
              :value="totalWords"
              :value-style="{ color: '#1890ff' }"
              suffix="字"
            >
              <template #formatter="{ value }">
                {{ formattedTotalWords }}
              </template>
            </a-statistic>
            <div class="metric-subtitle">累计创作</div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="metric-card metric-card-green" hoverable :loading="loading">
            <template #extra>
              <CheckCircleOutlined class="metric-icon" />
            </template>
            <a-statistic
              :title="`完成章节 (${totalChapters > 0 ? Math.round((completedChapters/totalChapters)*100) : 0}%)`"
              :value="completedChapters"
              :suffix="`/${totalChapters}`"
              :value-style="{ color: '#52c41a' }"
            />
            <div class="metric-subtitle">章节进度</div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="metric-card metric-card-purple" hoverable :loading="loading">
            <template #extra>
              <CalendarOutlined class="metric-icon" />
            </template>
            <a-statistic
              title="写作天数"
              :value="writingDays"
              suffix="天"
              :value-style="{ color: '#722ed1' }"
            />
            <div class="metric-subtitle">创作历程</div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="metric-card metric-card-orange" hoverable :loading="loading">
            <template #extra>
              <BarChartOutlined class="metric-icon" />
            </template>
            <a-statistic
              title="日均产量"
              :value="averageWordsPerDay"
              suffix="字/天"
              :value-style="{ color: '#fa8c16' }"
            />
            <div class="metric-subtitle">平均效率</div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 写作活跃度 - 单独一行 -->
      <a-row :gutter="[24, 24]" class="mb-6">
        <a-col :span="24">
          <a-card class="activity-card">
            <template #title>
              <div class="card-title">
                <LineChartOutlined />
                写作活跃度
              </div>
            </template>
            <template #extra>
              <div class="activity-stats">
                <a-tag color="blue">
                  过去一年：{{ totalContributions }} 次贡献
                </a-tag>
                <a-tag color="green" v-if="currentStreakDays > 0">
                  连续写作：{{ currentStreakDays }} 天
                </a-tag>
                <a-tag color="purple">
                  总字数：{{ formatWordCount(totalWordsThisYear) }}
                </a-tag>
              </div>
            </template>

            <div class="writing-activity-chart">
              <!-- 月份标签 -->
              <div class="months-row">
                <div 
                  class="month-label" 
                  v-for="month in months" 
                  :key="month.index"
                  :class="{ 'current-month': month.isCurrent }"
                  :title="`${month.year}年${month.name}`"
                  :style="{ left: `${month.leftOffset}px` }"
                >
                  {{ month.displayName }}
                </div>
              </div>

              <!-- 活跃度网格 -->
              <div class="activity-grid">
                <!-- 周标签 -->
                <div class="weeks-column">
                  <div class="week-label" v-for="(day, index) in weekDays" :key="index">
                    <span v-if="index === 1 || index === 3 || index === 5">{{ day }}</span>
                  </div>
                </div>

                <!-- 活跃度格子 -->
                <div class="days-grid">
                  <div
                    v-for="day in activityData"
                    :key="day.date"
                    :class="[
                      'activity-day',
                      `activity-level-${day.level}`
                    ]"
                    :title="getTooltip(day)"
                    @mouseenter="showTooltip(day, $event)"
                    @mouseleave="hideTooltip"
                  ></div>
                </div>
              </div>

              <!-- 图例 -->
              <div class="legend">
                <span class="legend-text">少</span>
                <div class="legend-colors">
                  <div class="activity-day activity-level-0"></div>
                  <div class="activity-day activity-level-1"></div>
                  <div class="activity-day activity-level-2"></div>
                  <div class="activity-day activity-level-3"></div>
                  <div class="activity-day activity-level-4"></div>
                </div>
                <span class="legend-text">多</span>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 近期成果和写作目标并排 -->
      <a-row :gutter="[24, 24]" class="mb-6">
        <!-- 近期成果 -->
        <a-col :xs="24" :lg="12">
          <a-card class="recent-stats-card">
            <template #title>
              <div class="card-title">
                <TrophyOutlined />
                近期成果
              </div>
            </template>

            <a-space direction="vertical" size="middle" style="width: 100%;">
              <a-card size="small" class="achievement-item achievement-today">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div class="achievement-label">今日新增</div>
                    <div class="achievement-value">+{{ todayWords }}字</div>
                  </div>
                  <PlusOutlined class="achievement-icon" />
                </div>
              </a-card>

              <a-card size="small" class="achievement-item achievement-week">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div class="achievement-label">本周新增</div>
                    <div class="achievement-value">+{{ weekWords }}字</div>
                  </div>
                  <RiseOutlined class="achievement-icon" />
                </div>
              </a-card>

              <a-card size="small" class="achievement-item achievement-month">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div class="achievement-label">本月新增</div>
                    <div class="achievement-value">+{{ monthWords }}字</div>
                  </div>
                  <UnorderedListOutlined class="achievement-icon" />
                </div>
              </a-card>
            </a-space>
          </a-card>
        </a-col>

        <!-- 写作目标 -->
        <a-col :xs="24" :lg="12">
          <a-card class="goals-card">
            <template #title>
              <div class="card-title">
                <AimOutlined />
                写作目标
              </div>
            </template>
            <template #extra>
              <a-button @click="openGoalModal" type="primary" size="small">
                <AimOutlined />
                设置目标
              </a-button>
            </template>

            <a-space direction="vertical" size="middle" style="width: 100%;">
              <div class="goal-item">
                <div class="goal-header">
                  <span class="goal-label">日目标</span>
                  <span class="goal-text">{{ todayWords }} / {{ dailyGoal }} 字</span>
                </div>
                <a-progress
                  :percent="Math.min((todayWords / dailyGoal) * 100, 100)"
                  stroke-color="#52c41a"
                  :show-info="false"
                />
              </div>

              <div class="goal-item">
                <div class="goal-header">
                  <span class="goal-label">周目标</span>
                  <span class="goal-text">{{ weekWords }} / {{ weeklyGoal }} 字</span>
                </div>
                <a-progress
                  :percent="Math.min((weekWords / weeklyGoal) * 100, 100)"
                  stroke-color="#1890ff"
                  :show-info="false"
                />
              </div>

              <div class="goal-item">
                <div class="goal-header">
                  <span class="goal-label">月目标</span>
                  <span class="goal-text">{{ monthWords }} / {{ monthlyGoal }} 字</span>
                </div>
                <a-progress
                  :percent="Math.min((monthWords / monthlyGoal) * 100, 100)"
                  stroke-color="#722ed1"
                  :show-info="false"
                />
              </div>
            </a-space>
          </a-card>
        </a-col>
      </a-row>

      <!-- 整体进度卡片 -->
      <a-row :gutter="[24, 24]" class="mb-6">
        <a-col :span="24">
          <a-card class="overall-progress-card">
            <template #title>
              <div class="card-title">
                <BookOutlined />
                整体项目进度
              </div>
            </template>

            <a-row :gutter="[32, 32]" align="middle">
              <a-col :xs="24" :md="14">
                <div class="progress-info">
                  <div class="progress-header">
                    <span class="progress-label">完成进度</span>
                    <span class="progress-percentage">{{ overallProgress }}%</span>
                  </div>
                  <a-progress
                    :percent="overallProgress"
                    stroke-color="#722ed1"
                    trail-color="var(--theme-border)"
                    :stroke-width="8"
                    class="mb-4"
                  />
                  <div class="estimated-completion">
                    <CalendarOutlined />
                    <span class="ml-2">预计完成：{{ estimatedCompletionDate }}</span>
                  </div>
                </div>
              </a-col>

              <a-col :xs="24" :md="10">
                <div class="progress-circle-container">
                  <a-progress
                    type="circle"
                    :percent="Math.round(overallProgress)"
                    :width="120"
                    stroke-color="#722ed1"
                    :format="percent => `${percent}%`"
                  />
                  <p class="circle-label">项目完成度</p>
                </div>
              </a-col>
            </a-row>
          </a-card>
        </a-col>
      </a-row>

      <!-- 章节进度表格 -->
      <a-row>
        <a-col :span="24">
          <a-card class="chapter-table-card">
            <template #title>
              <div class="card-title">
                <ReadOutlined />
                章节详情
              </div>
            </template>
            <template #extra>
              <a-space>
                <a-button @click="refreshData" size="small">
                  <ReloadOutlined />
                  刷新
                </a-button>
                <a-button 
                  type="primary" 
                  size="small"
                  @click="createNewChapter"
                >
                  <PlusOutlined />
                  新建章节
                </a-button>
              </a-space>
            </template>

            <div class="card-subtitle mb-4">各章节的创作进度和状态</div>

            <a-table
              :dataSource="chapterProgress"
              :columns="chapterColumns"
              :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
              :scroll="{ x: 800 }"
              :loading="chaptersLoading"
              :row-selection="{
                selectedRowKeys: selectedChapterKeys,
                onChange: onChapterSelectionChange,
                getCheckboxProps: (record) => ({ disabled: record.status === 'completed' })
              }"
              row-key="id"
              class="chapter-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getChapterStatusColor(record.status)">
                    {{ getChapterStatusText(record.status) }}
                  </a-tag>
                </template>

                <template v-else-if="column.key === 'wordCount'">
                  <span>{{ (record.wordCount || 0).toLocaleString() }}</span>
                </template>

                <template v-else-if="column.key === 'progress'">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <a-progress
                      :percent="record.progress"
                      :show-info="false"
                      :stroke-width="6"
                      style="flex: 1; min-width: 60px;"
                    />
                    <span style="min-width: 40px; text-align: right;">{{ record.progress }}%</span>
                  </div>
                </template>

                <template v-else-if="column.key === 'updatedAt'">
                  <span>{{ formatDate(record.updatedAt) }}</span>
                </template>

                <template v-else-if="column.key === 'actions'">
                  <a-space>
                    <a-button type="link" size="small" @click="viewChapter(record)">
                      <EyeOutlined />
                      查看
                    </a-button>
                    <a-button type="link" size="small" @click="editChapter(record)">
                      <EditOutlined />
                      编辑
                    </a-button>
                    <a-button 
                      type="link" 
                      size="small" 
                      danger
                      @click="deleteChapter(record)"
                      :disabled="record.status === 'completed'"
                    >
                      <DeleteOutlined />
                      删除
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>

            <!-- 批量操作栏 -->
            <div v-if="selectedChapterKeys.length > 0" class="batch-actions">
              <a-alert 
                :message="`已选择 ${selectedChapterKeys.length} 个章节`" 
                type="info" 
                show-icon
                class="mb-3"
              >
                <template #action>
                  <a-space>
                    <a-button size="small" @click="batchUpdateStatus('writing')">
                      批量设为写作中
                    </a-button>
                    <a-button size="small" @click="batchUpdateStatus('completed')">
                      批量设为已完成
                    </a-button>
                    <a-button size="small" danger @click="batchDeleteChapters">
                      批量删除
                    </a-button>
                    <a-button size="small" @click="clearSelection">
                      清除选择
                    </a-button>
                  </a-space>
                </template>
              </a-alert>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 写作目标设置模态框 -->
      <a-modal
        v-model:open="goalModalVisible"
        title="设置写作目标"
        ok-text="保存"
        cancel-text="取消"
        @ok="saveGoals"
        width="500px"
      >
        <a-form layout="vertical">
          <a-form-item label="日目标">
            <a-input-number
              v-model:value="goalForm.daily"
              :min="100"
              :max="10000"
              :step="100"
              style="width: 100%"
              addon-after="字"
            />
            <div class="goal-hint">建议设置在 500-3000 字之间</div>
          </a-form-item>

          <a-form-item label="周目标">
            <a-input-number
              v-model:value="goalForm.weekly"
              :min="1000"
              :max="50000"
              :step="500"
              style="width: 100%"
              addon-after="字"
            />
            <div class="goal-hint">通常是日目标的 5-7 倍</div>
          </a-form-item>

          <a-form-item label="月目标">
            <a-input-number
              v-model:value="goalForm.monthly"
              :min="5000"
              :max="200000"
              :step="1000"
              style="width: 100%"
              addon-after="字"
            />
            <div class="goal-hint">专业作家通常设置在 30000-100000 字</div>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 成就系统 -->
      <a-row class="mt-6">
        <a-col :span="24">
          <a-card class="achievement-card">
            <template #title>
              <div class="card-title">
                <TrophyOutlined />
                写作成就
              </div>
            </template>

            <a-row :gutter="[16, 16]">
              <a-col
                v-for="achievement in achievements"
                :key="achievement.id"
                :xs="12" :sm="8" :md="6" :lg="4" :xl="4"
              >
                <a-card
                  size="small"
                  :class="[
                    'achievement-badge',
                    achievement.earned ? 'achievement-earned' : 'achievement-locked'
                  ]"
                  hoverable
                >
                  <div class="achievement-content">
                    <div class="achievement-icon-large">
                      {{ achievement.icon }}
                    </div>
                    <div class="achievement-title">
                      {{ achievement.title }}
                    </div>
                    <div class="achievement-description">
                      {{ achievement.description }}
                    </div>
                    <div class="achievement-status">
                      <a-tag
                        v-if="achievement.earned"
                        color="gold"
                        class="achievement-earned-tag"
                      >
                        <CheckOutlined />
                        已获得
                      </a-tag>
                      <a-tag v-else color="default" class="achievement-locked-tag">
                        <LockOutlined />
                        未解锁
                      </a-tag>
                    </div>
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import { useRouter } from 'vue-router'
import {
  DashboardOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  BarChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
  PlusOutlined,
  RiseOutlined,
  UnorderedListOutlined,
  AimOutlined,
  BookOutlined,
  ReadOutlined,
  EyeOutlined,
  CheckOutlined,
  LockOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import type { NovelStatistics, ChapterProgress, WritingGoals, Achievement } from '@/types'
import { novelService } from '@/services/novelService'
import { chapterService } from '@/services/chapterService'
import { formatWordCount as formatWordCountUtil } from '@/utils/textUtils'

// Props - 当前项目ID
const props = defineProps<{
  novelId?: string
}>()

// Router
const router = useRouter()

// 响应式数据
const statistics = ref<NovelStatistics | null>(null)
const chapterProgress = ref<ChapterProgress[]>([])
const writingGoals = ref<WritingGoals | null>(null)
const loading = ref(false)
const chaptersLoading = ref(false)
const currentNovelId = ref<string>('')

// 目标设置模态框
const goalModalVisible = ref(false)
const goalForm = ref({
  daily: 1000,
  weekly: 7000,
  monthly: 30000
})

// 选中的章节
const selectedChapterKeys = ref<string[]>([])
const selectedChapters = ref<ChapterProgress[]>([])

// 计算属性 - 带数据验证的安全访问
const totalWords = computed(() => {
  const words = statistics.value?.overview?.totalWords
  return typeof words === 'number' && words >= 0 ? words : 0
})

// 格式化的总字数显示
const formattedTotalWords = computed(() => {
  return formatWordCountUtil(totalWords.value)
})

const completedChapters = computed(() => {
  const completed = statistics.value?.chapters?.completed
  return typeof completed === 'number' && completed >= 0 ? completed : 0
})

const totalChapters = computed(() => {
  const total = statistics.value?.chapters?.total
  return typeof total === 'number' && total >= 0 ? total : 0
})

const writingDays = computed(() => {
  const days = statistics.value?.overview?.writingDays
  return typeof days === 'number' && days >= 0 ? days : 0
})

const todayWords = computed(() => {
  const words = statistics.value?.recentActivity?.todayWords
  return typeof words === 'number' && words >= 0 ? words : 0
})

const weekWords = computed(() => {
  const words = statistics.value?.recentActivity?.weekWords
  return typeof words === 'number' && words >= 0 ? words : 0
})

const monthWords = computed(() => {
  const words = statistics.value?.recentActivity?.monthWords
  return typeof words === 'number' && words >= 0 ? words : 0
})

const dailyGoal = computed(() => {
  const goal = writingGoals.value?.daily?.target
  return typeof goal === 'number' && goal > 0 ? goal : 1000
})

const weeklyGoal = computed(() => {
  const goal = writingGoals.value?.weekly?.target
  return typeof goal === 'number' && goal > 0 ? goal : 7000
})

const monthlyGoal = computed(() => {
  const goal = writingGoals.value?.monthly?.target
  return typeof goal === 'number' && goal > 0 ? goal : 30000
})

const averageWordsPerDay = computed(() => {
  const avg = statistics.value?.overview?.averageWordsPerDay
  return typeof avg === 'number' && avg >= 0 ? avg : 0
})

const overallProgress = computed(() => {
  const progress = statistics.value?.overview?.overallProgress
  return typeof progress === 'number' && progress >= 0 && progress <= 100 ? progress : 0
})

const estimatedCompletionDate = computed(() => {
  const date = statistics.value?.overview?.estimatedCompletionDate
  return date && typeof date === 'string' ? date : '暂无预计'
})

// Mock achievements - 实际项目中可以从 API 获取
const achievements = ref<Achievement[]>([
  { id: '1', icon: '✍️', title: '初试笔墨', description: '完成第一章', earned: true },
  { id: '2', icon: '📖', title: '日积月累', description: '连续写作7天', earned: true },
  { id: '3', icon: '🎯', title: '目标达成', description: '达成月目标', earned: false },
  { id: '4', icon: '💎', title: '精益求精', description: '修改章节10次', earned: false },
  { id: '5', icon: '🏆', title: '创作大师', description: '完成10万字', earned: false },
  { id: '6', icon: '🌟', title: '持之以恒', description: '连续写作30天', earned: false }
])

// 活跃度图表数据
interface ActivityDay {
  date: string
  level: number // 0-4，活跃度等级
  wordCount: number
  contributions: string[]
}

// 周标签
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 活跃度数据 - 使用ref以便响应式更新
const activityData = ref<ActivityDay[]>([])

// 生成基于真实数据的活跃度图表
const generateActivityData = () => {
  const days: ActivityDay[] = []
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(now.getFullYear() - 1)
  
  // 创建日期到字数的映射
  const dailyWordCount = new Map<string, number>()
  
  // 基于章节数据计算每日活跃度
  if (chapterProgress.value && chapterProgress.value.length > 0) {
    chapterProgress.value.forEach(chapter => {
      if (chapter.updatedAt && chapter.wordCount > 0) {
        const updateDate = new Date(chapter.updatedAt).toISOString().split('T')[0]
        
        // 基于章节字数和进度估算当天写作字数
        const estimatedDailyWords = Math.min(
          Math.round(chapter.wordCount * (chapter.progress / 100) * 0.1), // 假设当天写作了进度的10%
          1500 // 最大单日字数限制
        )
        
        if (estimatedDailyWords > 0) {
          const existingCount = dailyWordCount.get(updateDate) || 0
          dailyWordCount.set(updateDate, existingCount + estimatedDailyWords)
        }
      }
    })
  }

  // 如果有最近活跃度数据，也加入计算
  if (statistics.value?.recentActivity) {
    const today = new Date().toISOString().split('T')[0]
    const todayWords = statistics.value.recentActivity.todayWords
    if (todayWords > 0) {
      dailyWordCount.set(today, todayWords)
    }
  }

  // 生成365天的数据
  for (let i = 0; i < 365; i++) {
    const date = new Date(oneYearAgo)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const wordCount = dailyWordCount.get(dateStr) || 0
    let level = 0
    
    if (wordCount > 0) {
      if (wordCount < 300) level = 1
      else if (wordCount < 800) level = 2  
      else if (wordCount < 1500) level = 3
      else level = 4
    }
    
    days.push({
      date: dateStr,
      level,
      wordCount,
      contributions: wordCount > 0 ? [`写作 ${wordCount} 字`] : []
    })
  }
  
  activityData.value = days
}

// 监听数据变化，重新生成活跃度数据
watch([chapterProgress, statistics], () => {
  generateActivityData()
}, { immediate: true, deep: true })

// 月份标签
const months = computed(() => {
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                     '7月', '8月', '9月', '10月', '11月', '12月']
  const result = []
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(now.getFullYear() - 1)

  // 计算一年中每个月的起始周位置
  let currentDate = new Date(oneYearAgo)
  const startOfYear = new Date(currentDate)
  
  // 找到年初第一个周日（热力图从周日开始）
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  for (let i = 0; i < 12; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const isCurrentMonth = month.getFullYear() === now.getFullYear() && 
                          month.getMonth() === now.getMonth()
    
    // 计算该月第一天是一年中的第几周
    const monthFirstDay = new Date(month.getFullYear(), month.getMonth(), 1)
    const diffTime = monthFirstDay.getTime() - currentDate.getTime()
    const weekIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
    
    result.push({
      index: i,
      name: monthNames[month.getMonth()],
      month: month.getMonth(),
      year: month.getFullYear(),
      isCurrent: isCurrentMonth,
      displayName: isCurrentMonth ? '本月' : monthNames[month.getMonth()],
      weekIndex: Math.max(0, weekIndex), // 确保不为负数
      // 每个网格列宽14px（10px格子 + 2px间隙 + 2px边距）
      leftOffset: Math.max(0, weekIndex) * 14
    })
  }

  return result
})

// 计算总贡献次数
const totalContributions = computed(() => {
  if (!activityData.value || activityData.value.length === 0) return 0
  return activityData.value.filter(day => day.level > 0).length
})

// 计算今年总字数
const totalWordsThisYear = computed(() => {
  if (!activityData.value || activityData.value.length === 0) return 0
  return activityData.value.reduce((total, day) => total + day.wordCount, 0)
})

// 计算当前连续写作天数
const currentStreakDays = computed(() => {
  if (!activityData.value || activityData.value.length === 0) return 0
  
  let streak = 0
  const sortedData = [...activityData.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  for (const day of sortedData) {
    if (day.level > 0) {
      streak++
    } else {
      break
    }
  }
  
  return streak
})

// 格式化字数显示
const formatWordCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

// 格式化活跃度日期显示（相对时间）
const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = today.getTime() - targetDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays === 2) {
    return '前天'
  } else if (diffDays <= 7) {
    return `${diffDays}天前`
  } else {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 工具提示
const getTooltip = (day: ActivityDay): string => {
  const dateDisplay = formatActivityDate(day.date)
  const weekDay = new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'long' })
  
  if (day.wordCount === 0) {
    return `${dateDisplay} (${weekDay})\n未写作`
  } else if (day.wordCount < 500) {
    return `${dateDisplay} (${weekDay})\n${day.wordCount} 字 - 少量写作`
  } else if (day.wordCount < 1000) {
    return `${dateDisplay} (${weekDay})\n${day.wordCount} 字 - 正常写作`
  } else if (day.wordCount < 2000) {
    return `${dateDisplay} (${weekDay})\n${day.wordCount} 字 - 高产出`
  } else {
    return `${dateDisplay} (${weekDay})\n${day.wordCount} 字 - 超高产出！`
  }
}

// 显示/隐藏提示框
const showTooltip = (day: ActivityDay, event: MouseEvent) => {
  // 这里可以实现更复杂的tooltip逻辑
}

const hideTooltip = () => {
  // 隐藏tooltip
}

// 格式化数字的通用函数
const formatNumber = (num: number): string => {
  if (!num || num === 0) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

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
    chaptersLoading.value = true
    currentNovelId.value = novelId
    
    // 并行加载所有数据
    const [stats, progress, goals] = await Promise.allSettled([
      novelService.getNovelStatistics(novelId),
      novelService.getChapterProgress(novelId),
      novelService.getWritingGoals(novelId)
    ])

    // 处理统计数据
    if (stats.status === 'fulfilled') {
      statistics.value = stats.value
      console.log('Statistics loaded:', stats.value)
    } else {
      console.error('Failed to load statistics:', stats.reason)
      message.warning('统计数据加载失败，将显示默认值')
      // 设置默认统计数据
      statistics.value = {
        overview: {
          totalWords: 0,
          targetWordCount: 0,
          writingDays: 0,
          averageWordsPerDay: 0,
          overallProgress: 0,
          estimatedCompletionDate: null
        },
        chapters: {
          total: 0,
          completed: 0,
          writing: 0,
          planning: 0
        },
        counts: {
          characters: 0,
          settings: 0
        },
        recentActivity: {
          todayWords: 0,
          weekWords: 0,
          monthWords: 0
        }
      }
    }

    // 处理章节进度
    if (progress.status === 'fulfilled') {
      chapterProgress.value = progress.value
      console.log('Chapter progress loaded:', progress.value.length, 'chapters')
    } else {
      console.error('Failed to load chapter progress:', progress.reason)
      message.warning('章节数据加载失败')
      chapterProgress.value = []
    }

    // 处理写作目标
    if (goals.status === 'fulfilled') {
      writingGoals.value = goals.value
      console.log('Writing goals loaded:', goals.value)
    } else {
      console.error('Failed to load writing goals:', goals.reason)
      message.warning('写作目标加载失败，将显示默认值')
      // 设置默认目标
      writingGoals.value = {
        daily: { target: 1000, achieved: 0, progress: 0 },
        weekly: { target: 7000, achieved: 0, progress: 0 },
        monthly: { target: 30000, achieved: 0, progress: 0 }
      }
    }
    
    // 清除选择
    clearSelection()
  } catch (error) {
    console.error('Failed to load statistics:', error)
    message.error('加载数据时发生错误，请检查网络连接')
  } finally {
    loading.value = false
    chaptersLoading.value = false
  }
}

// 表格列配置
const chapterColumns: ColumnsType = [
  {
    title: '章节',
    dataIndex: 'title',
    key: 'title',
    width: 200,
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    filters: [
      { text: '规划中', value: 'planning' },
      { text: '写作中', value: 'writing' },
      { text: '审核中', value: 'reviewing' },
      { text: '已完成', value: 'completed' }
    ],
    onFilter: (value, record) => record.status === value
  },
  {
    title: '字数',
    dataIndex: 'wordCount',
    key: 'wordCount',
    width: 100,
    sorter: (a, b) => (a.wordCount || 0) - (b.wordCount || 0)
  },
  {
    title: '进度',
    dataIndex: 'progress',
    key: 'progress',
    width: 150,
    sorter: (a, b) => a.progress - b.progress
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 120,
    sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right'
  }
]

// 章节状态相关函数
const getChapterStatusColor = (status: string) => {
  const colors = {
    'planning': 'orange',
    'writing': 'blue',
    'reviewing': 'purple',
    'completed': 'green'
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
  return texts[status as keyof typeof texts] || '未知'
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

// 操作函数
const editChapter = (chapter: ChapterProgress) => {
  router.push({
    name: 'chapter',
    params: { id: chapter.id }
  })
}

const viewChapter = (chapter: ChapterProgress) => {
  router.push({
    name: 'chapter',
    params: { id: chapter.id },
    query: { mode: 'view' }
  })
}

// 删除章节
const deleteChapter = (chapter: ChapterProgress) => {
  Modal.confirm({
    title: '确认删除章节',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除章节"${chapter.title}"吗？此操作不可恢复！`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await chapterService.deleteChapter(chapter.id)
        message.success('章节删除成功')
        await refreshData()
      } catch (error) {
        console.error('Delete chapter failed:', error)
        message.error('删除失败，请稍后重试')
      }
    }
  })
}

// 新建章节
const createNewChapter = () => {
  router.push({
    name: 'chapter',
    query: { 
      create: 'true',
      novelId: currentNovelId.value
    }
  })
}

// 刷新数据
const refreshData = async () => {
  if (currentNovelId.value) {
    await loadStatisticsData(currentNovelId.value)
  } else {
    await loadData()
  }
  message.success('数据已刷新')
}

// 选择章节
const onChapterSelectionChange = (selectedKeys: string[], selectedRows: ChapterProgress[]) => {
  selectedChapterKeys.value = selectedKeys
  selectedChapters.value = selectedRows
}

// 清除选择
const clearSelection = () => {
  selectedChapterKeys.value = []
  selectedChapters.value = []
}

// 批量更新状态
const batchUpdateStatus = async (status: string) => {
  if (selectedChapterKeys.value.length === 0) return

  Modal.confirm({
    title: '批量更新状态',
    content: `确定要将选中的 ${selectedChapterKeys.value.length} 个章节状态更新为"${getChapterStatusText(status)}"吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        chaptersLoading.value = true
        await Promise.all(
          selectedChapterKeys.value.map(id => 
            chapterService.updateChapter(id, { status })
          )
        )
        message.success(`已成功更新 ${selectedChapterKeys.value.length} 个章节状态`)
        clearSelection()
        await refreshData()
      } catch (error) {
        console.error('Batch update failed:', error)
        message.error('批量更新失败，请稍后重试')
      } finally {
        chaptersLoading.value = false
      }
    }
  })
}

// 批量删除
const batchDeleteChapters = async () => {
  if (selectedChapterKeys.value.length === 0) return

  Modal.confirm({
    title: '批量删除章节',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除选中的 ${selectedChapterKeys.value.length} 个章节吗？此操作不可恢复！`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        chaptersLoading.value = true
        await Promise.all(
          selectedChapterKeys.value.map(id => chapterService.deleteChapter(id))
        )
        message.success(`已成功删除 ${selectedChapterKeys.value.length} 个章节`)
        clearSelection()
        await refreshData()
      } catch (error) {
        console.error('Batch delete failed:', error)
        message.error('批量删除失败，请稍后重试')
      } finally {
        chaptersLoading.value = false
      }
    }
  })
}

// 打开目标设置模态框
const openGoalModal = () => {
  if (writingGoals.value) {
    goalForm.value = {
      daily: writingGoals.value.daily.target,
      weekly: writingGoals.value.weekly.target,
      monthly: writingGoals.value.monthly.target
    }
  }
  goalModalVisible.value = true
}

// 保存目标
const saveGoals = async () => {
  try {
    // 这里应该调用API保存目标
    // await novelService.updateWritingGoals(currentNovelId.value, goalForm.value)
    
    // 模拟保存
    if (writingGoals.value) {
      writingGoals.value.daily.target = goalForm.value.daily
      writingGoals.value.weekly.target = goalForm.value.weekly
      writingGoals.value.monthly.target = goalForm.value.monthly
    }
    
    message.success('写作目标已保存')
    goalModalVisible.value = false
  } catch (error) {
    console.error('Save goals failed:', error)
    message.error('保存失败，请稍后重试')
  }
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 页面容器 */
.progress-stats-container {
  min-height: 100vh;
  background: var(--theme-bg-base);
  overflow-y: auto;
}

/* 页面标题样式 */
.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: bold;
  color: var(--theme-text);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.page-subtitle {
  color: var(--theme-text-secondary);
  margin-top: 8px;
  font-size: 16px;
}

/* 卡片标题样式 */
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--theme-text);
}

.card-subtitle {
  color: var(--theme-text-secondary);
  font-size: 14px;
}

/* 核心指标卡片样式 */
.metric-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid var(--theme-border);
}

.metric-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.metric-card-blue {
  border-left: 4px solid #1890ff;
}

.metric-card-green {
  border-left: 4px solid #52c41a;
}

.metric-card-purple {
  border-left: 4px solid #722ed1;
}

.metric-card-orange {
  border-left: 4px solid #fa8c16;
}

.metric-icon {
  font-size: 20px;
  color: var(--theme-text-secondary);
}

.metric-subtitle {
  color: var(--theme-text-secondary);
  font-size: 12px;
  margin-top: 4px;
}

/* 活跃度卡片 */
.activity-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.activity-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

@media (max-width: 768px) {
  .activity-stats {
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
}

/* 写作活跃度图表样式 - GitHub风格 */
.writing-activity-chart {
  padding: 16px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.months-row {
  position: relative;
  height: 18px;
  margin-bottom: 8px;
  margin-left: 40px; /* 为左侧周标签留空间 */
}

.month-label {
  position: absolute;
  top: 0;
  min-width: 20px;
  text-align: left;
  font-size: 11px;
  color: var(--theme-text-secondary);
  transition: all 0.3s ease;
  cursor: pointer;
  white-space: nowrap;
}

.month-label:hover {
  color: var(--theme-text);
  transform: scale(1.1);
}

.month-label.current-month {
  color: #1890ff;
  font-weight: 600;
  position: relative;
}

.month-label.current-month::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 2px;
  background: #1890ff;
  border-radius: 1px;
}

.activity-grid {
  display: flex;
}

.weeks-column {
  display: flex;
  flex-direction: column;
  width: 30px;
  margin-right: 8px;
}

.week-label {
  height: 12px; /* 与activity-day高度对齐 */
  display: flex;
  align-items: center;
  font-size: 10px;
  color: var(--theme-text-secondary);
  margin-bottom: 2px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(53, 12px); /* 一年大约53周 */
  grid-template-rows: repeat(7, 12px); /* 7天一周 */
  gap: 2px;
  grid-auto-flow: column; /* 按列填充，模拟按周排列 */
}

.activity-day {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.activity-day:hover {
  transform: scale(1.1);
  border: 1px solid #1890ff;
}

/* 活跃度等级颜色 - 类似GitHub，支持暗色主题 */
.activity-level-0 {
  background-color: var(--theme-border); /* 无活跃度 */
}

.activity-level-1 {
  background-color: #0e4429; /* 低活跃度 - 暗色主题适配 */
}

.activity-level-2 {
  background-color: #006d32; /* 中等活跃度 - 暗色主题适配 */
}

.activity-level-3 {
  background-color: #26a641; /* 高活跃度 - 暗色主题适配 */
}

.activity-level-4 {
  background-color: #39d353; /* 极高活跃度 - 暗色主题适配 */
}

/* 亮色主题下的活跃度颜色 */
:global(.light) .activity-level-0 {
  background-color: #ebedf0;
}

:global(.light) .activity-level-1 {
  background-color: #9be9a8;
}

:global(.light) .activity-level-2 {
  background-color: #40c463;
}

:global(.light) .activity-level-3 {
  background-color: #30a14e;
}

:global(.light) .activity-level-4 {
  background-color: #216e39;
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  gap: 4px;
}

.legend-text {
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.legend-colors {
  display: flex;
  gap: 2px;
  margin: 0 4px;
}

.legend-colors .activity-day {
  cursor: default;
}

.legend-colors .activity-day:hover {
  transform: none;
  border: none;
}

/* 近期成果卡片 */
.recent-stats-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.achievement-item {
  border-radius: 8px;
  transition: all 0.3s ease;
  background: var(--theme-bg-container);
}

.achievement-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 暗色主题下的悬停效果 */
html.dark .achievement-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.achievement-today {
  border-left: 3px solid #52c41a;
}

.achievement-week {
  border-left: 3px solid #1890ff;
}

.achievement-month {
  border-left: 3px solid #722ed1;
}

.achievement-label {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.achievement-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--theme-text);
}

.achievement-icon {
  font-size: 20px;
  color: var(--theme-text-secondary);
}

/* 写作目标卡片 */
.goals-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.goal-item {
  margin-bottom: 16px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.goal-label {
  font-size: 14px;
  color: var(--theme-text-secondary);
  font-weight: 500;
}

.goal-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

/* 整体进度卡片 */
.overall-progress-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 16px;
  color: var(--theme-text-secondary);
  font-weight: 500;
}

.progress-percentage {
  font-size: 24px;
  font-weight: bold;
  color: var(--theme-text);
}

.estimated-completion {
  display: flex;
  align-items: center;
  color: var(--theme-text-secondary);
  font-size: 14px;
}

.progress-circle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.circle-label {
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin-top: 16px;
  margin-bottom: 0;
}

/* 章节表格卡片 */
.chapter-table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chapter-table :deep(.ant-table-thead > tr > th) {
  background: var(--theme-bg-elevated);
  border-bottom: 2px solid var(--theme-border);
  font-weight: 600;
}

.chapter-table :deep(.ant-table-tbody > tr:hover > td) {
  background: var(--theme-bg-elevated);
}

/* 成就系统卡片 */
.achievement-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: var(--theme-bg-container);
}

.achievement-badge {
  text-align: center;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: var(--theme-bg-container);
}

.achievement-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 暗色主题下的悬停效果和阴影优化 */
html.dark .achievement-badge:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 暗色主题下的卡片阴影优化 */
html.dark .achievement-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

html.dark .achievement-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* 暗色模式下已获得成就的微妙发光效果 */
html.dark .achievement-earned {
  box-shadow: 0 0 10px rgba(250, 173, 20, 0.15);
}

html.dark .achievement-earned:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 15px rgba(250, 173, 20, 0.2);
}

.achievement-earned {
  border: 2px solid #faad14;
  background: var(--theme-bg-elevated);
  position: relative;
}

.achievement-earned::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(255, 251, 230, 0.05) 100%);
  border-radius: 6px;
  pointer-events: none;
}

.achievement-locked {
  border: 2px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.achievement-content {
  padding: 8px;
  position: relative;
  z-index: 1;
}

.achievement-icon-large {
  font-size: 32px;
  margin-bottom: 8px;
  filter: none;
  transition: filter 0.3s ease;
}

.achievement-locked .achievement-icon-large {
  filter: grayscale(100%) opacity(0.5);
}

.achievement-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text);
  margin-bottom: 4px;
}

.achievement-description {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-bottom: 12px;
  line-height: 1.4;
}

.achievement-status {
  margin-top: 8px;
}

.achievement-earned-tag {
  background: #faad14;
  border-color: #faad14;
  color: #ffffff;
  font-weight: 500;
}

.achievement-locked-tag {
  background: var(--theme-bg-elevated);
  border-color: var(--theme-border);
  color: var(--theme-text-secondary);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .days-grid {
    grid-template-columns: repeat(26, 10px); /* 半年显示 */
    gap: 1px;
  }

  .activity-day {
    width: 8px;
    height: 8px;
  }

  .month-label {
    width: 12px;
  }

  .writing-activity-chart {
    padding: 12px;
  }

  .progress-circle-container {
    margin-top: 24px;
  }
}

/* 工具类 */
.mb-4 {
  margin-bottom: 16px;
}

.mb-6 {
  margin-bottom: 24px;
}

.mt-6 {
  margin-top: 24px;
}

.ml-2 {
  margin-left: 8px;
}

/* 批量操作栏 */
.batch-actions {
  margin-top: 16px;
  padding: 16px;
  background: var(--theme-bg-elevated);
  border-radius: 8px;
}

/* 目标设置提示 */
.goal-hint {
  color: var(--theme-text-secondary);
  font-size: 12px;
  margin-top: 4px;
}

/* 表格增强 */
.chapter-table :deep(.ant-table-selection-column) {
  width: 48px;
}

.chapter-table :deep(.ant-table-row-selected) {
  background-color: rgba(24, 144, 255, 0.1);
}

.chapter-table :deep(.ant-btn-link[disabled]) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 统计卡片增强效果 */
.metric-card :deep(.ant-statistic-content) {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-card :deep(.ant-statistic-content-value) {
  font-weight: 700;
}

/* 加载状态优化 */
.chapter-table :deep(.ant-spin-nested-loading) {
  min-height: 200px;
}

/* 状态标签优化 */
.chapter-table :deep(.ant-tag) {
  margin: 0;
  border-radius: 12px;
  font-weight: 500;
  font-size: 11px;
}

/* 进度条优化 */
.chapter-table :deep(.ant-progress-inner) {
  background-color: var(--theme-bg-elevated);
}

.chapter-table :deep(.ant-progress-bg) {
  border-radius: 3px;
}
</style>
