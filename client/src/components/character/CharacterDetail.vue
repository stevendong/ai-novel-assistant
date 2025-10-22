<template>
  <div class="character-detail">
    <div v-if="!character" class="empty-state">
      <a-empty description="请选择一个角色" />
    </div>

    <div v-else class="detail-content">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-wrapper">
          <div class="header-main">
            <!-- Avatar -->
            <a-tooltip title="点击更换头像">
              <div class="avatar-wrapper" @click="$emit('changeAvatar')">
                <a-badge
                  :count="character.isLocked ? '锁' : 0"
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
                    {{ character.gender }}
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
              <a-tooltip title="AI分析角色并提供完善建议">
                <a-button
                  type="primary"
                  @click="$emit('enhance')"
                  :loading="enhancing"
                >
                  <template #icon><RobotOutlined /></template>
                  AI完善
                </a-button>
              </a-tooltip>

              <a-tooltip title="导出角色卡为PNG文件">
                <a-button @click="$emit('export')" :loading="exporting">
                  <template #icon><DownloadOutlined /></template>
                  导出角色卡
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
                      {{ character.isLocked ? '解锁角色' : '锁定角色' }}
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="$emit('delete')">
                      <DeleteOutlined /> 删除角色
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
          <a-tab-pane key="basic" tab="基本信息">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="角色姓名" required>
                  <a-input
                    v-model:value="formData.name"
                    placeholder="输入角色姓名"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="性别">
                  <a-select
                    v-model:value="formData.gender"
                    placeholder="选择性别"
                    :disabled="character.isLocked"
                    @change="handleChange"
                    allow-clear
                  >
                    <a-select-option value="男">男</a-select-option>
                    <a-select-option value="女">女</a-select-option>
                    <a-select-option value="其他">其他</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="年龄">
                  <a-input
                    v-model:value="formData.age"
                    placeholder="如：28岁"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="身份/职业">
                  <a-input
                    v-model:value="formData.identity"
                    placeholder="如：私人侦探"
                    :disabled="character.isLocked"
                    @change="handleChange"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="角色描述">
              <a-textarea
                v-model:value="formData.description"
                :rows="3"
                placeholder="简要描述角色的基本信息..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item label="外貌特征">
              <a-textarea
                v-model:value="formData.appearance"
                :rows="4"
                placeholder="详细描述角色的外貌特征..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>

          <!-- Personality Tab -->
          <a-tab-pane key="personality" tab="性格特征">
            <a-form-item label="性格特点">
              <a-textarea
                v-model:value="formData.personality"
                :rows="6"
                placeholder="描述角色的性格特点、行为习惯、说话方式等..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item label="核心价值观">
              <a-textarea
                v-model:value="formData.values"
                :rows="3"
                placeholder="角色的核心价值观和信念..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item label="恐惧与弱点">
              <a-textarea
                v-model:value="formData.fears"
                :rows="3"
                placeholder="角色害怕什么，有什么弱点..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>

          <!-- Background Tab -->
          <a-tab-pane key="background" tab="背景故事">
            <a-form-item label="个人背景">
              <a-textarea
                v-model:value="formData.background"
                :rows="8"
                placeholder="角色的成长经历、重要事件、人生转折点..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>

            <a-form-item label="技能与能力">
              <a-textarea
                v-model:value="formData.skills"
                :rows="3"
                placeholder="角色掌握的技能、特殊能力..."
                :disabled="character.isLocked"
                @change="handleChange"
              />
            </a-form-item>
          </a-tab-pane>
        </a-tabs>

        <div class="form-footer">
          <a-button type="primary" html-type="submit" :disabled="character.isLocked">
            保存修改
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
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { Character } from '@/types'

interface Props {
  character: Character | null
  enhancing?: boolean
  exporting?: boolean
}

interface Emits {
  (e: 'save', data: Partial<Character>): void
  (e: 'changeAvatar'): void
  (e: 'enhance'): void
  (e: 'export'): void
  (e: 'toggleLock'): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref('basic')
const formData = ref<Partial<Character>>({})

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
