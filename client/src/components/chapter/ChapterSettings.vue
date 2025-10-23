<template>
  <div class="chapter-settings">
    <div class="settings-header">
      <div class="header-title">
        <h3>相关设定</h3>
        <a-tag v-if="settings.length > 0" color="purple">
          {{ settings.length }} 个设定
        </a-tag>
      </div>
      <a-button
        type="primary"
        @click="showAddModal = true"
      >
        <template #icon><PlusOutlined /></template>
        添加设定
      </a-button>
    </div>

    <!-- 设定列表 -->
    <a-list
      v-if="settings.length > 0"
      :data-source="settings"
      class="settings-list"
    >
      <template #renderItem="{ item }">
        <a-list-item class="setting-item">
          <a-list-item-meta
            :title="item.setting.name"
            :description="item.usage || item.setting.description || '暂无描述'"
          >
            <template #avatar>
              <a-avatar
                :size="48"
                :style="{ backgroundColor: getSettingTypeColor(item.setting.type) }"
                class="setting-avatar"
              >
                {{ getSettingTypeIcon(item.setting.type) }}
              </a-avatar>
            </template>
          </a-list-item-meta>

          <template #actions>
            <div class="setting-actions">
              <a-tag :color="getSettingTypeTagColor(item.setting.type)">
                {{ getSettingTypeLabel(item.setting.type) }}
              </a-tag>

              <a-tooltip title="编辑使用说明">
                <a-button
                  type="text"
                  size="small"
                  @click="handleEditUsage(item)"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>

              <a-popconfirm
                title="确定要移除这个设定吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleRemove(item.settingId)"
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
      description="暂无关联设定"
      class="empty-state"
    >
      <template #image>
        <GlobalOutlined style="font-size: 48px; color: #d9d9d9;" />
      </template>
      <a-button type="primary" @click="showAddModal = true">
        <template #icon><PlusOutlined /></template>
        添加第一个设定
      </a-button>
    </a-empty>

    <!-- 设定统计 -->
    <div v-if="settings.length > 0" class="settings-stats">
      <a-space :size="12">
        <span class="stat-item">
          <GlobalOutlined />
          世界观: {{ typeStats.worldview }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <EnvironmentOutlined />
          地点: {{ typeStats.location }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <FileProtectOutlined />
          规则: {{ typeStats.rule }}
        </span>
        <a-divider type="vertical" />
        <span class="stat-item">
          <ReadOutlined />
          文化: {{ typeStats.culture }}
        </span>
      </a-space>
    </div>

    <!-- 添加设定模态框 -->
    <a-modal
      v-model:open="showAddModal"
      title="添加设定到章节"
      :confirm-loading="loading"
      width="600px"
      @ok="handleAdd"
      @cancel="resetAddForm"
    >
      <a-form layout="vertical">
        <a-form-item
          label="选择设定"
          :validate-status="formError.setting ? 'error' : ''"
          :help="formError.setting"
        >
          <a-select
            v-model:value="selectedSettingId"
            placeholder="请选择要添加的设定"
            show-search
            option-filter-prop="label"
            :loading="loadingSettings"
            @change="formError.setting = ''"
          >
            <a-select-option
              v-for="setting in availableSettings"
              :key="setting.id"
              :value="setting.id"
              :label="setting.name"
            >
              <div class="setting-option">
                <a-avatar
                  :size="24"
                  :style="{ backgroundColor: getSettingTypeColor(setting.type) }"
                >
                  {{ getSettingTypeIcon(setting.type) }}
                </a-avatar>
                <span class="setting-name">{{ setting.name }}</span>
                <a-tag :color="getSettingTypeTagColor(setting.type)" size="small">
                  {{ getSettingTypeLabel(setting.type) }}
                </a-tag>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="使用说明（可选）">
          <a-textarea
            v-model:value="selectedUsage"
            placeholder="描述如何在本章节中使用这个设定..."
            :rows="4"
            :maxlength="500"
            show-count
          />
          <div class="usage-hint">
            <InfoCircleOutlined />
            说明如何在本章节中应用此设定，有助于保持内容一致性
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑使用说明模态框 -->
    <a-modal
      v-model:open="showEditUsageModal"
      title="编辑使用说明"
      :confirm-loading="loading"
      @ok="handleUpdateUsage"
      @cancel="resetEditForm"
    >
      <a-form layout="vertical">
        <a-form-item label="设定名称">
          <a-input
            :value="editingItem?.setting.name"
            disabled
          />
        </a-form-item>
        <a-form-item label="使用说明">
          <a-textarea
            v-model:value="editingUsage"
            placeholder="描述如何在本章节中使用这个设定..."
            :rows="4"
            :maxlength="500"
            show-count
          />
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
  EditOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  ReadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue'
import type { WorldSetting, ChapterSetting } from '@/types'
import { chapterService } from '@/services/chapterService'
import { api } from '@/utils/api'

interface Props {
  modelValue: ChapterSetting[]
  novelId: string
  chapterId: string
}

interface Emits {
  (e: 'update:modelValue', value: ChapterSetting[]): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 内部状态
const settings = ref<ChapterSetting[]>([])
const availableSettings = ref<WorldSetting[]>([])
const showAddModal = ref(false)
const showEditUsageModal = ref(false)
const selectedSettingId = ref<string>()
const selectedUsage = ref('')
const editingItem = ref<ChapterSetting | null>(null)
const editingUsage = ref('')
const loading = ref(false)
const loadingSettings = ref(false)
const formError = ref<{ setting?: string }>({})

// 监听外部数据变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      settings.value = [...newValue]
    }
  },
  { immediate: true, deep: true }
)

