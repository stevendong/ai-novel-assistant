<template>
  <div class="character-detail">
    <div v-if="!character" class="empty-state">
      <a-empty :description="t('character.detail.emptyState')" />
    </div>

    <div v-else class="detail-content">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-wrapper">
          <div class="header-main">
            <!-- Avatar -->
            <a-tooltip :title="t('character.detail.changeAvatar')">
              <div class="avatar-wrapper" @click="$emit('changeAvatar')">
                <a-badge
                  :count="character.isLocked ? t('character.detail.lockBadge') : 0"
                  :number-style="{ backgroundColor: '#ff4d4f' }"
                >
                  <a-avatar
                    :size="64"
                    shape="square"
                    :src="character.avatar"
                  >
                    {{ character.name?.charAt(0) }}
                  </a-avatar>
                </a-badge>
                <div class="avatar-overlay">
                  <UploadOutlined />
                </div>
              </div>
            </a-tooltip>

            <div class="header-info">
              <h1 class="header-title">{{ character.name }}</h1>
              <div class="header-meta">
                <a-space :size="8">
                  <span v-if="character.gender" class="meta-item">
                    {{ formatGender(character.gender) }}
                  </span>
                  <a-divider v-if="character.gender && character.age" type="vertical" />
                  <span v-if="character.age" class="meta-item">
                    {{ character.age }}
                  </span>
                  <a-divider v-if="(character.gender || character.age) && character.identity" type="vertical" />
                  <span v-if="character.identity" class="meta-item">
                    {{ character.identity }}
                  </span>
                </a-space>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="header-actions">
            <a-space :size="8" wrap>
              <a-tooltip :title="t('character.detail.chatTooltip')">
                <a-button
                  type="primary"
                  @click="$emit('startChat')"
                >
                  <template #icon><MessageOutlined /></template>
                  {{ t('character.detail.chatWithCharacter') }}
                </a-button>
              </a-tooltip>

              <a-tooltip :title="t('character.detail.enhanceTooltip')">
                <a-button
                  @click="$emit('enhance')"
                  :loading="enhancing"
                >
                  <template #icon><RobotOutlined /></template>
                  {{ t('character.detail.enhanceButton') }}
                </a-button>
              </a-tooltip>

              <a-tooltip :title="t('character.detail.exportTooltip')">
                <a-button @click="$emit('export')" :loading="exporting">
                  <template #icon><DownloadOutlined /></template>
                  {{ t('character.detail.exportButton') }}
                </a-button>
              </a-tooltip>

              <a-dropdown>
                <a-button>
                  <template #icon><MoreOutlined /></template>
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="lock" @click="$emit('toggleLock')">
                      <LockOutlined v-if="!character.isLocked" />
                      <UnlockOutlined v-else />
                      {{ character.isLocked ? t('character.detail.unlock') : t('character.detail.lock') }}
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="$emit('delete')">
                      <DeleteOutlined /> {{ t('character.detail.delete') }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </div>
        </div>
      </div>

      <!-- Form -->
      <a-form :model="formData" layout="vertical" @finish="handleSave">
        <a-tabs v-model:activeKey="activeTab" type="card">
          <!-- Basic Info Tab -->
          <a-tab-pane key="basic" :tab="t('character.detail.tabs.basic')">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item :label="t('character.detail.form.name')" required>
                  <a-input
                    v-model:value="formData.name"
                    :placeholder="t('character.detail.placeholders.name')"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item :label="t('character.detail.form.gender')">
                  <a-select
                    v-model:value="formData.gender"
                    :placeholder="t('character.detail.placeholders.gender')"
                    :disabled="character.isLocked"
                    @change="handleChange"
                    allow-clear
                  >
                    <a-select-option value="男">{{ t('character.gender.male') }}</a-select-option>
                    <a-select-option value="女">{{ t('character.gender.female') }}</a-select-option>
                    <a-select-option value="其他">{{ t('character.gender.other') }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item :label="t('character.detail.form.age')">
                  <a-input
                    v-model:value="formData.age"
                    :placeholder="t('character.detail.placeholders.age')"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item :label="t('character.detail.form.identity')">
                  <a-input
                    v-model:value="formData.identity"
                    :placeholder="t('character.detail.placeholders.identity')"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item :label="t('character.detail.form.description')">
              <a-textarea
                v-model:value="formData.description"
                :rows="3"
                :placeholder="t('character.detail.placeholders.description')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item :label="t('character.detail.form.appearance')">
              <a-textarea
                v-model:value="formData.appearance"
                :rows="4"
                :placeholder="t('character.detail.placeholders.appearance')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>

          <!-- Personality Tab -->
          <a-tab-pane key="personality" :tab="t('character.detail.tabs.personality')">
            <a-form-item :label="t('character.detail.form.personality')">
              <a-textarea
                v-model:value="formData.personality"
                :rows="6"
                :placeholder="t('character.detail.placeholders.personality')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item :label="t('character.detail.form.values')">
              <a-textarea
                v-model:value="formData.values"
                :rows="3"
                :placeholder="t('character.detail.placeholders.values')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item :label="t('character.detail.form.fears')">
              <a-textarea
                v-model:value="formData.fears"
                :rows="3"
                :placeholder="t('character.detail.placeholders.fears')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>

          <!-- Background Tab -->
          <a-tab-pane key="background" :tab="t('character.detail.tabs.background')">
            <a-form-item :label="t('character.detail.form.background')">
              <a-textarea
                v-model:value="formData.background"
                :rows="8"
                :placeholder="t('character.detail.placeholders.background')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item :label="t('character.detail.form.skills')">
              <a-textarea
                v-model:value="formData.skills"
                :rows="3"
                :placeholder="t('character.detail.placeholders.skills')"
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>
        </a-tabs>

        <div class="form-footer">
          <a-button type="primary" html-type="submit" :disabled="character.isLocked">
            {{ t('character.detail.save') }}
          </a-button>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UploadOutlined,
  RobotOutlined,
  DownloadOutlined,
  MoreOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  MessageOutlined
} from '@ant-design/icons-vue'
import type { Character } from '@/types'
import { useI18n } from 'vue-i18n'

interface Props {
  character: Character | null
  enhancing?: boolean
  exporting?: boolean
}

interface Emits {
  (e: 'save', data: Partial<Character>): void
  (e: 'changeAvatar'): void
  (e: 'startChat'): void
  (e: 'enhance'): void
  (e: 'export'): void
  (e: 'toggleLock'): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const activeTab = ref('basic')
const formData = ref<Partial<Character>>({})

const genderLabelMap: Record<string, string> = {
  male: 'character.gender.male',
  female: 'character.gender.female',
  other: 'character.gender.other',
  男: 'character.gender.male',
  女: 'character.gender.female',
  其他: 'character.gender.other'
}

const formatGender = (value?: string | null) => {
  if (!value) return ''
  const key = genderLabelMap[value]
  return key ? t(key) : value
}

// Watch character changes and update form data
watch(() => props.character, (newChar) => {
  if (newChar) {
    formData.value = {
      name: newChar.name,
      age: newChar.age,
      gender: newChar.gender,
      identity: newChar.identity,
      description: newChar.description,
      appearance: newChar.appearance,
      personality: newChar.personality,
      values: newChar.values,
      fears: newChar.fears,
      background: newChar.background,
      skills: newChar.skills,
    }
  }
}, { immediate: true })

const handleChange = () => {
  // Auto-save could be implemented here
}

const handleSave = () => {
  emit('save', formData.value)
}
</script>

<style scoped>
.character-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-container);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
  font-size: 20px;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text-primary);
}

.header-meta {
  margin-top: 4px;
  font-size: 14px;
  color: var(--theme-text-secondary);
}

.header-actions {
  flex-shrink: 0;
}

.detail-content :deep(.ant-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-content :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow-y: auto;
}

.detail-content :deep(.ant-tabs-content) {
  height: 100%;
  padding: 24px;
}

.form-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
  text-align: right;
}
</style>
