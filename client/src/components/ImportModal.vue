<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    width="800px"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="import-modal">
      <a-steps :current="currentStep" class="mb-6">
        <a-step :title="$t('project.importModal.uploadStep')" />
        <a-step :title="$t('project.importModal.previewStep')" />
        <a-step :title="$t('project.importModal.configureStep')" />
      </a-steps>

      <div v-if="currentStep === 0" class="upload-step">
        <a-upload-dragger
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :max-count="1"
          accept=".txt,.md,.markdown,.docx,.epub"
          @change="handleFileChange"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined />
          </p>
          <p class="ant-upload-text">{{ $t('project.importModal.uploadHint') }}</p>
          <p class="ant-upload-hint">
            {{ $t('project.importModal.supportedFormats') }}
          </p>
        </a-upload-dragger>

        <div v-if="uploadedFile" class="mt-4">
          <a-alert
            :message="`${$t('project.importModal.fileSelected')} ${uploadedFile.name}`"
            :description="`${$t('project.importModal.fileSize')} ${formatFileSize(uploadedFile.size)}`"
            type="info"
            show-icon
          />
        </div>

        <div class="mt-4 flex justify-end">
          <a-button @click="handleCancel" class="mr-2">{{ $t('common.cancel') }}</a-button>
          <a-button
            type="primary"
            :disabled="!uploadedFile"
            :loading="parsing"
            @click="handleParse"
          >
            {{ $t('project.importModal.next') }}
          </a-button>
        </div>
      </div>

      <div v-if="currentStep === 1" class="preview-step">
        <a-spin :spinning="parsing">
          <div v-if="parsedData">
            <a-descriptions bordered size="small" class="mb-4">
              <a-descriptions-item :label="$t('project.projectName')">
                {{ parsedData.title }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.importModal.totalChapters')">
                {{ parsedData.metadata.chapterCount }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.importModal.totalWords')">
                {{ parsedData.metadata.totalWords.toLocaleString() }}
              </a-descriptions-item>
            </a-descriptions>

            <div class="chapter-list max-h-96 overflow-y-auto">
              <a-collapse v-model:activeKey="activeChapters">
                <a-collapse-panel
                  v-for="(chapter, index) in parsedData.chapters"
                  :key="index"
                  :header="`${chapter.title} (${chapter.wordCount} ${$t('project.importModal.words')})`"
                >
                  <div class="chapter-preview max-h-48 overflow-y-auto text-sm">
                    {{ truncateContent(chapter.content) }}
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </div>
        </a-spin>

        <div class="mt-4 flex justify-end">
          <a-button @click="currentStep = 0" class="mr-2">{{ $t('project.importModal.back') }}</a-button>
          <a-button type="primary" @click="currentStep = 2">{{ $t('project.importModal.next') }}</a-button>
        </div>
      </div>

      <div v-if="currentStep === 2" class="configure-step">
        <a-form :model="importConfig" layout="vertical">
          <a-form-item :label="$t('project.importModal.mode')">
            <a-radio-group v-model:value="importConfig.mode">
              <a-radio value="new">{{ $t('project.importModal.modeNew') }}</a-radio>
              <a-radio value="append" :disabled="!hasNovels">
                {{ $t('project.importModal.modeAppend') }}
              </a-radio>
            </a-radio-group>
          </a-form-item>

          <template v-if="importConfig.mode === 'new'">
            <a-form-item :label="$t('project.genre')">
              <a-select v-model:value="importConfig.genre" :placeholder="$t('project.selectGenre')">
                <a-select-option value="奇幻">{{ $t('genre.fantasy') }}</a-select-option>
                <a-select-option value="科幻">{{ $t('genre.scifi') }}</a-select-option>
                <a-select-option value="现实">{{ $t('genre.realistic') }}</a-select-option>
                <a-select-option value="历史">{{ $t('genre.historical') }}</a-select-option>
                <a-select-option value="悬疑">{{ $t('genre.mystery') }}</a-select-option>
                <a-select-option value="言情">{{ $t('genre.romance') }}</a-select-option>
                <a-select-option value="武侠">{{ $t('genre.wuxia') }}</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item :label="$t('project.rating')">
              <a-select v-model:value="importConfig.rating" :placeholder="$t('project.selectRating')">
                <a-select-option value="G">{{ $t('rating.g') }}</a-select-option>
                <a-select-option value="PG">{{ $t('rating.pg') }}</a-select-option>
                <a-select-option value="PG-13">{{ $t('rating.pg13') }}</a-select-option>
                <a-select-option value="R">{{ $t('rating.r') }}</a-select-option>
                <a-select-option value="NC-17">{{ $t('rating.nc17') }}</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item :label="$t('project.targetWordCount')">
              <a-input-number
                v-model:value="importConfig.targetWordCount"
                :min="0"
                :step="1000"
                :placeholder="$t('project.targetWordCountPlaceholder')"
                class="w-full"
              />
            </a-form-item>
          </template>

          <template v-if="importConfig.mode === 'append'">
            <a-form-item :label="$t('project.importModal.selectNovel')">
              <a-select
                v-model:value="importConfig.novelId"
                :placeholder="$t('project.importModal.selectNovelPlaceholder')"
                show-search
                :filter-option="filterNovelOption"
              >
                <a-select-option
                  v-for="novel in availableNovels"
                  :key="novel.id"
                  :value="novel.id"
                >
                  {{ novel.title }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item :label="$t('project.importModal.startChapterNumber')">
              <a-input-number
                v-model:value="importConfig.startNumber"
                :min="1"
                :placeholder="$t('project.importModal.startChapterPlaceholder')"
                class="w-full"
              />
            </a-form-item>
          </template>
        </a-form>

        <div class="mt-4 flex justify-end">
          <a-button @click="currentStep = 1" class="mr-2">{{ $t('project.importModal.back') }}</a-button>
          <a-button
            type="primary"
            :loading="importing"
            @click="handleImport"
          >
            {{ $t('project.importModal.importButton') }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { message } from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';
import type { UploadChangeParam, UploadFile } from 'ant-design-vue';
import importService, { type ParsedNovelData } from '../services/importService';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface ImportConfig {
  mode: 'new' | 'append';
  genre: string;
  rating: string;
  targetWordCount?: number;
  novelId?: string;
  startNumber?: number;
}

interface Novel {
  id: string;
  title: string;
}

const props = defineProps<{
  open: boolean;
  availableNovels?: Novel[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'success', data: any): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
});

const currentStep = ref(0);
const fileList = ref<UploadFile[]>([]);
const uploadedFile = ref<File | null>(null);
const parsedData = ref<ParsedNovelData | null>(null);
const parsing = ref(false);
const importing = ref(false);
const activeChapters = ref<number[]>([0]);

const importConfig = ref<ImportConfig>({
  mode: 'new',
  genre: '奇幻',
  rating: 'PG-13'
});

const hasNovels = computed(() => {
  return props.availableNovels && props.availableNovels.length > 0;
});

const modalTitle = computed(() => {
  const baseTitle = t('project.importModal.title');
  switch (currentStep.value) {
    case 0:
      return `${baseTitle} - ${t('project.importModal.uploadStep')}`;
    case 1:
      return `${baseTitle} - ${t('project.importModal.previewStep')}`;
    case 2:
      return `${baseTitle} - ${t('project.importModal.configureStep')}`;
    default:
      return baseTitle;
  }
});

const beforeUpload = (file: File) => {
  if (!importService.isValidFileType(file)) {
    message.error(t('project.importModal.unsupportedFileType'));
    return false;
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    message.error(t('project.importModal.fileSizeExceeded'));
    return false;
  }

  uploadedFile.value = file;
  return false;
};

const handleFileChange = (info: UploadChangeParam) => {
  if (info.fileList.length === 0) {
    uploadedFile.value = null;
  }
};

const handleParse = async () => {
  if (!uploadedFile.value) return;

  parsing.value = true;
  try {
    const result = await importService.parseFile(uploadedFile.value);
    parsedData.value = result.data;
    currentStep.value = 1;
    message.success(t('project.importModal.parseSuccess'));
  } catch (error: any) {
    message.error(error.response?.data?.message || t('project.importModal.parseFailed'));
  } finally {
    parsing.value = false;
  }
};

const handleImport = async () => {
  if (!uploadedFile.value) return;

  importing.value = true;
  try {
    let result;

    if (importConfig.value.mode === 'new') {
      result = await importService.createNovelFromFile(uploadedFile.value, {
        genre: importConfig.value.genre,
        rating: importConfig.value.rating,
        targetWordCount: importConfig.value.targetWordCount
      });
    } else {
      if (!importConfig.value.novelId) {
        message.error(t('project.importModal.selectNovelRequired'));
        return;
      }
      result = await importService.addChaptersToNovel(
        importConfig.value.novelId,
        uploadedFile.value,
        {
          startNumber: importConfig.value.startNumber
        }
      );
    }

    message.success(result.message);
    emit('success', result.data);
    handleCancel();
  } catch (error: any) {
    message.error(error.response?.data?.message || t('project.importModal.importFailed'));
  } finally {
    importing.value = false;
  }
};

const handleCancel = () => {
  visible.value = false;
  currentStep.value = 0;
  fileList.value = [];
  uploadedFile.value = null;
  parsedData.value = null;
  importConfig.value = {
    mode: 'new',
    genre: '奇幻',
    rating: 'PG-13'
  };
};

const formatFileSize = (bytes: number): string => {
  return importService.formatFileSize(bytes);
};

const truncateContent = (content: string, maxLength: number = 500): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

const filterNovelOption = (input: string, option: any) => {
  return option.children[0].children.toLowerCase().includes(input.toLowerCase());
};

watch(() => props.open, (newVal) => {
  if (!newVal) {
    handleCancel();
  }
});
</script>

<style scoped>
.import-modal {
  min-height: 400px;
}

.chapter-preview {
  white-space: pre-wrap;
  font-family: monospace;
  padding: 12px;
  border-radius: 4px;
}

.chapter-list :deep(.ant-collapse-header) {
  font-weight: 500;
}
</style>
