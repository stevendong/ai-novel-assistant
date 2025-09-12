<template>
  <div class="outline-preview" :class="{ 'preview-mode': mode === 'preview' }">
    <!-- 大纲概览 -->
    <div class="outline-header">
      <h3 class="outline-title">{{ outlineData.title || '小说大纲' }}</h3>
      <div class="outline-meta">
        <a-tag color="blue">{{ outlineData.chapters?.length || 0 }} 章节</a-tag>
        <a-tag color="green">预估 {{ totalWords }} 字</a-tag>
        <span class="creation-time">{{ formatTime(new Date()) }}</span>
      </div>
    </div>

    <!-- 故事概要 -->
    <a-card class="summary-card" size="small">
      <template #title>
        <BookOutlined /> 故事概要
      </template>
      <div class="summary-content">
        <p class="main-summary">{{ outlineData.summary }}</p>

        <a-row :gutter="16" class="story-details">
          <a-col :span="12">
            <div class="detail-item">
              <strong>主要冲突:</strong>
              <span>{{ outlineData.mainConflict }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="detail-item">
              <strong>故事主线:</strong>
              <span>{{ outlineData.mainPlot }}</span>
            </div>
          </a-col>
        </a-row>

        <div v-if="outlineData.themes && outlineData.themes.length > 0" class="themes">
          <strong>主要主题:</strong>
          <a-tag
            v-for="theme in outlineData.themes"
            :key="theme"
            color="purple"
            class="theme-tag"
          >
            {{ theme }}
          </a-tag>
        </div>
      </div>
    </a-card>

    <!-- 章节详情 -->
    <a-card class="chapters-card">
      <template #title>
        <UnorderedListOutlined /> 章节结构
      </template>

      <div class="chapters-preview">
        <div
          v-for="(chapter, index) in outlineData.chapters"
          :key="index"
          class="chapter-preview-item"
        >
          <div class="chapter-header">
            <div class="chapter-indicator">
              <div class="chapter-number">{{ index + 1 }}</div>
              <div class="chapter-line"></div>
            </div>

            <div class="chapter-info">
              <h4 class="chapter-title">{{ chapter.title }}</h4>
              <div class="chapter-meta">
                <a-tag
                  size="small"
                  :color="getChapterTypeColor(chapter.type)"
                >
                  {{ chapter.type }}
                </a-tag>
                <span class="word-count">~{{ chapter.estimatedWords }}字</span>
                <span v-if="chapter.emotionalTone" class="emotional-tone">
                  {{ chapter.emotionalTone }}
                </span>
              </div>
            </div>
          </div>

          <div class="chapter-content">
            <div class="chapter-summary">
              {{ chapter.summary }}
            </div>

            <!-- 情节要点 -->
            <div v-if="chapter.plotPoints && chapter.plotPoints.length > 0" class="plot-points">
              <div class="plot-points-title">情节要点:</div>
              <div class="plot-points-list">
                <div
                  v-for="(point, pointIndex) in chapter.plotPoints"
                  :key="pointIndex"
                  class="plot-point"
                >
                  <span class="point-type">{{ point.type }}</span>
                  <span class="point-desc">{{ point.description }}</span>
                </div>
              </div>
            </div>

            <!-- 关键信息 -->
            <div class="chapter-elements">
              <div v-if="chapter.characters && chapter.characters.length > 0" class="element-group">
                <UserOutlined class="element-icon" />
                <span class="element-label">角色:</span>
                <a-tag
                  v-for="char in chapter.characters"
                  :key="char"
                  size="small"
                  class="element-tag"
                >
                  {{ char }}
                </a-tag>
              </div>

              <div v-if="chapter.settings && chapter.settings.length > 0" class="element-group">
                <EnvironmentOutlined class="element-icon" />
                <span class="element-label">设定:</span>
                <a-tag
                  v-for="setting in chapter.settings"
                  :key="setting"
                  size="small"
                  color="green"
                  class="element-tag"
                >
                  {{ setting }}
                </a-tag>
              </div>

              <div v-if="chapter.conflicts && chapter.conflicts.length > 0" class="element-group">
                <ExclamationCircleOutlined class="element-icon" />
                <span class="element-label">冲突:</span>
                <a-tag
                  v-for="conflict in chapter.conflicts"
                  :key="conflict"
                  size="small"
                  color="orange"
                  class="element-tag"
                >
                  {{ conflict }}
                </a-tag>
              </div>

              <div v-if="chapter.keyEvents && chapter.keyEvents.length > 0" class="element-group">
                <StarOutlined class="element-icon" />
                <span class="element-label">关键事件:</span>
                <div class="key-events">
                  <div
                    v-for="event in chapter.keyEvents"
                    :key="event"
                    class="key-event"
                  >
                    {{ event }}
                  </div>
                </div>
              </div>

              <div v-if="chapter.chapterGoals && chapter.chapterGoals.length > 0" class="element-group">
                <AimOutlined class="element-icon" />
                <span class="element-label">章节目标:</span>
                <div class="chapter-goals">
                  <div
                    v-for="goal in chapter.chapterGoals"
                    :key="goal"
                    class="chapter-goal"
                  >
                    {{ goal }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 统计信息 -->
    <a-card class="stats-card" size="small">
      <template #title>
        <BarChartOutlined /> 大纲统计
      </template>

      <div class="stats-content">
        <a-row :gutter="16"}>
          <a-col :span="6">
            <a-statistic
              title="总章节数"
              :value="outlineData.chapters?.length || 0"
              suffix="章"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="预估字数"
              :value="totalWords"
              suffix="字"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="平均章节长度"
              :value="averageChapterWords"
              suffix="字"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="预估阅读时长"
              :value="estimatedReadTime"
              suffix="分钟"
            />
          </a-col>
        </a-row>

        <div class="chapter-type-distribution">
          <h5>章节类型分布</h5>
          <div class="type-stats">
            <div
              v-for="(count, type) in chapterTypeStats"
              :key="type"
              class="type-stat-item"
            >
              <a-tag :color="getChapterTypeColor(type)">{{ type }}</a-tag>
              <span class="count">{{ count }}章</span>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 预览模式下的操作栏 -->
    <div v-if="mode === 'preview'" class="preview-actions">
      <a-button-group>
        <a-button @click="$emit('edit')">
          <template #icon><EditOutlined /></template>
          编辑大纲
        </a-button>
        <a-button @click="exportOutline">
          <template #icon><DownloadOutlined /></template>
          导出大纲
        </a-button>
        <a-button type="primary" @click="$emit('apply')">
          <template #icon><CheckOutlined /></template>
          应用大纲
        </a-button>
      </a-button-group>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  BookOutlined,
  UnorderedListOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  StarOutlined,
  AimOutlined,
  BarChartOutlined,
  EditOutlined,
  DownloadOutlined,
  CheckOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  outlineData: {
    type: Object,
    required: true,
    default: () => ({
      summary: '',
      mainConflict: '',
      mainPlot: '',
      themes: [],
      chapters: []
    })
  },
  mode: {
    type: String,
    default: 'display', // display | preview
    validator: (value) => ['display', 'preview'].includes(value)
  }
})

