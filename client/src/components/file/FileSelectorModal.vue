<template>
  <a-modal
    :open="visible"
    :title="title"
    width="900px"
    :footer="null"
    @cancel="handleCancel"
  >
    <!-- 工具栏 -->
    <div class="selector-toolbar">
      <a-input-search
        v-model:value="searchKeyword"
        :placeholder="t('fileSelector.searchPlaceholder')"
        class="search-input"
        @search="handleSearch"
        allow-clear
      />

      <a-select
        v-model:value="filterCategory"
        :placeholder="t('fileSelector.categoryPlaceholder')"
        class="filter-select"
        @change="handleFilterChange"
        allow-clear
      >
        <a-select-option value="">
          <AppstoreOutlined /> {{ t('fileSelector.categories.all') }}
        </a-select-option>
        <a-select-option value="worldbook">
          <BookOutlined /> {{ t('fileSelector.categories.worldbook') }}
        </a-select-option>
        <a-select-option value="character">
          <TeamOutlined /> {{ t('fileSelector.categories.character') }}
        </a-select-option>
        <a-select-option value="document">
          <FileTextOutlined /> {{ t('fileSelector.categories.document') }}
        </a-select-option>
        <a-select-option value="image">
          <PictureOutlined /> {{ t('fileSelector.categories.image') }}
        </a-select-option>
        <a-select-option value="other">
          <FileOutlined /> {{ t('fileSelector.categories.other') }}
        </a-select-option>
      </a-select>

      <a-upload
        :show-upload-list="false"
        :before-upload="handleBeforeUpload"
        :custom-request="handleUploadRequest"
        :accept="acceptString"
      >
        <a-button type="primary" :loading="uploading">
          <template #icon><UploadOutlined /></template>
          {{ t('fileSelector.upload') }}
        </a-button>
      </a-upload>
    </div>

    <!-- 文件网格 -->
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && displayFiles.length === 0" :description="t(emptyDescriptionKey)">
        <a-button type="primary" @click="handleCancel">
          {{ t('fileSelector.backToUpload') }}
        </a-button>
      </a-empty>

      <div v-else class="file-grid">
        <div
          v-for="file in displayFiles"
          :key="file.id"
          class="file-card"
          :class="{ selected: selectedFileId === file.id }"
          @click="handleSelect(file)"
        >
          <!-- 文件预览 -->
          <div class="file-preview">
            <a-image
              v-if="isImageFile(file.fileType)"
              :src="file.fileUrl"
              :alt="file.fileName"
              :preview="false"
              class="preview-image"
            />
            <div v-else class="preview-icon">
              <component :is="getFileIcon(file.fileType)" />
            </div>
          </div>

          <!-- 文件信息 -->
          <div class="file-info">
            <div class="file-name" :title="file.fileName">
              {{ file.fileName }}
            </div>
            <div class="file-meta">
              <a-tag :color="getCategoryColor(file.category)" size="small">
                {{ getCategoryName(file.category) }}
              </a-tag>
              <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
            </div>
          </div>

          <!-- 选中标记 -->
          <div v-if="selectedFileId === file.id" class="selected-mark">
            <CheckCircleFilled />
          </div>
        </div>
      </div>
    </a-spin>

    <!-- 底部操作栏 -->
    <div class="selector-footer">
      <a-space>
        <span v-if="selectedFile" class="selected-info">
          {{ t('fileSelector.selectedPrefix') }} {{ selectedFile.fileName }}
        </span>
      </a-space>
      <a-space>
        <a-button @click="handleCancel">{{ t('common.cancel') }}</a-button>
        <a-button
          type="primary"
          :disabled="!selectedFileId"
          @click="handleConfirm"
        >
          {{ t('common.confirm') }}
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  AppstoreOutlined,
  BookOutlined,
  TeamOutlined,
  FileTextOutlined,
  PictureOutlined,
  FileOutlined,
  CheckCircleFilled,
  UploadOutlined
} from '@ant-design/icons-vue'
import { useFileList } from '@/composables/useFileList'
import { useFileUpload } from '@/composables/useFileUpload'
import { useI18n } from 'vue-i18n'

interface Props {
  visible?: boolean
  category?: string      // 预设分类筛选
  accept?: string[]      // 允许的文件类型
  novelId?: string       // 关联的项目ID
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'select', file: any): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  category: '',
  accept: () => [],
  novelId: ''
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

const {
  files,
  loading,
  loadFiles,
  isImageFile,
  formatFileSize
} = useFileList()

const { uploadFile, validateFile, uploading } = useFileUpload()

const searchKeyword = ref('')
const filterCategory = ref(props.category || '')
const selectedFileId = ref<string>('')

const emptyDescriptionKey = computed(() => {
  if (props.category === 'character' || filterCategory.value === 'character') {
    return 'fileSelector.empty.character'
  }
  if (props.accept && props.accept.some(type => type.includes('image') || type === 'image/*')) {
    return 'fileSelector.empty.image'
  }
  return 'fileSelector.empty.default'
})

const title = computed(() => {
  if (props.category === 'character' || filterCategory.value === 'character') {
    return t('fileSelector.title.character')
  }
  if (props.accept && props.accept.some(type => type.includes('image') || type === 'image/*')) {
    return t('fileSelector.title.image')
  }
  return t('fileSelector.title.default')
})

