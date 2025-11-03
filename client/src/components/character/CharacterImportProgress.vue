<template>
  <a-modal
    :open="visible"
    :title="t('character.import.title')"
    :closable="false"
    :maskClosable="false"
    :footer="null"
    width="600px"
  >
    <div class="import-progress-content">
      <a-steps :current="step" size="small" class="mb-6">
        <a-step :title="t('character.import.steps.readFile')" />
        <a-step :title="t('character.import.steps.extractData')" />
        <a-step :title="t('character.import.steps.aiParsing')" />
        <a-step :title="t('character.import.steps.createCharacter')" />
      </a-steps>

      <div class="import-status">
        <a-spin :spinning="loading">
          <div class="status-message">
            <CheckCircleOutlined v-if="step > 0" class="text-green-500 mr-2" />
            <LoadingOutlined v-else class="mr-2" />
            <span>{{ statusText }}</span>
          </div>

          <div v-if="error" class="error-message mt-4">
            <a-alert :message="error" type="error" show-icon closable />
          </div>

          <div v-if="previewData" class="preview-section mt-6">
            <h4 class="text-sm font-medium mb-3 theme-text-primary">{{ t('character.import.preview.title') }}</h4>
            <div class="preview-card">
              <div class="flex items-start space-x-4">
                <a-avatar
                  :size="64"
                  shape="square"
                  :src="previewData.avatar"
                >
                  {{ previewData.name?.charAt(0) }}
                </a-avatar>
                <div class="flex-1">
                  <h5 class="font-medium theme-text-primary">{{ previewData.name }}</h5>
                  <p class="text-xs theme-text-secondary mt-1">
                    {{ previewData.age || t('character.import.preview.unknownAge') }} · {{ previewData.identity || t('character.import.preview.unknownIdentity') }}
                  </p>
                  <p class="text-sm theme-text-primary mt-2 line-clamp-2">
                    {{ previewData.description }}
                  </p>
                </div>
              </div>

              <div class="field-status mt-4 grid grid-cols-2 gap-2">
                <div class="field-item" :class="{ 'field-complete': previewData.personality }">
                  <span class="field-label">{{ t('character.import.preview.fields.personality') }}</span>
                  <CheckCircleOutlined v-if="previewData.personality" class="text-green-500" />
                  <CloseCircleOutlined v-else class="text-gray-400" />
                </div>
                <div class="field-item" :class="{ 'field-complete': previewData.appearance }">
                  <span class="field-label">{{ t('character.import.preview.fields.appearance') }}</span>
                  <CheckCircleOutlined v-if="previewData.appearance" class="text-green-500" />
                  <CloseCircleOutlined v-else class="text-gray-400" />
                </div>
                <div class="field-item" :class="{ 'field-complete': previewData.background }">
                  <span class="field-label">{{ t('character.import.preview.fields.background') }}</span>
                  <CheckCircleOutlined v-if="previewData.background" class="text-green-500" />
                  <CloseCircleOutlined v-else class="text-gray-400" />
                </div>
                <div class="field-item" :class="{ 'field-complete': previewData.skills }">
                  <span class="field-label">{{ t('character.import.preview.fields.skills') }}</span>
                  <CheckCircleOutlined v-if="previewData.skills" class="text-green-500" />
                  <CloseCircleOutlined v-else class="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </a-spin>
      </div>

      <div v-if="complete" class="import-actions mt-6 text-center">
        <a-space>
          <a-button @click="$emit('close')">{{ t('common.close') }}</a-button>
          <a-button type="primary" @click="$emit('view')">{{ t('character.import.actions.viewCharacter') }}</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  step: number
  statusText: string
  loading: boolean
  error: string
  previewData: any
  complete: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'view'): void
}

defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()
</script>

<style scoped>
.import-progress-content {
  min-height: 300px;
}

.import-status {
  padding: 20px;
  border-radius: 8px;
  background: var(--theme-bg-elevated);
}

.status-message {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--theme-text-primary);
  font-weight: 500;
}

.preview-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-container);
}

.field-status {
  padding-top: 12px;
  border-top: 1px solid var(--theme-border);
}

.field-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--theme-bg-elevated);
  font-size: 13px;
  color: var(--theme-text-secondary);
  transition: all 0.3s;
}

.field-item.field-complete {
  background: rgba(82, 196, 26, 0.1);
  color: var(--theme-text-primary);
}

.field-label {
  font-weight: 500;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