const emit = defineEmits(['edit', 'apply', 'export'])

// 计算属性
const totalWords = computed(() => {
  if (!props.outlineData.chapters) return 0
  return props.outlineData.chapters.reduce((total, chapter) => {
    return total + (chapter.estimatedWords || 0)
  }, 0)
})

const averageChapterWords = computed(() => {
  const chapters = props.outlineData.chapters || []
  if (chapters.length === 0) return 0
  return Math.round(totalWords.value / chapters.length)
})

const estimatedReadTime = computed(() => {
  // 假设阅读速度为每分钟300字
  return Math.round(totalWords.value / 300)
})

const chapterTypeStats = computed(() => {
  const chapters = props.outlineData.chapters || []
  const stats = {}

  chapters.forEach(chapter => {
    const type = chapter.type || '发展'
    stats[type] = (stats[type] || 0) + 1
  })

  return stats
})

// 方法
const getChapterTypeColor = (type) => {
  const colors = {
    '开篇': 'green',
    '发展': 'blue',
    '过渡': 'orange',
    '高潮': 'red',
    '结局': 'purple'
  }
  return colors[type] || 'default'
}

const formatTime = (date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const exportOutline = () => {
  const content = generateOutlineText()
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `大纲预览_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const generateOutlineText = () => {
  const data = props.outlineData
  let text = `${data.title || '小说大纲'}\n`
  text += `生成时间: ${formatTime(new Date())}\n\n`

  text += `故事概要:\n${data.summary}\n\n`
  text += `主要冲突: ${data.mainConflict}\n`
  text += `故事主线: ${data.mainPlot}\n\n`

  if (data.themes && data.themes.length > 0) {
    text += `主要主题: ${data.themes.join(', ')}\n\n`
  }

  text += `章节详情:\n`

  data.chapters?.forEach((chapter, index) => {
    text += `\n第${index + 1}章: ${chapter.title}\n`
    text += `类型: ${chapter.type}\n`
    text += `概述: ${chapter.summary}\n`
    text += `预估字数: ${chapter.estimatedWords}字\n`

    if (chapter.plotPoints && chapter.plotPoints.length > 0) {
      text += `情节要点:\n`
      chapter.plotPoints.forEach(point => {
        text += `- ${point.type}: ${point.description}\n`
      })
    }

    if (chapter.characters && chapter.characters.length > 0) {
      text += `涉及角色: ${chapter.characters.join(', ')}\n`
    }

    if (chapter.keyEvents && chapter.keyEvents.length > 0) {
      text += `关键事件: ${chapter.keyEvents.join(', ')}\n`
    }
  })

  text += `\n统计信息:\n`
  text += `总章节数: ${data.chapters?.length || 0}章\n`
  text += `预估总字数: ${totalWords.value}字\n`
  text += `平均章节长度: ${averageChapterWords.value}字\n`
  text += `预估阅读时长: ${estimatedReadTime.value}分钟\n`

  return text
}
</script>

<style scoped>
.outline-preview {
  max-width: 900px;
  margin: 0 auto;
}

.preview-mode {
  max-width: 100%;
  margin: 0;
}

.outline-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.outline-title {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 12px;
}

.outline-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

.creation-time {
  color: #999;
}

.summary-card,
.chapters-card,
.stats-card {
  margin-bottom: 24px;
}

.summary-content {
  line-height: 1.6;
}

.main-summary {
  background: #f8f9ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  line-height: 1.7;
}

.story-details {
  margin-bottom: 16px;
}

.detail-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item strong {
  color: #1890ff;
  display: inline-block;
  width: 80px;
  font-size: 13px;
}

.themes {
  padding-top: 8px;
}

.themes strong {
  color: #722ed1;
  margin-right: 8px;
}

.theme-tag {
  margin-right: 8px;
}

.chapters-preview {
  position: relative;
}

.chapter-preview-item {
  position: relative;
  margin-bottom: 32px;
  padding-left: 60px;
}

.chapter-preview-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 20px;
  top: 60px;
  bottom: -16px;
  width: 2px;
  background: linear-gradient(to bottom, #1890ff, #f0f0f0);
}

.chapter-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.chapter-indicator {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chapter-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.chapter-info {
  flex: 1;
}

.chapter-title {
  font-size: 18px;
  color: #262626;
  margin-bottom: 8px;
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.word-count {
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.emotional-tone {
  color: #722ed1;
  font-style: italic;
}

.chapter-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 12px;
  margin-left: -60px;
  padding-left: 80px;
}

.chapter-summary {
  font-size: 14px;
  line-height: 1.6;
  color: #595959;
  margin-bottom: 16px;
}

.plot-points {
  margin-bottom: 16px;
}

.plot-points-title {
  font-weight: 500;
  color: #1890ff;
  margin-bottom: 8px;
  font-size: 13px;
}

.plot-points-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plot-point {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
}

.point-type {
  background: #1890ff;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 8px;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.point-desc {
  line-height: 1.4;
}

.chapter-elements {
  border-top: 1px solid #e8e8e8;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.element-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.element-icon {
  color: #1890ff;
  margin-top: 2px;
}

.element-label {
  font-weight: 500;
  min-width: 50px;
  color: #595959;
}

.element-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.key-events,
.chapter-goals {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-event,
.chapter-goal {
  background: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  border-left: 3px solid #1890ff;
  font-size: 12px;
  line-height: 1.4;
}

.stats-content {
  padding-top: 8px;
}

.chapter-type-distribution {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.chapter-type-distribution h5 {
  margin-bottom: 12px;
  color: #262626;
}

.type-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.type-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 6px;
}

.count {
  font-weight: 500;
  color: #262626;
}

.preview-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #f0f0f0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chapter-preview-item {
    padding-left: 50px;
  }

  .chapter-content {
    margin-left: -50px;
    padding-left: 70px;
  }

  .story-details .ant-col {
    margin-bottom: 12px;
  }
}
</style>
