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
          <UploadOutlined /> {{ currentAvatar ? '更换头像' : '上传头像' }}
        </a-button>

        <a-button
          v-if="currentAvatar"
          danger
          size="small"
          :loading="deleting"
          @click="handleDelete"
        >
          <DeleteOutlined /> 删除头像
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
        :message="`图片已压缩 ${compressionInfo.compressionRatio.toFixed(1)}%`"
        :description="`原始大小: ${compressionInfo.originalSizeText}, 压缩后: ${compressionInfo.compressedSizeText}`"
        type="info"
        closable
        @close="compressionInfo = null"
      />
    </div>

    <!-- 上传提示 -->
    <div v-if="showUploadTip" class="upload-tip">
      <a-typography-text type="secondary">
        支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
      </a-typography-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { compressImage, formatFileSize, isImageFile, validateImageSize } from '@/utils/imageCompressor';
import { useAuthStore } from '@/stores/auth';

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
    message.error('请选择图片文件');
    return;
  }

  // 验证文件大小
  if (!validateImageSize(file, 5 * 1024 * 1024)) {
    message.error('图片大小不能超过 5MB');
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
    message.error(error.message || '图片处理失败');
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
      message.success('头像上传成功');

      // 清空预览
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
      }
    } else {
      throw new Error(result.error || '头像上传失败');
    }
  } catch (error: any) {
    message.error(error.message || '头像上传失败');
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
      message.success('头像删除成功');

      // 清空预览
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
      }
    } else {
      throw new Error(result.error || '头像删除失败');
    }
  } catch (error: any) {
    message.error(error.message || '头像删除失败');
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