<template>
  <div class="outline-editor">
    <div class="editor-header">
      <h4>编辑大纲内容</h4>
      <p>您可以修改任何内容，调整情节结构和细节描述</p>
    </div>

    <div class="editor-content">
      <!-- 基本信息编辑 -->
      <a-card title="基本信息" class="info-card">
        <a-form layout="vertical">
          <a-form-item label="故事概览">
            <a-textarea
              v-model:value="editableOutline.summary"
              :rows="3"
              placeholder="总结故事的核心内容和主要走向..."
              :maxlength="500"
              show-count
            />
          </a-form-item>
          
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="主要冲突">
                <a-input
                  v-model:value="editableOutline.mainConflict"
                  placeholder="描述故事的主要冲突点..."
                  :maxlength="200"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="故事主线">
                <a-input
                  v-model:value="editableOutline.mainPlot"
                  placeholder="概括故事的主要情节线..."
                  :maxlength="200"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-card>

      <!-- 章节编辑 -->
      <a-card title="章节结构" class="chapters-card">
        <div class="chapters-header">
          <div class="header-info">
            <span class="chapter-count">共 {{ editableOutline.chapters.length }} 个章节</span>
            <span class="word-estimate">预估总字数: {{ totalWords }}字</span>
          </div>
          <div class="header-actions">
            <a-button size="small" @click="addChapter">
              <template #icon><PlusOutlined /></template>
              添加章节
            </a-button>
            <a-button size="small" @click="autoReorder">
              <template #icon><SortAscendingOutlined /></template>
              重新排序
            </a-button>
          </div>
        </div>

        <div class="chapters-list">
          <draggable
            v-model="editableOutline.chapters"
            item-key="id"
            handle=".drag-handle"
            @change="handleChapterReorder"
          >
            <template #item="{ element: chapter, index }">
              <div class="chapter-editor-item">
                <div class="chapter-header">
                  <div class="chapter-info">
                    <div class="drag-handle">
                      <HolderOutlined />
                    </div>
                    <div class="chapter-number">第{{ index + 1 }}章</div>
                    <a-input
                      v-model:value="chapter.title"
                      placeholder="章节标题"
                      class="chapter-title-input"
                      :maxlength="50"
                    />
                    <a-select
                      v-model:value="chapter.type"
                      class="chapter-type-select"
                      size="small"
                    >
                      <a-select-option value="开篇">开篇</a-select-option>
                      <a-select-option value="发展">发展</a-select-option>
                      <a-select-option value="高潮">高潮</a-select-option>
                      <a-select-option value="结局">结局</a-select-option>
                      <a-select-option value="过渡">过渡</a-select-option>
                    </a-select>
                  </div>
                  <div class="chapter-actions">
                    <a-button
                      type="text"
                      size="small"
                      @click="toggleChapterExpand(index)"
                    >
                      <template #icon>
                        <DownOutlined v-if="!chapter.expanded" />
                        <UpOutlined v-else />
                      </template>
                    </a-button>
                    <a-popconfirm
                      title="确定要删除这个章节吗？"
                      @confirm="deleteChapter(index)"
                    >
                      <a-button type="text" size="small" danger>
                        <template #icon><DeleteOutlined /></template>
                      </a-button>
                    </a-popconfirm>
                  </div>
                </div>

                <div v-show="chapter.expanded" class="chapter-content">
                  <a-form layout="vertical">
                    <a-form-item label="章节概述">
                      <a-textarea
                        v-model:value="chapter.summary"
                        :rows="3"
                        placeholder="描述这一章的主要内容和情节发展..."
                        :maxlength="300"
                        show-count
                      />
                    </a-form-item>

                    <a-row :gutter="16">
                      <a-col :span="18">
                        <a-form-item label="情节要点">
                          <div class="plot-points-editor">
                            <div
                              v-for="(point, pointIndex) in chapter.plotPoints"
                              :key="point.id || pointIndex"
                              class="plot-point-item"
                            >
                              <a-select
                                v-model:value="point.type"
                                size="small"
                                class="point-type-select"
                              >
                                <a-select-option value="开场">开场</a-select-option>
                                <a-select-option value="发展">发展</a-select-option>
                                <a-select-option value="转折">转折</a-select-option>
                                <a-select-option value="高潮">高潮</a-select-option>
                                <a-select-option value="结尾">结尾</a-select-option>
                              </a-select>
                              <a-input
                                v-model:value="point.description"
                                placeholder="描述情节要点..."
                                class="point-description-input"
                                :maxlength="100"
                              />
                              <a-button
                                type="text"
                                size="small"
                                danger
                                @click="deletePlotPoint(chapter, pointIndex)"
                              >
                                <template #icon><DeleteOutlined /></template>
                              </a-button>
                            </div>
                            <a-button
                              type="dashed"
                              size="small"
                              @click="addPlotPoint(chapter)"
                              block
                            >
                              <template #icon><PlusOutlined /></template>
                              添加情节要点
                            </a-button>
                          </div>
                        </a-form-item>
                      </a-col>
                      <a-col :span="6">
                        <a-form-item label="预估字数">
                          <a-input-number
                            v-model:value="chapter.estimatedWords"
                            :min="100"
                            :max="10000"
                            :step="100"
                            style="width: 100%"
                          />
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <a-row :gutter="16">
                      <a-col :span="12">
                        <a-form-item label="涉及角色">
                          <a-select
                            v-model:value="chapter.characters"
                            mode="tags"
                            placeholder="选择或输入角色名..."
                            :options="characterOptions"
                            style="width: 100%"
                          />
                        </a-form-item>
                      </a-col>
                      <a-col :span="12">
                        <a-form-item label="相关设定">
                          <a-select
                            v-model:value="chapter.settings"
                            mode="tags"
                            placeholder="选择或输入设定..."
                            :options="settingOptions"
                            style="width: 100%"
                          />
                        </a-form-item>
                      </a-col>
                    </a-row>
                  </a-form>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </a-card>
    </div>

    <div class="editor-footer">
      <div class="footer-info">
        <span class="save-status">{{ saveStatus }}</span>
        <span class="last-modified">最后修改: {{ formatTime(lastModified) }}</span>
      </div>
      <div class="footer-actions">
        <a-button @click="resetChanges">重置修改</a-button>
        <a-button @click="previewOutline">预览效果</a-button>
        <a-button type="primary" @click="saveChanges" :loading="saving">
          保存修改
        </a-button>
      </div>
    </div>

    <!-- 预览模态框 -->
    <a-modal
      v-model:visible="previewVisible"
      title="大纲预览"
      width="1000px"
      :footer="null"
      class="outline-preview-modal"
    >
      <outline-preview
        v-if="previewVisible"
        :outline-data="editableOutline"
        mode="preview"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  DownOutlined,
  UpOutlined,
  SortAscendingOutlined
} from '@ant-design/icons-vue'
import { VueDraggable as draggable } from 'vue-draggable-plus'
import OutlinePreview from './OutlinePreview.vue'

