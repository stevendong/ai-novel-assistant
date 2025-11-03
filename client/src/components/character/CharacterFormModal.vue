<template>
  <a-modal
    :open="visible"
    :title="t('character.formModal.title')"
    width="800px"
    :maskClosable="false"
    @cancel="handleCancel"
  >
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">{{ t('common.cancel') }}</a-button>
        <a-button
          v-if="hasAIGeneration"
          @click="handleClearAI"
        >
          {{ t('character.formModal.clearAI') }}
        </a-button>
        <a-button
          type="primary"
          :loading="creating"
          @click="handleCreate"
          :disabled="!formData.name"
        >
          {{ t('character.formModal.create') }}
        </a-button>
      </a-space>
    </template>

    <div class="character-form">
      <a-tabs v-model:activeKey="activeTab">
        <!-- Manual Input Tab -->
        <a-tab-pane key="manual" :tab="t('character.formModal.tabs.manual')">
          <a-form :model="formData" layout="vertical">
            <a-form-item :label="t('character.formModal.form.name')" required>
              <a-input
                v-model:value="formData.name"
                :placeholder="t('character.formModal.placeholders.name')"
              />
            </a-form-item>

            <a-form-item :label="t('character.formModal.form.description')">
              <a-textarea
                v-model:value="formData.description"
                :rows="3"
                :placeholder="t('character.formModal.placeholders.description')"
              />
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- AI Generate Tab -->
        <a-tab-pane key="ai" :tab="t('character.formModal.tabs.ai')">
          <a-alert
            :message="t('character.formModal.aiAlert.title')"
            :description="t('character.formModal.aiAlert.description')"
            type="info"
            show-icon
            closable
            class="mb-4"
          />

          <a-form :model="aiForm" layout="vertical">
            <a-form-item :label="t('character.formModal.form.prompt')">
              <a-textarea
                v-model:value="aiForm.prompt"
                :rows="4"
                :placeholder="t('character.formModal.placeholders.prompt')"
              />
            </a-form-item>

            <a-form-item>
              <a-button
                type="primary"
                block
                :loading="generating"
                @click="handleGenerate"
                :disabled="!aiForm.prompt"
              >
                <template #icon><RobotOutlined /></template>
                {{ t('character.formModal.generate') }}
              </a-button>
            </a-form-item>
          </a-form>

          <!-- AI Generated Result -->
          <div v-if="aiResult" class="ai-result">
            <a-divider>{{ t('character.formModal.aiResult.title') }}</a-divider>

            <a-descriptions bordered :column="1" size="small">
              <a-descriptions-item :label="t('character.formModal.aiResult.name')">
                {{ aiResult.name }}
              </a-descriptions-item>
              <a-descriptions-item v-if="aiResult.gender" :label="t('character.formModal.aiResult.gender')">
                {{ aiResult.gender }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('character.formModal.aiResult.age')">
                {{ aiResult.age }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('character.formModal.aiResult.identity')">
                {{ aiResult.identity }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('character.formModal.aiResult.description')">
                {{ aiResult.description }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('character.formModal.aiResult.personality')">
                {{ aiResult.personality }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('character.formModal.aiResult.appearance')">
                {{ aiResult.appearance }}
              </a-descriptions-item>
            </a-descriptions>

            <a-alert
              v-if="aiResult.reasoning"
              :message="aiResult.reasoning"
              type="success"
              show-icon
              class="mt-4"
            />
          </div>
        </a-tab-pane>

        <!-- Import Tab -->
        <a-tab-pane key="import" :tab="t('character.formModal.tabs.import')">
          <a-alert
            :message="t('character.formModal.importAlert.title')"
            :description="t('character.formModal.importAlert.description')"
            type="info"
            show-icon
            closable
            class="mb-4"
          />

          <a-button
            type="primary"
            block
            @click="$emit('selectCard')"
          >
            <template #icon><UploadOutlined /></template>
            {{ t('character.formModal.selectFromLibrary') }}
          </a-button>
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RobotOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  creating?: boolean
  generating?: boolean
  aiResult?: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'create', data: any): void
  (e: 'generate', prompt: string): void
  (e: 'clearAI'): void
  (e: 'selectCard'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const activeTab = ref('manual')
const formData = ref({
  name: '',
  description: ''
})
const aiForm = ref({
  prompt: ''
})

const hasAIGeneration = computed(() => !!props.aiResult)

// Watch AI result and populate form
watch(() => props.aiResult, (result) => {
  if (result) {
    formData.value.name = result.name || ''
    formData.value.description = result.description || ''
  }
})

const handleCancel = () => {
  emit('update:visible', false)
  // Reset form
  formData.value = { name: '', description: '' }
  aiForm.value = { prompt: '' }
  activeTab.value = 'manual'
}

const handleCreate = () => {
  const data = hasAIGeneration.value
    ? props.aiResult
    : formData.value

  emit('create', data)
}

const handleGenerate = () => {
  emit('generate', aiForm.value.prompt)
}

const handleClearAI = () => {
  emit('clearAI')
  formData.value = { name: '', description: '' }
}
</script>

<style scoped>
.character-form {
  min-height: 300px;
}

.ai-result {
  margin-top: 20px;
}
</style>
