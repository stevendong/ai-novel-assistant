<template>
  <div class="batch-preview-panel">
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="preview" class="preview-content">
        <!-- 批次信息 -->
        <a-alert
          :message="`批次: ${preview.batchInfo.name}`"
          :description="`${preview.batchInfo.mode} 模式 - ${preview.batchInfo.totalChapters} 章`"
          type="info"
          show-icon
          closable
          class="mb-4"
        />

        <!-- 操作栏 -->
        <div class="preview-actions mb-4">
          <a-space>
            <a-checkbox
              :indeterminate="indeterminate"
              :checked="checkAll"
              @change="handleCheckAllChange"
            >
              全选
            </a-checkbox>
            <a-button
              type="primary"
              :disabled="selectedChapters.length === 0"
              @click="handleApply"
              :loading="applying"
            >
              <template #icon><CheckOutlined /></template>
              应用选中章节 ({{ selectedChapters.length }})
            </a-button>
          </a-space>
        </div>

        <!-- 章节列表 -->
        <a-list
          :data-source="preview.chapters"
          item-layout="vertical"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <template #extra>
                <a-checkbox
                  v-model:checked="selectedChapters"
                  :value="item.id"
                  :disabled="item.status === 'applied'"
                />
              </template>

              <a-list-item-meta>
                <template #title>
                  <a-space>
                    <span class="font-bold">
                      第{{ item.chapterNumber }}章：{{ item.title }}
                    </span>
                    <a-tag v-if="item.status === 'applied'" color="success">已应用</a-tag>
                    <a-tag v-else-if="item.status === 'approved'" color="green">已批准</a-tag>
                    <a-tag v-else>草稿</a-tag>
                    <a-tag color="blue">优先级: {{ item.priority }}/5</a-tag>
                    <a-tag :color="getConfidenceColor(item.aiConfidence)">
                      AI信心: {{ Math.round(item.aiConfidence * 100) }}%
                    </a-tag>
                    <a-tag v-if="item.estimatedWords">
                      预估: {{ item.estimatedWords }}字
                    </a-tag>
                  </a-space>
                </template>

                <template #description>
                  <div class="chapter-outline">
                    {{ item.outline }}
                  </div>
                </template>
              </a-list-item-meta>

              <div class="chapter-details">
                <a-row :gutter="16">
                  <a-col :span="8" v-if="item.plotPoints.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">剧情要点</div>
                      <ul class="detail-list">
                        <li v-for="(point, index) in item.plotPoints" :key="index">
                          {{ point }}
                        </li>
                      </ul>
                    </div>
                  </a-col>
                  <a-col :span="8" v-if="item.characters.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">涉及角色</div>
                      <a-tag
                        v-for="char in item.characters"
                        :key="char"
                        color="blue"
                        class="mb-1"
                      >
                        {{ char }}
                      </a-tag>
                    </div>
                  </a-col>
                  <a-col :span="8" v-if="item.settings.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">使用设定</div>
                      <a-tag
                        v-for="setting in item.settings"
                        :key="setting"
                        color="purple"
                        class="mb-1"
                      >
                        {{ setting }}
                      </a-tag>
                    </div>
                  </a-col>
                </a-row>

                <div v-if="item.notes" class="chapter-notes">
                  <strong>备注：</strong>{{ item.notes }}
                </div>

                <div class="detail-actions mt-3">
                  <a-space>
                    <a-button size="small" @click="handleEdit(item)">
                      <template #icon><EditOutlined /></template>
                      编辑
                    </a-button>
                    <a-button size="small" @click="handleRegenerate(item)">
                      <template #icon><ReloadOutlined /></template>
                      重新生成
                    </a-button>
                  </a-space>
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </a-spin>

    <!-- 编辑章节 Modal -->
    <a-modal
      v-model:open="editModalVisible"
      title="编辑章节"
      width="800px"
      @ok="handleSaveEdit"
      :confirm-loading="saving"
    >
      <a-form layout="vertical">
        <a-form-item label="章节标题">
          <a-input v-model:value="editingChapter.title" />
        </a-form-item>
        <a-form-item label="章节大纲">
          <a-textarea
            v-model:value="editingChapter.outline"
            :rows="8"
            placeholder="详细描述章节内容..."
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="editingChapter.notes"
            :rows="3"
            placeholder="添加备注..."
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  CheckOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { batchChapterService } from '@/services/batchChapterService'
import type { BatchPreview } from '@/services/batchChapterService'