// 统计各设定类型数量
const typeStats = computed(() => {
  const stats = {
    worldview: 0,
    location: 0,
    rule: 0,
    culture: 0
  }

  settings.value.forEach(setting => {
    const type = setting.setting.type as keyof typeof stats
    if (type in stats) {
      stats[type]++
    }
  })

  return stats
})

// 获取设定类型颜色
const getSettingTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'worldview': '#1890ff',
    'location': '#52c41a',
    'rule': '#faad14',
    'culture': '#722ed1'
  }
  return colors[type] || '#1890ff'
}

// 获取设定类型图标
const getSettingTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'worldview': '世',
    'location': '地',
    'rule': '规',
    'culture': '文'
  }
  return icons[type] || '设'
}

// 获取设定类型标签颜色
const getSettingTypeTagColor = (type: string): string => {
  const colors: Record<string, string> = {
    'worldview': 'blue',
    'location': 'green',
    'rule': 'orange',
    'culture': 'purple'
  }
  return colors[type] || 'default'
}

// 获取设定类型标签文本
const getSettingTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'worldview': '世界观',
    'location': '地点',
    'rule': '规则',
    'culture': '文化'
  }
  return labels[type] || type
}

// 加载小说的所有设定
const loadAvailableSettings = async () => {
  loadingSettings.value = true
  try {
    const response = await api.get(`/api/settings/novel/${props.novelId}`)
    availableSettings.value = response.data
  } catch (error) {
    console.error('Failed to load settings:', error)
    message.error('加载设定列表失败')
  } finally {
    loadingSettings.value = false
  }
}

// 添加设定
const handleAdd = async () => {
  // 验证
  if (!selectedSettingId.value) {
    formError.value.setting = '请选择设定'
    return
  }

  loading.value = true
  try {
    await chapterService.addSettingToChapter(
      props.chapterId,
      selectedSettingId.value,
      selectedUsage.value
    )

    message.success('添加设定成功')
    showAddModal.value = false
    resetAddForm()

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to add setting:', error)
    message.error('添加设定失败')
  } finally {
    loading.value = false
  }
}

// 编辑使用说明
const handleEditUsage = (item: ChapterSetting) => {
  editingItem.value = item
  editingUsage.value = item.usage || ''
  showEditUsageModal.value = true
}

// 更新使用说明
const handleUpdateUsage = async () => {
  if (!editingItem.value) return

  loading.value = true
  try {
    await chapterService.updateSettingUsage(
      props.chapterId,
      editingItem.value.settingId,
      editingUsage.value
    )

    message.success('更新使用说明成功')
    showEditUsageModal.value = false
    resetEditForm()

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to update setting usage:', error)
    message.error('更新失败')
  } finally {
    loading.value = false
  }
}

// 移除设定
const handleRemove = async (settingId: string) => {
  try {
    await chapterService.removeSettingFromChapter(props.chapterId, settingId)
    message.success('移除设定成功')

    // 通知父组件刷新数据
    emit('refresh')
  } catch (error) {
    console.error('Failed to remove setting:', error)
    message.error('移除设定失败')
  }
}

// 重置添加表单
const resetAddForm = () => {
  selectedSettingId.value = undefined
  selectedUsage.value = ''
  formError.value = {}
}

// 重置编辑表单
const resetEditForm = () => {
  editingItem.value = null
  editingUsage.value = ''
}

// 加载数据
onMounted(() => {
  loadAvailableSettings()
})

// 当模态框打开时，刷新可用设定列表
watch(showAddModal, (newValue) => {
  if (newValue) {
    loadAvailableSettings()
  }
})
</script>

<style scoped>
.chapter-settings {
  width: 100%;
}

/* Header */
.settings-header {
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

/* Settings List */
.settings-list {
  background: transparent;
  margin-bottom: 16px;
}

.setting-item {
  padding: 16px !important;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.setting-item:hover {
  border-color: var(--theme-primary);
  box-shadow: 0 2px 8px rgba(114, 46, 209, 0.1);
}

.setting-avatar {
  font-weight: 600;
  font-size: 18px;
}

.setting-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
.settings-stats {
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
.setting-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.setting-name {
  font-weight: 500;
  margin-right: 8px;
  flex: 1;
}

.usage-hint {
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
  .settings-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
}
</style>
