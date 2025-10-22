<template>
  <div class="character-list">
    <!-- 搜索栏 -->
    <div class="list-header">
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索角色名称、描述..."
        @search="handleSearch"
        style="margin-bottom: 12px"
      />
      <a-button type="primary" block @click="handleAddCharacter">
        <template #icon><PlusOutlined /></template>
        新建角色
      </a-button>
    </div>

    <!-- 角色列表 -->
    <div class="character-items">
      <div
        v-for="character in characters"
        :key="character.id"
        class="character-item"
        :class="{ active: selectedId === character.id }"
        @click="handleSelectCharacter(character)"
      >
        <a-avatar
          :size="40"
          :src="character.avatar"
          class="character-avatar"
        >
          {{ character.name?.charAt(0) }}
        </a-avatar>
        <div class="character-info">
          <div class="character-name">
            {{ character.name }}
            <LockOutlined v-if="character.isLocked" class="lock-icon" />
          </div>
          <div v-if="character.gender || character.age || character.identity" class="character-meta">
            <span v-if="character.gender">{{ character.gender }}</span>
            <span v-if="character.gender && character.age"> · </span>
            <span v-if="character.age">{{ character.age }}</span>
            <span v-if="(character.gender || character.age) && character.identity"> · </span>
            <span v-if="character.identity">{{ character.identity }}</span>
          </div>
          <div class="character-desc">
            {{ character.description || '暂无描述' }}
          </div>
        </div>
      </div>

      <a-empty
        v-if="characters.length === 0"
        description="暂无角色"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Empty } from 'ant-design-vue'
import { PlusOutlined, LockOutlined } from '@ant-design/icons-vue'
import type { Character } from '@/types'

interface Props {
  characters: Character[]
  selectedId?: string
}

interface Emits {
  (e: 'select', character: Character): void
  (e: 'add'): void
  (e: 'search', query: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const searchText = ref('')

const handleSearch = (value: string) => {
  emit('search', value)
}

const handleSelectCharacter = (character: Character) => {
  emit('select', character)
}

const handleAddCharacter = () => {
  emit('add')
}
</script>

<style scoped>
.character-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--theme-bg-container);
  border-right: 1px solid var(--theme-border);
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid var(--theme-border);
}

.character-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.character-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--theme-bg-elevated);
  border: 1px solid transparent;
}

.character-item:hover {
  background: var(--theme-bg-hover);
  border-color: var(--theme-border);
}

.character-item.active {
  background: var(--theme-primary-bg);
  border-color: var(--theme-primary);
}

.character-avatar {
  flex-shrink: 0;
  background: var(--theme-primary);
}

.character-info {
  flex: 1;
  min-width: 0;
}

.character-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: var(--theme-text-primary);
  margin-bottom: 4px;
}

.lock-icon {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.character-meta {
  font-size: 11px;
  color: var(--theme-text-tertiary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-desc {
  font-size: 12px;
  color: var(--theme-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
