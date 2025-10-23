<template>
  <div class="chapter-characters">
    <div class="characters-header">
      <div class="header-title">
        <h3>相关角色</h3>
        <a-tag v-if="characters.length > 0" color="blue">
          {{ characters.length }} 个角色
        </a-tag>
      </div>
      <a-button
        type="primary"
        @click="showAddModal = true"
      >
        <template #icon><PlusOutlined /></template>
        添加角色
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
            :description="item.character.description || '暂无描述'"
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
                  <UserOutlined /> 主要
                </a-select-option>
                <a-select-option value="supporting">
                  <TeamOutlined /> 配角
                </a-select-option>
                <a-select-option value="mentioned">
                  <CommentOutlined /> 提及
                </a-select-option>
              </a-select>

              <a-popconfirm
                title="确定要移除这个角色吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleRemove(item.characterId)"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                >
                  <template #icon><DeleteOutlined /></template>
                  移除
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
      description="暂无关联角色"
      class="empty-state"
    >
      <template #image>
        <UserOutlined style="font-size: 48px; color: #d9d9d9;" />
      </template>
      <a-button type="primary" @click="showAddModal = true">
        <template #icon><PlusOutlined /></template>
        添加第一个角色
      </a-button>
    </a-empty>

    <!-- 角色统计 -->
    <div v-if="characters.length > 0" class="characters-stats">
      <a-space :size="12">
        <span class="stat-item">
          <UserOutlined />
          主要: {{ roleStats.main }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <TeamOutlined />
          配角: {{ roleStats.supporting }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <CommentOutlined />
          提及: {{ roleStats.mentioned }}
        </span>
      </a-space>
    </div>

    <!-- 添加角色模态框 -->
    <a-modal
      v-model:open="showAddModal"
      title="添加角色到章节"
      :confirm-loading="loading"
      @ok="handleAdd"
      @cancel="resetAddForm"
    >
      <a-form layout="vertical">
        <a-form-item
          label="选择角色"
          :validate-status="formError.character ? 'error' : ''"
          :help="formError.character"
        >
          <a-select
            v-model:value="selectedCharacterId"
            placeholder="请选择要添加的角色"
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
                <span class="character-desc">{{ char.description }}</span>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="在本章节中的角色">
          <a-radio-group v-model:value="selectedRole" button-style="solid">
            <a-radio-button value="main">
              <UserOutlined /> 主要角色
            </a-radio-button>
            <a-radio-button value="supporting">
              <TeamOutlined /> 配角
            </a-radio-button>
            <a-radio-button value="mentioned">
              <CommentOutlined /> 仅提及
            </a-radio-button>
          </a-radio-group>
          <div class="role-hint">
            <InfoCircleOutlined />
            <span v-if="selectedRole === 'main'">主要角色会在章节中占据核心位置</span>
            <span v-else-if="selectedRole === 'supporting'">配角会在章节中有一定戏份</span>
            <span v-else>仅提及的角色只会被简单提到</span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
    message.error('加载角色列表失败')
  } finally {
    loadingCharacters.value = false
  }
}

// 添加角色
const handleAdd = async () => {
  // 验证
  if (!selectedCharacterId.value) {
    formError.value.character = '请选择角色'
    return
  }

  loading.value = true
  try {
    await chapterService.addCharacterToChapter(
      props.chapterId,
      selectedCharacterId.value,
      selectedRole.value
    )

    message.success('添加角色成功')
    showAddModal.value = false
    resetAddForm()

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to add character:', error)
    message.error('添加角色失败')
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
    message.success('更新角色类型成功')
  } catch (error) {
    console.error('Failed to update character role:', error)
    message.error('更新失败')
    // 刷新数据恢复原状
    emit('refresh')
  }
}

// 移除角色
const handleRemove = async (characterId: string) => {
  try {
    await chapterService.removeCharacterFromChapter(props.chapterId, characterId)
    message.success('移除角色成功')

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to remove character:', error)
    message.error('移除角色失败')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