// accept 转为字符串
const acceptString = computed(() => {
  return props.accept.join(',')
})

// 选中的文件
const selectedFile = computed(() => {
  return files.value.find(f => f.id === selectedFileId.value)
})

// 显示的文件列表（经过筛选）
const displayFiles = computed(() => {
  let result = files.value

  // 分类筛选
  if (filterCategory.value) {
    result = result.filter(f => f.category === filterCategory.value)
  }

  // 类型筛选
  if (props.accept && props.accept.length > 0) {
    result = result.filter(file => {
      return props.accept.some(type => {
        if (type.endsWith('/*')) {
          const prefix = type.split('/')[0]
          return file.fileType?.startsWith(prefix + '/')
        }
        if (type.startsWith('.')) {
          return file.fileName?.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.fileType === type
      })
    })
  }

  // 搜索筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(file => {
      return (
        file.fileName?.toLowerCase().includes(keyword) ||
        file.description?.toLowerCase().includes(keyword)
      )
    })
  }

  return result
})

// 获取文件图标
const getFileIcon = (mimeType: string) => {
  if (!mimeType) return FileOutlined
  if (mimeType.startsWith('image/')) return PictureOutlined
  if (mimeType.includes('pdf')) return FileTextOutlined
  if (mimeType.includes('word') || mimeType.includes('document')) return FileTextOutlined
  return FileOutlined
}

// 获取分类名称
const getCategoryName = (category: string) => {
  const key = `fileSelector.categories.${category || 'other'}`
  const translated = t(key)
  return translated === key ? category : translated
}

// 获取分类颜色
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    worldbook: 'purple',
    character: 'blue',
    document: 'orange',
    image: 'green',
    other: 'default'
  }
  return colors[category] || 'default'
}

// 选择文件
const handleSelect = (file: any) => {
  selectedFileId.value = file.id
}

// 搜索
const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
}

// 筛选变化
const handleFilterChange = () => {
  // 筛选逻辑已在 computed 中处理
}

// 确定选择
const handleConfirm = () => {
  if (selectedFile.value) {
    emit('select', selectedFile.value)
    emit('update:visible', false)
    selectedFileId.value = ''
  }
}

// 取消
const handleCancel = () => {
  emit('update:visible', false)
  selectedFileId.value = ''
}

// 上传前校验
const handleBeforeUpload = (file: File) => {
  console.log('[FileSelectorModal] 开始上传前校验:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    accept: props.accept,
    category: props.category
  })

  const valid = validateFile(file, {
    maxSize: 50,
    accept: props.accept
  })

  console.log('[FileSelectorModal] 校验结果:', valid)

  // 验证失败返回 false 阻止上传，验证成功返回 true 继续执行 customRequest
  return valid
}

// 自定义上传
const handleUploadRequest = async ({ file }: any) => {
  console.log('[FileSelectorModal] 开始上传文件:', {
    fileName: file.name,
    category: props.category || filterCategory.value || 'other',
    novelId: props.novelId
  })

  try {
    const uploadedFile = await uploadFile(file, {
      category: props.category || filterCategory.value || 'other',
      novelId: props.novelId
    })

    console.log('[FileSelectorModal] 文件上传成功:', uploadedFile)

    // 重新加载文件列表
    await loadFiles({
      category: props.category,
      novelId: props.novelId
    })

    console.log('[FileSelectorModal] 文件列表已刷新')

    // 自动选择刚上传的文件
    if (uploadedFile && uploadedFile.id) {
      selectedFileId.value = uploadedFile.id
      console.log('[FileSelectorModal] 已自动选中文件:', uploadedFile.id)
    }
  } catch (error) {
    console.error('[FileSelectorModal] 上传失败:', error)
    // 错误消息已在 useFileUpload 中显示
  }
}

// 监听弹窗打开，加载文件
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadFiles({
      category: props.category,
      novelId: props.novelId
    })
  }
})
</script>

<style scoped lang="scss">
.selector-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  .search-input {
    flex: 1;
  }

  .filter-select {
    width: 160px;
  }

  :deep(.ant-upload) {
    display: inline-block;
  }
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.file-card {
  background: var(--theme-bg-container);
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: #1488CC;
  }

  &.selected {
    border-color: #1488CC;
    background: #e6f7ff;

    .selected-mark {
      display: flex;
    }
  }

  .file-preview {
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-elevated);
    overflow: hidden;

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-icon {
      font-size: 36px;
      color: var(--theme-text-secondary);
      opacity: 0.5;
    }
  }

  .file-info {
    padding: 12px;

    .file-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--theme-text);
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-meta {
      display: flex;
      align-items: center;
      gap: 8px;

      .file-size {
        font-size: 12px;
        color: var(--theme-text-secondary);
      }
    }
  }

  .selected-mark {
    position: absolute;
    top: 8px;
    right: 8px;
    display: none;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #1488CC;
    border-radius: 50%;
    color: white;
    font-size: 16px;
  }
}

.selector-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--theme-border);

  .selected-info {
    font-size: 14px;
    color: var(--theme-text-secondary);
  }
}

// 滚动条样式
.file-grid::-webkit-scrollbar {
  width: 6px;
}

.file-grid::-webkit-scrollbar-track {
  background: var(--theme-bg-elevated);
  border-radius: 3px;
}

.file-grid::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 3px;

  &:hover {
    background: #999;
  }
}
</style>