interface Props {
  batchId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'applied'])

// 状态
const loading = ref(false)
const preview = ref<BatchPreview | null>(null)
const selectedChapters = ref<string[]>([])
const applying = ref(false)

// 编辑状态
const editModalVisible = ref(false)
const editingChapter = ref({
  id: '',
  title: '',
  outline: '',
  notes: ''
})
const saving = ref(false)

// 全选逻辑
const indeterminate = computed(() => {
  const unappliedChapters = preview.value?.chapters.filter(c => c.status !== 'applied') || []
  return selectedChapters.value.length > 0 &&
    selectedChapters.value.length < unappliedChapters.length
})

const checkAll = computed(() => {
  const unappliedChapters = preview.value?.chapters.filter(c => c.status !== 'applied') || []
  return selectedChapters.value.length === unappliedChapters.length && unappliedChapters.length > 0
})

const handleCheckAllChange = (e: any) => {
  if (e.target.checked) {
    selectedChapters.value = preview.value?.chapters
      .filter(c => c.status !== 'applied')
      .map(c => c.id) || []
  } else {
    selectedChapters.value = []
  }
}

// 加载预览
const loadPreview = async () => {
  loading.value = true
  try {
    preview.value = await batchChapterService.getBatchPreview(props.batchId)

    // 默认全选未应用的章节
    selectedChapters.value = preview.value.chapters
      .filter(c => c.status !== 'applied')
      .map(c => c.id)
  } catch (error: any) {
    console.error('加载预览失败:', error)
    message.error('加载预览失败')
  } finally {
    loading.value = false
  }
}

// 应用章节
const handleApply = async () => {
  if (selectedChapters.value.length === 0) {
    message.warning('请选择要应用的章节')
    return
  }

  applying.value = true
  try {
    const result = await batchChapterService.applyGeneratedChapters(
      props.batchId,
      selectedChapters.value
    )

    emit('applied', result)
  } catch (error: any) {
    console.error('应用章节失败:', error)
    message.error(error.message || '应用章节失败')
  } finally {
    applying.value = false
  }
}

// 编辑章节
const handleEdit = (chapter: any) => {
  editingChapter.value = {
    id: chapter.id,
    title: chapter.title,
    outline: chapter.outline,
    notes: chapter.notes || ''
  }
  editModalVisible.value = true
}

// 保存编辑
const handleSaveEdit = async () => {
  saving.value = true
  try {
    await batchChapterService.updateGeneratedChapter(editingChapter.value.id, {
      title: editingChapter.value.title,
      outline: editingChapter.value.outline,
      notes: editingChapter.value.notes
    })

    // 刷新预览
    await loadPreview()

    message.success('章节更新成功')
    editModalVisible.value = false
  } catch (error: any) {
    console.error('更新章节失败:', error)
    message.error('更新章节失败')
  } finally {
    saving.value = false
  }
}

// 重新生成章节
const handleRegenerate = async (chapter: any) => {
  try {
    await batchChapterService.regenerateChapter(chapter.id)
    message.info('章节重新生成功能开发中')
  } catch (error: any) {
    console.error('重新生成失败:', error)
    message.error('重新生成失败')
  }
}

// 获取信心度颜色
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'green'
  if (confidence >= 0.6) return 'orange'
  return 'red'
}

// 初始化
onMounted(() => {
  loadPreview()
})
</script>

<style scoped>
.batch-preview-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.font-bold {
  font-weight: 600;
}

.preview-actions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--theme-bg-elevated);
  border-radius: 8px;
}

.chapter-outline {
  margin: 12px 0;
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.chapter-details {
  margin-top: 16px;
  padding: 16px;
  background: var(--theme-bg-base);
  border-radius: 8px;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--theme-text);
}

.detail-list {
  margin: 0;
  padding-left: 20px;
}

.detail-list li {
  margin-bottom: 4px;
  color: var(--theme-text-secondary);
}

.chapter-notes {
  margin-top: 12px;
  padding: 8px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.detail-actions {
  border-top: 1px solid var(--theme-border);
  padding-top: 12px;
}
</style>
