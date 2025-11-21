<template>
  <div class="chapter-characters">
    <div class="characters-header">
      <div class="header-title">
        <h3>{{ t('chapterEditor.characters.title') }}</h3>
        <a-tag v-if="characters.length > 0" color="blue">
          {{ t('chapterEditor.characters.count', { count: characters.length }) }}
        </a-tag>
      </div>
      <a-button
        type="primary"
        @click="showAddModal = true"
      >
        <template #icon><PlusOutlined /></template>
        {{ t('chapterEditor.characters.add') }}
      </a-button>
    </div>

    <!-- 角色列表 -->
    <a-list
      v-if="characters.length > 0"
      :data-source="characters"
      class="characters-list"
    >
      <template #renderItem="{ item }">
        <a-list-item class="character-item">
          <a-list-item-meta
            :title="item.character.name"
            :description="item.character.description || t('chapterEditor.characters.noDescription')"
          >
            <template #avatar>
              <a-avatar
                :size="48"
                :src="item.character.avatar"
                class="character-avatar"
              >
                {{ item.character.name?.charAt(0) }}
              </a-avatar>
            </template>
          </a-list-item-meta>

          <template #actions>
            <div class="character-actions">
              <a-select
                v-model:value="item.role"
                class="role-select"
                @change="handleRoleChange(item)"
              >
                <a-select-option value="main">
                  <UserOutlined /> {{ getRoleLabel('main') }}
                </a-select-option>
                <a-select-option value="supporting">
                  <TeamOutlined /> {{ getRoleLabel('supporting') }}
                </a-select-option>
                <a-select-option value="mentioned">
                  <CommentOutlined /> {{ getRoleLabel('mentioned') }}
                </a-select-option>
              </a-select>

              <a-popconfirm
                :title="t('chapterEditor.characters.actions.removeConfirm')"
                :ok-text="t('common.confirm')"
                :cancel-text="t('common.cancel')"
                @confirm="handleRemove(item.characterId)"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                >
                  <template #icon><DeleteOutlined /></template>
                  {{ t('chapterEditor.characters.actions.remove') }}
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- 空状态 -->
    <a-empty
      v-else
      :description="t('chapterEditor.characters.empty')"
      class="empty-state"
    >
      <template #image>
        <UserOutlined style="font-size: 48px; color: #d9d9d9;" />
      </template>
      <a-button type="primary" @click="showAddModal = true">
        <template #icon><PlusOutlined /></template>
        {{ t('chapterEditor.characters.addFirst') }}
      </a-button>
    </a-empty>

    <!-- 角色统计 -->
    <div v-if="characters.length > 0" class="characters-stats">
      <a-space :size="12">
        <span class="stat-item">
          <UserOutlined />
          {{ getRoleLabel('main') }}: {{ roleStats.main }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <TeamOutlined />
          {{ getRoleLabel('supporting') }}: {{ roleStats.supporting }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <CommentOutlined />
          {{ getRoleLabel('mentioned') }}: {{ roleStats.mentioned }}
        </span>
      </a-space>
    </div>

    <!-- 添加角色模态框 -->
    <a-modal
      v-model:open="showAddModal"
      :title="t('chapterEditor.characters.modal.title')"
      :confirm-loading="loading"
      @ok="handleAdd"
      @cancel="resetAddForm"
    >
      <a-form layout="vertical">
        <a-form-item
          :label="t('chapterEditor.characters.modal.selectLabel')"
          :validate-status="formError.character ? 'error' : ''"
          :help="formError.character"
        >
          <a-select
            v-model:value="selectedCharacterId"
            :placeholder="t('chapterEditor.characters.modal.selectPlaceholder')"
            show-search
            option-filter-prop="label"
            :loading="loadingCharacters"
            @change="formError.character = ''"
          >
            <a-select-option
              v-for="char in availableCharacters"
              :key="char.id"
              :value="char.id"
              :label="char.name"
            >
              <div class="character-option">
                <a-avatar :size="24" :src="char.avatar">
                  {{ char.name?.charAt(0) }}
                </a-avatar>
                <span class="character-name">{{ char.name }}</span>
                <span class="character-desc">{{ char.description || t('chapterEditor.characters.noDescription') }}</span>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('chapterEditor.characters.modal.roleLabel')">
          <a-radio-group v-model:value="selectedRole" button-style="solid">
            <a-radio-button value="main">
              <UserOutlined /> {{ t('chapterEditor.characters.roles.mainFull') }}
            </a-radio-button>
            <a-radio-button value="supporting">
              <TeamOutlined /> {{ t('chapterEditor.characters.roles.supportingFull') }}
            </a-radio-button>
            <a-radio-button value="mentioned">
              <CommentOutlined /> {{ t('chapterEditor.characters.roles.mentionedFull') }}
            </a-radio-button>
          </a-radio-group>
          <div class="role-hint">
            <InfoCircleOutlined />
            <span v-if="selectedRole === 'main'">{{ t('chapterEditor.characters.hints.main') }}</span>
            <span v-else-if="selectedRole === 'supporting'">{{ t('chapterEditor.characters.hints.supporting') }}</span>
            <span v-else>{{ t('chapterEditor.characters.hints.mentioned') }}</span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CommentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue'
import type { Character, ChapterCharacter } from '@/types'
import { chapterService } from '@/services/chapterService'
import { api } from '@/utils/api'

interface Props {
  modelValue: ChapterCharacter[]
  novelId: string
  chapterId: string
}

interface Emits {
  (e: 'update:modelValue', value: ChapterCharacter[]): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// 内部状态
const characters = ref<ChapterCharacter[]>([])
const availableCharacters = ref<Character[]>([])
const showAddModal = ref(false)
const selectedCharacterId = ref<string>()
const selectedRole = ref<'main' | 'supporting' | 'mentioned'>('mentioned')
const loading = ref(false)
const loadingCharacters = ref(false)
const formError = ref<{ character?: string }>({})

// 监听外部数据变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      characters.value = [...newValue]
    }
  },
  { immediate: true, deep: true }
)

