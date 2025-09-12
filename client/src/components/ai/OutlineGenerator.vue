<template>
  <div class="outline-generator">
    <!-- 大纲生成触发区域 -->
    <div v-if="!showResult" class="generator-input">
      <div class="input-header">
        <h3 class="section-title">
          <BulbOutlined />
          AI大纲生成器
        </h3>
        <p class="section-desc">描述您的想法，AI将帮您生成详细的章节大纲</p>
      </div>

      <div class="input-form">
        <a-form layout="vertical" :model="formData">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="生成类型" name="type">
                <a-select v-model:value="formData.type" @change="onTypeChange">
                  <a-select-option value="full">完整大纲</a-select-option>
                  <a-select-option value="chapter">单章节大纲</a-select-option>
                  <a-select-option value="arc">故事弧大纲</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            
            <a-col :span="12">
              <a-form-item label="大纲长度" name="length">
                <a-select v-model:value="formData.length">
                  <a-select-option value="brief">简要版 (3-5章)</a-select-option>
                  <a-select-option value="standard">标准版 (8-12章)</a-select-option>
                  <a-select-option value="detailed">详细版 (15-20章)</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="核心想法" name="coreIdea">
            <a-textarea
              v-model:value="formData.coreIdea"
              placeholder="简要描述您的故事核心想法、主要冲突或想要表达的主题..."
              :rows="3"
              :maxlength="500"
              show-count
            />
          </a-form-item>

          <a-form-item label="详细描述" name="description">
            <a-textarea
              v-model:value="formData.description"
              placeholder="详细描述背景设定、主要角色、情节走向等。提供的信息越详细，生成的大纲质量越高..."
              :rows="6"
              :maxlength="2000"
              show-count
            />
          </a-form-item>

          <div class="context-options">
            <a-form-item label="参考设定">
              <div class="reference-chips">
                <a-checkbox-group v-model:value="formData.useCharacters">
                  <a-checkbox 
                    v-for="char in availableCharacters" 
                    :key="char.id" 
                    :value="char.id"
                  >
                    {{ char.name }}
                  </a-checkbox>
                </a-checkbox-group>
                <div v-if="availableCharacters.length === 0" class="no-data">
                  <small>暂无可用角色</small>
                </div>
              </div>
            </a-form-item>

            <a-form-item label="参考世界设定">
              <div class="reference-chips">
                <a-checkbox-group v-model:value="formData.useSettings">
                  <a-checkbox 
                    v-for="setting in availableSettings" 
                    :key="setting.id" 
                    :value="setting.id"
                  >
                    {{ setting.name }}
                  </a-checkbox>
                </a-checkbox-group>
                <div v-if="availableSettings.length === 0" class="no-data">
                  <small>暂无可用设定</small>
                </div>
              </div>
            </a-form-item>
          </div>

          <div class="advanced-options">
            <a-collapse>
              <a-collapse-panel key="advanced" header="高级选项">
                <a-row :gutter="16">
                  <a-col :span="8">
                    <a-form-item label="创作风格">
                      <a-select v-model:value="formData.style">
                        <a-select-option value="traditional">传统章回</a-select-option>
                        <a-select-option value="modern">现代小说</a-select-option>
                        <a-select-option value="episodic">分集剧情</a-select-option>
                        <a-select-option value="cinematic">电影式</a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  
                  <a-col :span="8">
                    <a-form-item label="节奏控制">
                      <a-select v-model:value="formData.pacing">
                        <a-select-option value="fast">快节奏</a-select-option>
                        <a-select-option value="medium">中等节奏</a-select-option>
                        <a-select-option value="slow">慢节奏</a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  
                  <a-col :span="8">
                    <a-form-item label="冲突强度">
                      <a-select v-model:value="formData.conflict">
                        <a-select-option value="low">低强度</a-select-option>
                        <a-select-option value="medium">中强度</a-select-option>
                        <a-select-option value="high">高强度</a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-collapse-panel>
            </a-collapse>
          </div>

          <div class="action-buttons">
            <a-button 
              type="primary" 
              size="large"
              :loading="generating"
              :disabled="!canGenerate"
              @click="generateOutline"
              block
            >
              <template #icon>
                <SendOutlined />
              </template>
              {{ generating ? '正在生成大纲...' : '生成大纲' }}
            </a-button>
          </div>
        </a-form>
      </div>
    </div>

    <!-- 生成结果展示 -->
    <div v-else class="generator-result">
      <div class="result-header">
        <div class="header-left">
          <h3 class="result-title">
            <CheckCircleOutlined class="success-icon" />
            大纲生成完成
          </h3>
          <div class="generation-info">
            <a-tag color="blue">{{ getTypeText(formData.type) }}</a-tag>
            <a-tag color="green">{{ getLengthText(formData.length) }}</a-tag>
            <span class="generation-time">生成时间: {{ formatTime(generationTime) }}</span>
          </div>
        </div>
        <div class="header-actions">
          <a-button size="small" @click="regenerateOutline" :loading="regenerating">
            <template #icon><ReloadOutlined /></template>
            重新生成
          </a-button>
          <a-button size="small" @click="resetGenerator">
            <template #icon><EditOutlined /></template>
            修改需求
          </a-button>
        </div>
      </div>

      <!-- 大纲内容预览 -->
      <div class="outline-preview">
        <div class="preview-header">
          <div class="view-controls">
            <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
              <a-radio-button value="card">卡片视图</a-radio-button>
              <a-radio-button value="list">列表视图</a-radio-button>
              <a-radio-button value="timeline">时间线</a-radio-button>
            </a-radio-group>
          </div>
          <div class="outline-stats">
            <span class="stat-item">
              <FileTextOutlined />
              {{ outlineData.chapters?.length || 0 }} 章节
            </span>
            <span class="stat-item">
              <ClockCircleOutlined />
              预估 {{ estimatedWords }} 字
            </span>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="card-view">
          <div class="outline-summary">
            <h4>故事概览</h4>
            <p class="summary-text">{{ outlineData.summary }}</p>
            <div class="story-elements">
              <div class="element-item">
                <strong>主要冲突:</strong> {{ outlineData.mainConflict }}
              </div>
              <div class="element-item">
                <strong>故事主线:</strong> {{ outlineData.mainPlot }}
              </div>
            </div>
          </div>

          <div class="chapters-grid">
            <div 
              v-for="(chapter, index) in outlineData.chapters" 
              :key="index"
              class="chapter-card"
              :class="{ 'selected': selectedChapter === index }"
              @click="selectChapter(index)"
            >
              <div class="card-header">
                <h5 class="chapter-title">{{ chapter.title }}</h5>
                <div class="chapter-meta">
                  <a-tag size="small" :color="getChapterTypeColor(chapter.type)">
                    {{ chapter.type }}
                  </a-tag>
                  <span class="word-count">~{{ chapter.estimatedWords }}字</span>
                </div>
              </div>
              
              <div class="card-content">
                <p class="chapter-summary">{{ chapter.summary }}</p>
                <div class="plot-points">
                  <div 
                    v-for="point in chapter.plotPoints" 
                    :key="point.id"
                    class="plot-point"
                  >
                    <span class="point-type">{{ point.type }}:</span>
                    <span class="point-desc">{{ point.description }}</span>
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <div class="chapter-elements">
                  <a-tooltip title="涉及角色">
                    <a-tag 
                      v-for="char in chapter.characters" 
                      :key="char"
                      size="small"
                      color="blue"
                    >
                      {{ char }}
                    </a-tag>
                  </a-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else-if="viewMode === 'list'" class="list-view">
          <a-table
            :columns="listColumns"
            :data-source="outlineData.chapters"
            :pagination="false"
            size="middle"
            :scroll="{ x: 800 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'title'">
                <div class="title-cell">
                  <strong>{{ record.title }}</strong>
                  <div class="chapter-number">第{{ index + 1 }}章</div>
                </div>
              </template>
              
              <template v-else-if="column.key === 'type'">
                <a-tag :color="getChapterTypeColor(record.type)">
                  {{ record.type }}
                </a-tag>
              </template>
              
              <template v-else-if="column.key === 'summary'">
                <div class="summary-cell">
                  {{ record.summary }}
                </div>
              </template>
              
              <template v-else-if="column.key === 'elements'">
                <div class="elements-cell">
                  <div class="characters">
                    <UserOutlined />
                    <span>{{ record.characters?.join(', ') || '无' }}</span>
                  </div>
                  <div class="settings">
                    <EnvironmentOutlined />
                    <span>{{ record.settings?.join(', ') || '无' }}</span>
                  </div>
                </div>
              </template>
              
              <template v-else-if="column.key === 'words'">
                <span class="word-count">~{{ record.estimatedWords }}字</span>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 时间线视图 -->
        <div v-else-if="viewMode === 'timeline'" class="timeline-view">
          <a-timeline mode="left">
            <a-timeline-item
              v-for="(chapter, index) in outlineData.chapters"
              :key="index"
              :color="getTimelineColor(chapter.type)"
            >
              <template #label>
                <div class="timeline-label">
                  <div class="chapter-number">第{{ index + 1 }}章</div>
                  <div class="chapter-type">{{ chapter.type }}</div>
                </div>
              </template>
              
              <div class="timeline-content">
                <h5 class="timeline-title">{{ chapter.title }}</h5>
                <p class="timeline-summary">{{ chapter.summary }}</p>
                <div class="timeline-details">
                  <div class="plot-points">
                    <div 
                      v-for="point in chapter.plotPoints" 
                      :key="point.id"
                      class="plot-point"
                    >
                      <span class="point-badge">{{ point.type }}</span>
                      <span class="point-text">{{ point.description }}</span>
                    </div>
                  </div>
                  <div class="chapter-meta">
                    <span class="word-estimate">预估{{ chapter.estimatedWords }}字</span>
                    <div class="involved-elements">
                      <a-tag 
                        v-for="char in chapter.characters" 
                        :key="char"
                        size="small"
                      >
                        {{ char }}
                      </a-tag>
                    </div>
                  </div>
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </div>
      </div>

      <!-- 操作面板 -->
      <div class="action-panel">
        <div class="panel-header">
          <h4>接下来要做什么？</h4>
          <p>选择您希望如何使用这个大纲</p>
        </div>

        <div class="action-options">
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="action-card" @click="applyOutlineDirectly">
                <div class="action-icon">
                  <CheckCircleOutlined />
                </div>
                <h5>直接应用</h5>
                <p>将大纲直接创建为章节，开始写作</p>
                <a-button type="primary" size="small">立即应用</a-button>
              </div>
            </a-col>
            
            <a-col :span="8">
              <div class="action-card" @click="editOutline">
                <div class="action-icon">
                  <EditOutlined />
                </div>
                <h5>编辑调整</h5>
                <p>对大纲进行修改和完善后再使用</p>
                <a-button size="small">进入编辑</a-button>
              </div>
            </a-col>
            
            <a-col :span="8">
              <div class="action-card" @click="saveAsDraft">
                <div class="action-icon">
                  <SaveOutlined />
                </div>
                <h5>保存草稿</h5>
                <p>保存为草稿，稍后决定如何使用</p>
                <a-button size="small">保存草稿</a-button>
              </div>
            </a-col>
          </a-row>
        </div>

        <div class="panel-footer">
          <a-button @click="downloadOutline">
            <template #icon><DownloadOutlined /></template>
            导出大纲
          </a-button>
          <a-button @click="shareOutline">
            <template #icon><ShareAltOutlined /></template>
            分享链接
          </a-button>
          <a-button type="text" danger @click="discardOutline">
            <template #icon><DeleteOutlined /></template>
            放弃大纲
          </a-button>
        </div>
      </div>
    </div>

    <!-- 编辑大纲模态框 -->
    <a-modal
      v-model:visible="editModalVisible"
      title="编辑大纲"
      width="1200px"
      :footer="null"
      class="outline-edit-modal"
    >
      <outline-editor
        v-if="editModalVisible"
        :outline-data="outlineData"
        @save="handleOutlineEdit"
        @cancel="editModalVisible = false"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  BulbOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  SaveOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { useProjectStore } from '@/stores/project'
