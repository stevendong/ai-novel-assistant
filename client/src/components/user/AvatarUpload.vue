<template>
  <div class="avatar-upload">
    <div class="avatar-preview">
      <a-avatar
        :size="size"
        :src="previewUrl || currentAvatar"
        :style="{ cursor: 'pointer' }"
        @click="triggerUpload"
      >
        <template #icon>
          <UserOutlined v-if="!previewUrl && !currentAvatar" />
        </template>
      </a-avatar>

      <!-- 上传按钮 -->
      <div class="upload-actions">
        <a-button
          type="primary"
          size="small"
          :loading="uploading"
          @click="triggerUpload"
        >
          <UploadOutlined /> {{ currentAvatar ? t('user.profile.avatarUpload.change') : t('user.profile.avatarUpload.upload') }}
        </a-button>

        <a-button
          v-if="currentAvatar"
          danger
          size="small"
          :loading="deleting"
          @click="handleDelete"
        >
          <DeleteOutlined /> {{ t('user.profile.avatarUpload.delete') }}
        </a-button>
      </div>
    </div>

    <!-- 隐藏的文件上传输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 压缩信息提示 -->
    <div v-if="compressionInfo" class="compression-info">
      <a-alert
        :message="t('user.profile.avatarUpload.compressionTitle', { ratio: compressionInfo.compressionRatio.toFixed(1) })"
        :description="t('user.profile.avatarUpload.compressionDescription', { original: compressionInfo.originalSizeText, compressed: compressionInfo.compressedSizeText })"
        type="info"
        closable
        @close="compressionInfo = null"
      />
    </div>

    <!-- 上传提示 -->
    <div v-if="showUploadTip" class="upload-tip">
      <a-typography-text type="secondary">
        {{ t('user.profile.avatarUpload.tip') }}
      </a-typography-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { compressImage, formatFileSize, isImageFile, validateImageSize } from '@/utils/imageCompressor';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';

interface Props {
  currentAvatar?: string;
  size?: number;
  showUploadTip?: boolean;
}

interface Emits {
  (e: 'update:currentAvatar', url: string | null): void;
  (e: 'uploadSuccess', url: string): void;
  (e: 'deleteSuccess'): void;
}

const props = withDefaults(defineProps<Props>(), {
  currentAvatar: '',
  size: 100,
  showUploadTip: true
});

const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const { t } = useI18n();

const fileInputRef = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string>('');
const uploading = ref(false);
const deleting = ref(false);
const compressionInfo = ref<{
  originalSizeText: string;
  compressedSizeText: string;
  compressionRatio: number;
} | null>(null);

// 触发文件选择
const triggerUpload = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // 验证文件类型
  if (!isImageFile(file)) {
    message.error(t('user.profile.messages.fileTypeInvalid'));
    return;
  }

  // 验证文件大小
  if (!validateImageSize(file, 5 * 1024 * 1024)) {
    message.error(t('user.profile.messages.fileSizeExceeded'));
    return;
  }

  try {
    uploading.value = true;

    // 压缩图片
    const compressed = await compressImage(file, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.8,
      mimeType: 'image/jpeg'
    });

    // 显示压缩信息
    compressionInfo.value = {
      originalSizeText: formatFileSize(compressed.originalSize),
      compressedSizeText: formatFileSize(compressed.compressedSize),
      compressionRatio: compressed.compressionRatio
    };

    // 预览图片
    previewUrl.value = URL.createObjectURL(compressed.file);

    // 上传到服务器
    await uploadAvatar(compressed.file);

  } catch (error: any) {
    message.error(error.message || t('user.profile.messages.imageProcessFailed'));
    console.error('Image processing error:', error);
  } finally {
    uploading.value = false;
    // 清空 input 值，允许重复选择同一文件
    target.value = '';
  }
};

// 上传头像到服务器
const uploadAvatar = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const result = await authStore.uploadAvatar(formData);

    if (result.success && result.data?.user?.avatar) {
      emit('update:currentAvatar', result.data.user.avatar);
      emit('uploadSuccess', result.data.user.avatar);
      message.success(t('user.profile.messages.avatarUploadSuccess'));

      // 清空预览
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
      }
    } else {
      throw new Error(result.error || t('user.profile.messages.avatarUploadFailed'));
    }
  } catch (error: any) {
    message.error(error.message || t('user.profile.messages.avatarUploadFailed'));
    throw error;
  }
};

// 删除头像
const handleDelete = async () => {
  try {
    deleting.value = true;
    const result = await authStore.deleteAvatar();

    if (result.success) {
      emit('update:currentAvatar', null);
      emit('deleteSuccess');
      message.success(t('user.profile.messages.avatarDeleteSuccess'));

      // 清空预览
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
      }
    } else {
      throw new Error(result.error || t('user.profile.messages.avatarDeleteFailed'));
    }
  } catch (error: any) {
    message.error(error.message || t('user.profile.messages.avatarDeleteFailed'));
  } finally {
    deleting.value = false;
  }
};
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.avatar-preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.compression-info {
  margin-top: 8px;
}

.upload-tip {
  margin-top: 4px;
}
</style>