const props = defineProps({
  outlineData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'cancel'])

// 状态管理
const editableOutline = ref({})
const saving = ref(false)
const saveStatus = ref('未保存')
const lastModified = ref(new Date())
const previewVisible = ref(false)

// 选项数据
const characterOptions = ref([
  { label: '张无忌', value: '张无忌' },
  { label: '周芷若', value: '周芷若' },
  { label: '赵敏', value: '赵敏' }
])

const settingOptions = ref([
  { label: '武当山', value: '武当山' },
  { label: '蜀山', value: '蜀山' },
  { label: '京城', value: '京城' }
])

// 计算属性
const totalWords = computed(() => {
  return editableOutline.value.chapters?.reduce((total, chapter) => {
    return total + (chapter.estimatedWords || 0)
  }, 0) || 0
})

// 方法
const initializeOutline = () => {
  editableOutline.value = JSON.parse(JSON.stringify(props.outlineData))
  // 为每个章节添加展开状态
  editableOutline.value.chapters.forEach((chapter, index) => {
    chapter.expanded = index === 0 // 默认只展开第一章
    chapter.id = chapter.id || `chapter-${Date.now()}-${index}`
    
    // 确保情节要点有ID
    if (chapter.plotPoints) {
      chapter.plotPoints.forEach((point, pointIndex) => {
        point.id = point.id || `point-${Date.now()}-${pointIndex}`
      })
    }
  })
}

const addChapter = () => {
  const newChapter = {
    id: `chapter-${Date.now()}`,
    title: `第${editableOutline.value.chapters.length + 1}章`,
    type: '发展',
    summary: '',
    plotPoints: [{
      id: `point-${Date.now()}`,
      type: '开场',
      description: ''
    }],
    characters: [],
    settings: [],
    estimatedWords: 2000,
    expanded: true
  }
  
  editableOutline.value.chapters.push(newChapter)
  updateModificationTime()
}

