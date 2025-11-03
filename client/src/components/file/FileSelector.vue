<template>
  <div class="file-selector">
    <!-- 已选文件预览 -->
    <div v-if="currentFile" class="selected-file" :class="`list-type-${listType}`">
      <!-- picture-card 模式 -->
      <div v-if="listType === 'picture-card'" class="preview-card">
        <img v-if="isImage(currentFile)" :src="currentFile" :alt="t('fileSelector.previewAlt')" />
        <FileOutlined v-else class="file-icon" />

        <div class="preview-mask">
          <a-space>
            <a-tooltip :title="t('fileSelector.preview')">
              <EyeOutlined @click="handlePreview" />
            </a-tooltip>
            <a-tooltip :title="t('fileSelector.remove')">
              <DeleteOutlined @click="handleRemove" />
            </a-tooltip>
          </a-space>
        </div>
      </div>

      <!-- picture 模式 -->
      <div v-else-if="listType === 'picture'" class="file-item">
        <img v-if="isImage(currentFile)" :src="currentFile" :alt="t('fileSelector.previewAlt')" class="file-thumb" />
        <FileOutlined v-else class="file-icon-small" />
        <span class="file-name">{{ getFileName(currentFile) }}</span>
        <CloseOutlined class="remove-icon" @click="handleRemove" />
      </div>

      <!-- text 模式 -->
      <div v-else class="file-item text-mode">
        <FileOutlined class="file-icon-small" />
        <span class="file-name">{{ getFileName(currentFile) }}</span>
        <CloseOutlined class="remove-icon" @click="handleRemove" />
      </div>
    </div>

    <!-- 空状态/选择区 -->
    <div
      v-else
      class="selector-empty"
      :class="`list-type-${listType}`"
      @click="!disabled && handleClickEmpty()"
    >
      <div class="empty-content">
        <PlusOutlined class="plus-icon" />
        <div class="empty-text">{{ placeholder || t('fileSelector.placeholder') }}</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="showActions" class="selector-actions">
      <a-space :size="8">
        <a-upload
          v-if="showUpload"
          :show-upload-list="false"
          :before-upload="handleBeforeUpload"
          :custom-request="handleUploadRequest"
          :accept="acceptString"
          :disabled="disabled"
        >
          <a-button size="small" :disabled="disabled" :loading="uploading">
            <template #icon><UploadOutlined /></template>
            {{ t('fileSelector.uploadNew') }}
          </a-button>
        </a-upload>

        <a-button
          v-if="showSelect"
          size="small"
          :disabled="disabled"
          @click="selectorModalVisible = true"
        >
          <template #icon><FolderOpenOutlined /></template>
          {{ t('fileSelector.selectFromLibrary') }}
        </a-button>
      </a-space>
    </div>

    <!-- 文件选择对话框 -->
    <FileSelectorModal
      v-model:visible="selectorModalVisible"
      :category="category"
      :accept="accept"
      :novel-id="novelId"
      @select="handleFileSelect"
    />

    <!-- 图片预览 -->
    <a-image
      v-if="false"
      :src="previewImage"
      :preview="{
        visible: previewVisible,
        onVisibleChange: (visible) => previewVisible = visible
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PlusOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  FileOutlined,
  EyeOutlined,
  DeleteOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import FileSelectorModal from './FileSelectorModal.vue'
import { useFileUpload } from '@/composables/useFileUpload'
import { useProjectStore } from '@/stores/project'
import { useI18n } from 'vue-i18n'

interface Props {
  value?: string              // v-model 绑定的文件URL
  accept?: string[]           // 允许的文件类型
  maxSize?: number            // 最大文件大小(MB)
  category?: string           // 文件分类
  placeholder?: string        // 占位提示
  disabled?: boolean          // 是否禁用
  listType?: 'text' | 'picture' | 'picture-card'  // 展示类型
  showUpload?: boolean        // 是否显示上传按钮
  showSelect?: boolean        // 是否显示选择按钮
  showActions?: boolean       // 是否显示操作按钮
}

interface Emits {
  (e: 'update:value', value: string): void
  (e: 'change', file: any): void
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  accept: () => [],
  maxSize: 50,
  category: 'other',
  placeholder: '',
  disabled: false,
  listType: 'picture-card',
  showUpload: true,
  showSelect: true,
  showActions: true
})

const emit = defineEmits<Emits>()

const projectStore = useProjectStore()
const { uploadFile, validateFile, uploading } = useFileUpload()
const { t } = useI18n()