// 统计各角色类型数量
const roleStats = computed(() => {
  const stats = {
    main: 0,
    supporting: 0,
    mentioned: 0
  }

  characters.value.forEach(char => {
    if (char.role in stats) {
      stats[char.role as keyof typeof stats]++
    }
  })

  return stats
})

const getRoleLabel = (role: string) => {
  const key = `chapterEditor.characters.roles.${role}`
  const translated = t(key)
  return translated === key ? role : translated
}

// 过滤已添加的角色（暂时未使用，但保留以便将来优化）
const availableCharactersFiltered = computed(() => {
  const addedIds = new Set(characters.value.map(c => c.characterId))
  return availableCharacters.value.filter(c => !addedIds.has(c.id))
})

// 加载小说的所有角色
const loadAvailableCharacters = async () => {
  loadingCharacters.value = true
  try {
    const response = await api.get(`/api/characters/novel/${props.novelId}`)
    availableCharacters.value = response.data
  } catch (error) {
    console.error('Failed to load characters:', error)
    message.error(t('chapterEditor.characters.messages.loadFailed'))
  } finally {
    loadingCharacters.value = false
  }
}

// 添加角色
const handleAdd = async () => {
  // 验证
  if (!selectedCharacterId.value) {
    formError.value.character = t('chapterEditor.characters.formErrors.selectCharacter')
    return
  }

  loading.value = true
  try {
    await chapterService.addCharacterToChapter(
      props.chapterId,
      selectedCharacterId.value,
      selectedRole.value
    )

    message.success(t('chapterEditor.characters.messages.addSuccess'))
    showAddModal.value = false
    resetAddForm()

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to add character:', error)
    message.error(t('chapterEditor.characters.messages.addFailed'))
  } finally {
    loading.value = false
  }
}

// 更改角色类型
const handleRoleChange = async (item: ChapterCharacter) => {
  try {
    await chapterService.updateCharacterRole(
      props.chapterId,
      item.characterId,
      item.role
    )
    message.success(t('chapterEditor.characters.messages.updateRoleSuccess'))
  } catch (error) {
    console.error('Failed to update character role:', error)
    message.error(t('chapterEditor.characters.messages.updateFailed'))
    // 刷新数据恢复原状
    emit('refresh')
  }
}

// 移除角色
const handleRemove = async (characterId: string) => {
  try {
    await chapterService.removeCharacterFromChapter(props.chapterId, characterId)
    message.success(t('chapterEditor.characters.messages.removeSuccess'))

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to remove character:', error)
    message.error(t('chapterEditor.characters.messages.removeFailed'))
  }
}

// 重置添加表单
const resetAddForm = () => {
  selectedCharacterId.value = undefined
  selectedRole.value = 'mentioned'
  formError.value = {}
}

// 加载数据
onMounted(() => {
  loadAvailableCharacters()
})

// 当模态框打开时，刷新可用角色列表
watch(showAddModal, (newValue) => {
  if (newValue) {
    loadAvailableCharacters()
  }
})
</script>

<style scoped>
.chapter-characters {
  width: 100%;
}

/* Header */
.characters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--theme-border);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text);
}

/* Characters List */
.characters-list {
  background: transparent;
  margin-bottom: 16px;
}

.character-item {
  padding: 16px !important;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.character-item:hover {
  border-color: var(--theme-primary);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.character-avatar {
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
  font-weight: 600;
}

.character-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-select {
  min-width: 110px;
}

/* Empty State */
.empty-state {
  padding: 48px 24px;
  background: var(--theme-bg-container);
  border: 1px dashed var(--theme-border);
  border-radius: 8px;
  margin-bottom: 16px;
}

/* Stats */
.characters-stats {
  padding: 12px 16px;
  background: var(--theme-bg-base);
  border-radius: 6px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Modal Content */
.character-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.character-name {
  font-weight: 500;
  margin-right: 8px;
}

.character-desc {
  color: var(--theme-text-tertiary);
  font-size: 12px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--theme-bg-base);
  border-radius: 4px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .characters-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .character-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .role-select {
    width: 100%;
  }
}
</style>