import { aiService } from '@/services/aiService'
import OutlineEditor from './OutlineEditor.vue'

const props = defineProps({
  novelId: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['outline-applied', 'close'])

const projectStore = useProjectStore()

// 状态管理
const showResult = ref(false)
const generating = ref(false)
const regenerating = ref(false)
const generationTime = ref(null)
const viewMode = ref('card')
const selectedChapter = ref(-1)
const editModalVisible = ref(false)

// 表单数据
const formData = ref({
  type: 'full',
  length: 'standard',
  coreIdea: '',
  description: '',
  useCharacters: [],
  useSettings: [],
  style: 'modern',
  pacing: 'medium',
  conflict: 'medium'
})

// 大纲数据
const outlineData = ref({
  summary: '',
  mainConflict: '',
  mainPlot: '',
  chapters: []
})

// 可用的角色和设定
const availableCharacters = ref([])
const availableSettings = ref([])

// 表格列定义
const listColumns = [
  { title: '章节', key: 'title', width: 200 },
  { title: '类型', key: 'type', width: 100 },
  { title: '概述', key: 'summary', ellipsis: true },
  { title: '相关元素', key: 'elements', width: 200 },
  { title: '字数', key: 'words', width: 100 }
]

// 计算属性
const canGenerate = computed(() => {
  return formData.value.coreIdea.trim().length > 10
})

const estimatedWords = computed(() => {
  if (!outlineData.value.chapters) return 0
  return outlineData.value.chapters.reduce((total, chapter) => {
    return total + (chapter.estimatedWords || 0)
  }, 0)
})

// 方法
const onTypeChange = (value) => {
  if (value === 'chapter') {
    formData.value.length = 'brief'
  }
}

const generateOutline = async () => {
  generating.value = true
  const startTime = Date.now()
  
  try {
    // 构建生成请求
    const request = {
      novelId: props.novelId,
      type: formData.value.type,
      length: formData.value.length,
      coreIdea: formData.value.coreIdea,
      description: formData.value.description,
      characters: availableCharacters.value.filter(c => 
        formData.value.useCharacters.includes(c.id)
      ),
      settings: availableSettings.value.filter(s => 
        formData.value.useSettings.includes(s.id)
      ),
      style: formData.value.style,
      pacing: formData.value.pacing,
      conflict: formData.value.conflict
    }

    const result = await aiService.generateOutline(request)
    
    outlineData.value = result
    generationTime.value = Date.now() - startTime
    showResult.value = true
    
    message.success('大纲生成完成！')
  } catch (error) {
    console.error('大纲生成失败:', error)
    message.error('大纲生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

const regenerateOutline = async () => {
  regenerating.value = true
  try {
    await generateOutline()
  } finally {
    regenerating.value = false
  }
}

const resetGenerator = () => {
  showResult.value = false
  selectedChapter.value = -1
}

const selectChapter = (index) => {
  selectedChapter.value = selectedChapter.value === index ? -1 : index
}

const applyOutlineDirectly = async () => {
  try {
    await aiService.applyOutline(props.novelId, outlineData.value)
    message.success('大纲已应用，章节创建完成！')
    emit('outline-applied', outlineData.value)
  } catch (error) {
    console.error('应用大纲失败:', error)
    message.error('应用大纲失败，请稍后重试')
  }
}

const editOutline = () => {
  editModalVisible.value = true
}

const saveAsDraft = async () => {
  try {
    await aiService.saveOutlineDraft(props.novelId, outlineData.value)
    message.success('大纲已保存为草稿')
  } catch (error) {
    console.error('保存草稿失败:', error)
    message.error('保存失败，请稍后重试')
  }
}

const downloadOutline = () => {
  const content = generateOutlineText()
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `小说大纲_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const shareOutline = async () => {
  try {
    const shareUrl = await aiService.createShareableOutline(outlineData.value)
    await navigator.clipboard.writeText(shareUrl)
    message.success('分享链接已复制到剪贴板')
  } catch (error) {
    message.error('创建分享链接失败')
  }
}

const discardOutline = () => {
  showResult.value = false
  outlineData.value = { summary: '', mainConflict: '', mainPlot: '', chapters: [] }
}

const handleOutlineEdit = (editedOutline) => {
  outlineData.value = editedOutline
  editModalVisible.value = false
  message.success('大纲修改已保存')
}

// 辅助方法
const getTypeText = (type) => {
  const texts = {
    full: '完整大纲',
    chapter: '单章节大纲',
    arc: '故事弧大纲'
  }
  return texts[type] || type
}

const getLengthText = (length) => {
  const texts = {
    brief: '简要版',
    standard: '标准版',
    detailed: '详细版'
  }
  return texts[length] || length
}

const formatTime = (ms) => {
  if (!ms) return ''
  const seconds = Math.round(ms / 1000)
  return `${seconds}秒`
}

const getChapterTypeColor = (type) => {
  const colors = {
    '开篇': 'green',
    '发展': 'blue',
    '高潮': 'red',
    '结局': 'purple',
    '过渡': 'orange'
  }
  return colors[type] || 'default'
}

const getTimelineColor = (type) => {
  const colors = {
    '开篇': '#52c41a',
    '发展': '#1890ff',
    '高潮': '#f5222d',
    '结局': '#722ed1',
    '过渡': '#fa8c16'
  }
  return colors[type] || '#d9d9d9'
}

const generateOutlineText = () => {
  let text = `小说大纲\n`
  text += `生成时间: ${new Date().toLocaleString()}\n\n`
  text += `故事概览:\n${outlineData.value.summary}\n\n`
  text += `主要冲突: ${outlineData.value.mainConflict}\n\n`
  text += `故事主线: ${outlineData.value.mainPlot}\n\n`
  text += `章节详情:\n`
  
  outlineData.value.chapters.forEach((chapter, index) => {
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
  })
  
  return text
}

// 加载数据
const loadAvailableData = async () => {
  try {
    const [characters, settings] = await Promise.all([
      aiService.getCharacters(props.novelId),
      aiService.getWorldSettings(props.novelId)
    ])
    availableCharacters.value = characters
    availableSettings.value = settings
  } catch (error) {
    console.error('加载可用数据失败:', error)
  }
}

onMounted(() => {
  if (props.novelId) {
    loadAvailableData()
  }
})
</script>

<style scoped>
.outline-generator {
  min-height: 600px;
}

.generator-input {
  max-width: 800px;
  margin: 0 auto;
}

.input-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 24px;
  color: #1890ff;
  margin-bottom: 8px;
}

.section-desc {
  color: var(--theme-text-secondary);
  font-size: 14px;
}

.input-form {
  background: var(--theme-bg-container);
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reference-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.no-data {
  color: var(--theme-text-secondary);
  font-style: italic;
}

.advanced-options {
  margin-top: 24px;
}

.action-buttons {
  margin-top: 32px;
}

.generator-result {
  max-width: 1200px;
  margin: 0 auto;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background: var(--theme-bg-container);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  margin-bottom: 8px;
}

.success-icon {
  color: #52c41a;
}

.generation-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.outline-preview {
  background: var(--theme-bg-container);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--theme-border);
}

.outline-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-view {
  padding: 24px;
}

.outline-summary {
  background: var(--theme-bg-elevated);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.summary-text {
  margin: 12px 0;
  line-height: 1.6;
}

.story-elements {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.element-item {
  font-size: 14px;
  line-height: 1.5;
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 16px;
}

.chapter-card {
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.chapter-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.chapter-card.selected {
  border-color: #1890ff;
  background: var(--theme-bg-elevated);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.chapter-title {
  font-size: 16px;
  margin: 0;
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.chapter-summary {
  color: var(--theme-text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.plot-points {
  margin-bottom: 12px;
}

.plot-point {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.point-type {
  color: #1890ff;
  font-weight: 500;
}

.point-desc {
  margin-left: 4px;
}

.chapter-elements {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.list-view {
  padding: 0 24px 24px;
}

.title-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chapter-number {
  color: var(--theme-text-secondary);
  font-size: 12px;
}

.summary-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elements-cell {
  font-size: 12px;
}

.elements-cell > div {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.timeline-view {
  padding: 24px;
}

.timeline-label {
  text-align: center;
  font-size: 12px;
}

.chapter-number {
  font-weight: 600;
  color: #1890ff;
}

.chapter-type {
  color: var(--theme-text-secondary);
  margin-top: 2px;
}

.timeline-content {
  background: var(--theme-bg-elevated);
  padding: 16px;
  border-radius: 8px;
}

.timeline-title {
  font-size: 16px;
  margin-bottom: 8px;
}

.timeline-summary {
  color: var(--theme-text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.timeline-details {
  border-top: 1px solid var(--theme-border);
  padding-top: 12px;
}

.point-badge {
  background: #1890ff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 6px;
}

.chapter-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.involved-elements {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-panel {
  background: var(--theme-bg-container);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.panel-header {
  text-align: center;
  margin-bottom: 32px;
}

.panel-header h4 {
  font-size: 18px;
  margin-bottom: 8px;
}

.panel-header p {
  color: var(--theme-text-secondary);
  font-size: 14px;
}

.action-options {
  margin-bottom: 32px;
}

.action-card {
  text-align: center;
  padding: 24px 16px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  height: 100%;
}

.action-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.action-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 12px;
}

.action-card h5 {
  font-size: 16px;
  margin-bottom: 8px;
}

.action-card p {
  color: var(--theme-text-secondary);
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.4;
}

.panel-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--theme-border);
}
</style>