const selectorModalVisible = ref(false)
const previewVisible = ref(false)
const previewImage = ref('')

const currentFile = computed(() => props.value)

const novelId = computed(() => projectStore.currentProject?.id || '')

// accept 转为字符串
const acceptString = computed(() => {
  return props.accept.join(',')
})

// 判断是否为图片URL
const isImage = (url: string) => {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) || url.startsWith('data:image')
}

// 从URL获取文件名
const getFileName = (url: string) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || t('fileSelector.unknownFile')
}

// 点击空白区域
const handleClickEmpty = () => {
  if (props.showSelect) {
    selectorModalVisible.value = true
  }
}

// 上传前校验
const handleBeforeUpload = (file: File) => {
  const valid = validateFile(file, {
    maxSize: props.maxSize,
    accept: props.accept
  })
  // 验证失败返回 false 阻止上传，验证成功返回 true 继续执行 customRequest
  return valid
}

// 自定义上传
const handleUploadRequest = async ({ file }: any) => {
  try {
    const uploadedFile = await uploadFile(file, {
      category: props.category,
      novelId: novelId.value
    })

    emit('update:value', uploadedFile.fileUrl)
    emit('change', uploadedFile)
  } catch (error) {
    console.error('[FileSelector] Upload failed:', error)
  }
}

// 从文件库选择
const handleFileSelect = (file: any) => {
  emit('update:value', file.fileUrl)
  emit('change', file)
}

// 预览
const handlePreview = () => {
  if (isImage(currentFile.value)) {
    previewImage.value = currentFile.value
    previewVisible.value = true
  }
}

// 移除
const handleRemove = () => {
  emit('update:value', '')
  emit('change', null)
}
</script>

<style scoped lang="scss">
.file-selector {
  display: inline-block;
  width: 100%;
}

// 已选文件预览
.selected-file {
  &.list-type-picture-card {
    .preview-card {
      position: relative;
      width: 104px;
      height: 104px;
      border: 1px dashed #d9d9d9;
      border-radius: 8px;
      overflow: hidden;
      background: var(--theme-bg-elevated);
      transition: all 0.3s;

      &:hover {
        border-color: #1890ff;

        .preview-mask {
          opacity: 1;
        }
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .file-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        font-size: 32px;
        color: var(--theme-text-secondary);
      }

      .preview-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;

        :deep(.anticon) {
          color: white;
          font-size: 18px;
          cursor: pointer;

          &:hover {
            color: #1890ff;
          }
        }
      }
    }
  }

  &.list-type-picture,
  &.list-type-text {
    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--theme-border);
      border-radius: 6px;
      background: var(--theme-bg-container);
      transition: all 0.3s;

      &:hover {
        border-color: #1890ff;
        background: var(--theme-bg-elevated);

        .remove-icon {
          opacity: 1;
        }
      }

      .file-thumb {
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: 4px;
      }

      .file-icon-small {
        font-size: 20px;
        color: var(--theme-text-secondary);
      }

      .file-name {
        flex: 1;
        font-size: 14px;
        color: var(--theme-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .remove-icon {
        font-size: 14px;
        color: var(--theme-text-secondary);
        cursor: pointer;
        opacity: 0;
        transition: all 0.3s;

        &:hover {
          color: #ff4d4f;
        }
      }
    }

    &.text-mode .file-item {
      .file-thumb {
        display: none;
      }
    }
  }
}

// 空状态
.selector-empty {
  cursor: pointer;

  &.list-type-picture-card {
    width: 104px;
    height: 104px;
    border: 1px dashed #d9d9d9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-elevated);
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;

      .plus-icon {
        color: #1890ff;
      }
    }

    .empty-content {
      text-align: center;

      .plus-icon {
        font-size: 24px;
        color: #999;
        transition: color 0.3s;
      }

      .empty-text {
        margin-top: 8px;
        font-size: 12px;
        color: #999;
      }
    }
  }

  &.list-type-picture,
  &.list-type-text {
    padding: 32px;
    border: 1px dashed #d9d9d9;
    border-radius: 8px;
    background: var(--theme-bg-elevated);
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
    }

    .empty-content {
      text-align: center;

      .plus-icon {
        font-size: 32px;
        color: #999;
      }

      .empty-text {
        margin-top: 12px;
        font-size: 14px;
        color: #999;
      }
    }
  }
}

// 操作按钮
.selector-actions {
  margin-top: 12px;
}
</style>