const deleteChapter = (index) => {
  editableOutline.value.chapters.splice(index, 1)
  updateModificationTime()
}

const toggleChapterExpand = (index) => {
  editableOutline.value.chapters[index].expanded = !editableOutline.value.chapters[index].expanded
}

const addPlotPoint = (chapter) => {
  if (!chapter.plotPoints) {
    chapter.plotPoints = []
  }
  
  chapter.plotPoints.push({
    id: `point-${Date.now()}`,
    type: '发展',
    description: ''
  })
  updateModificationTime()
}

const deletePlotPoint = (chapter, pointIndex) => {
  chapter.plotPoints.splice(pointIndex, 1)
  updateModificationTime()
}

const handleChapterReorder = () => {
  updateModificationTime()
}

const autoReorder = () => {
  // 自动排序章节（按类型排序：开篇 -> 发展 -> 高潮 -> 结局）
  const typeOrder = { '开篇': 1, '发展': 2, '过渡': 3, '高潮': 4, '结局': 5 }
  
  editableOutline.value.chapters.sort((a, b) => {
    return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3)
  })
  
  updateModificationTime()
  message.success('章节已按类型重新排序')
}

const updateModificationTime = () => {
  lastModified.value = new Date()
  saveStatus.value = '有未保存的更改'
}

const resetChanges = () => {
  initializeOutline()
  saveStatus.value = '已重置'
  message.info('已重置为原始内容')
}

const previewOutline = () => {
  previewVisible.value = true
}

const saveChanges = async () => {
  saving.value = true
  try {
    // 验证数据
    if (!editableOutline.value.summary.trim()) {
      message.error('请填写故事概览')
      return
    }
    
    if (editableOutline.value.chapters.length === 0) {
      message.error('至少需要一个章节')
      return
    }
    
    // 验证每个章节
    for (let i = 0; i < editableOutline.value.chapters.length; i++) {
      const chapter = editableOutline.value.chapters[i]
      if (!chapter.title.trim()) {
        message.error(`第${i + 1}章缺少标题`)
        return
      }
      if (!chapter.summary.trim()) {
        message.error(`第${i + 1}章缺少概述`)
        return
      }
    }
    
    // 清理数据
    const cleanOutline = JSON.parse(JSON.stringify(editableOutline.value))
    cleanOutline.chapters.forEach(chapter => {
      delete chapter.expanded
      delete chapter.id
      chapter.plotPoints?.forEach(point => {
        delete point.id
      })
    })
    
    emit('save', cleanOutline)
    saveStatus.value = '已保存'
  } catch (error) {
    message.error('保存失败，请稍后重试')
    console.error('保存大纲失败:', error)
  } finally {
    saving.value = false
  }
}

const formatTime = (date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听变化
watch(editableOutline, () => {
  updateModificationTime()
}, { deep: true })

onMounted(() => {
  initializeOutline()
})
</script>

<style scoped>
.outline-editor {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.editor-header h4 {
  font-size: 18px;
  margin-bottom: 8px;
}

.editor-header p {
  color: #666;
  font-size: 14px;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.info-card {
  margin-bottom: 24px;
}

.chapters-card {
  margin-bottom: 24px;
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.chapter-count {
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.chapters-list {
  max-height: 600px;
  overflow-y: auto;
}

.chapter-editor-item {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fafafa;
}

.chapter-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px 8px 0 0;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.drag-handle {
  cursor: grab;
  color: #999;
  padding: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

.chapter-number {
  font-weight: 600;
  color: #1890ff;
  min-width: 60px;
  font-size: 14px;
}

.chapter-title-input {
  flex: 1;
  max-width: 300px;
}

.chapter-type-select {
  width: 100px;
}

.chapter-actions {
  display: flex;
  gap: 4px;
}

.chapter-content {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.plot-points-editor {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.plot-point-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.point-type-select {
  width: 80px;
}

.point-description-input {
  flex: 1;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 24px;
}

.footer-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.save-status {
  color: #fa8c16;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* 滚动条样式 */
.editor-content::-webkit-scrollbar,
.chapters-list::-webkit-scrollbar {
  width: 6px;
}

.editor-content::-webkit-scrollbar-track,
.chapters-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.editor-content::-webkit-scrollbar-thumb,
.chapters-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.editor-content::-webkit-scrollbar-thumb:hover,
.chapters-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>