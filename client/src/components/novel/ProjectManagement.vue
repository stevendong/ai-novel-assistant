<template>
  <div class="h-full p-6 overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold theme-text-primary">{{ $t('project.managementTitle') }}</h1>
        <a-space>
          <a-button type="primary" @click="showNewProjectModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            {{ $t('project.createNew') }}
          </a-button>
          <a-button v-if="authStore.isAdmin" @click="importProject">
            <template #icon>
              <ImportOutlined />
            </template>
            {{ $t('project.import') }}
          </a-button>
        </a-space>
      </div>

      <!-- Current Project Info -->
      <a-card v-if="projectStore.currentProject" class="mb-6" :title="$t('project.currentProject')">
        <template #extra>
          <a-space>
            <a-button size="small" @click="showExportModal = true">
              <template #icon>
                <ExportOutlined />
              </template>
              {{ $t('common.export') }}
            </a-button>
            <a-button size="small" @click="openEditProject">
              <template #icon>
                <EditOutlined />
              </template>
              {{ $t('common.edit') }}
            </a-button>
            <a-button size="small" danger @click="deleteProject">
              <template #icon>
                <DeleteOutlined />
              </template>
              {{ $t('common.delete') }}
            </a-button>
          </a-space>
        </template>

        <a-row :gutter="[16, 16]">
          <a-col :span="12">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item :label="$t('project.projectName')">
                {{ projectStore.currentProject.title }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.genre')">
                {{ projectStore.currentProject.genre }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.rating')">
                <a-tag :color="getRatingColor(projectStore.currentProject.rating)">
                  {{ projectStore.currentProject.rating }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item :label="$t('common.status')">
                <a-tag :color="getStatusColor(projectStore.currentProject.status)">
                  {{ getStatusText(projectStore.currentProject.status) }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
          <a-col :span="12">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item :label="$t('project.createdAt')">
                {{ formatDate(projectStore.currentProject.createdAt) }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.updatedAt')">
                {{ formatDate(projectStore.currentProject.updatedAt) }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.chapterCount')">
                {{ chaptersCount }}
              </a-descriptions-item>
              <a-descriptions-item :label="$t('project.characterCount')">
                {{ charactersCount }}
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
        </a-row>

        <div class="mt-4">
          <h4 class="text-sm font-medium theme-text-primary mb-2">{{ $t('project.description') }}</h4>
          <p class="theme-text-secondary text-sm leading-relaxed">
            {{ projectStore.currentProject.description }}
          </p>
        </div>
      </a-card>

      <!-- Recent Projects -->
      <a-card class="mb-6">
        <template #title>
          <div class="flex items-center justify-between">
            <span>{{ $t('project.recentProjects') }}</span>
            <div class="flex items-center gap-2">
              <a-tag v-if="recentProjects.length > 5" color="blue">
                {{ showAllRecent ? `${$t('common.showAll')} ${recentProjects.length}` : `${$t('common.showAll')} 5 / ${recentProjects.length}` }}
              </a-tag>
              <a-button
                v-if="recentProjects.length > 5"
                type="link"
                size="small"
                @click="toggleShowAllRecent"
              >
                {{ showAllRecent ? $t('common.collapse') : $t('common.viewAll') }}
              </a-button>
            </div>
          </div>
        </template>
        <a-list :data-source="recentProjectsLimited" class="w-full">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-button type="text" size="small" @click="openProject(item)">
                  {{ $t('common.open') }}
                </a-button>
                <a-button type="text" size="small" @click="duplicateProject(item)">
                  {{ $t('common.duplicate') }}
                </a-button>
              </template>
              
              <a-list-item-meta>
                <template #title>
                  <span class="theme-text-primary">{{ item.title }}</span>
                  <a-tag size="small" class="ml-2" :color="getStatusColor(item.status)">
                    {{ getStatusText(item.status) }}
                  </a-tag>
                </template>
                <template #description>
                  <div class="text-sm theme-text-secondary">
                    {{ item.description }}
                    <br>
                    <span class="text-xs">
                      {{ formatDate(item.updatedAt) }} · {{ item.genre }}
                    </span>
                  </div>
                </template>
                <template #avatar>
                  <a-avatar shape="square" :style="{ backgroundColor: getProjectColor(item.id) }">
                    {{ item.title.charAt(0) }}
                  </a-avatar>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <!-- Project Statistics -->
      <a-row :gutter="16">
        <a-col :span="8">
          <a-card size="small">
            <a-statistic
              :title="$t('project.totalProjects')"
              :value="totalProjects"
              :prefix="h(BookOutlined)"
            />
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card size="small">
            <a-statistic
              :title="$t('project.inProgress')"
              :value="inProgressProjects"
              :prefix="h(EditOutlined)"
              :value-style="{ color: '#3f8600' }"
            />
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card size="small">
            <a-statistic
              :title="$t('project.completed')"
              :value="completedProjects"
              :prefix="h(CheckCircleOutlined)"
              :value-style="{ color: '#cf1322' }"
            />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- New Project Modal -->
    <a-modal
      v-model:open="showNewProjectModal"
      :title="$t('project.createNewModalTitle')"
      width="600px"
      @ok="createNewProject"
      :confirm-loading="loading"
    >
      <a-form :model="newProject" layout="vertical" ref="newFormRef">
        <a-form-item
          :label="$t('project.projectName')"
          name="title"
          :rules="[{ required: true, message: t('project.enterTitleRequired'), trigger: 'blur' }]"
        >
          <a-input v-model:value="newProject.title" :placeholder="$t('project.enterTitle')" />
        </a-form-item>

        <a-form-item :label="$t('project.projectDescription')">
          <a-textarea
            v-model:value="newProject.description"
            :rows="3"
            :placeholder="$t('project.descriptionPlaceholder')"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="$t('project.genre')">
              <a-select v-model:value="newProject.genre" :placeholder="$t('project.selectGenre')">
                <a-select-option value="奇幻">{{ $t('genre.fantasy') }}</a-select-option>
                <a-select-option value="科幻">{{ $t('genre.scifi') }}</a-select-option>
                <a-select-option value="现实">{{ $t('genre.realistic') }}</a-select-option>
                <a-select-option value="历史">{{ $t('genre.historical') }}</a-select-option>
                <a-select-option value="悬疑">{{ $t('genre.mystery') }}</a-select-option>
                <a-select-option value="言情">{{ $t('genre.romance') }}</a-select-option>
                <a-select-option value="武侠">{{ $t('genre.wuxia') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('project.rating')">
              <a-select v-model:value="newProject.rating" :placeholder="$t('project.selectRating')">
                <a-select-option value="G">{{ $t('rating.g') }}</a-select-option>
                <a-select-option value="PG">{{ $t('rating.pg') }}</a-select-option>
                <a-select-option value="PG-13">{{ $t('rating.pg13') }}</a-select-option>
                <a-select-option value="R">{{ $t('rating.r') }}</a-select-option>
                <a-select-option value="NC-17">{{ $t('rating.nc17') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item :label="$t('project.targetWordCount')">
          <a-input-number
            v-model:value="newProject.targetWordCount"
            :min="1000"
            :max="10000000"
            :step="1000"
            style="width: 100%"
            :placeholder="$t('project.targetWordCountPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Import Modal -->
    <ImportModal
      v-model:open="showImportModal"
      :available-novels="projectStore.projects"
      @success="handleImportSuccess"
    />

    <!-- Export Modal -->
    <ExportModal
      v-model:visible="showExportModal"
      :novel-id="projectStore.currentProject?.id || ''"
      :chapters="currentProjectChapters"
      :novel="projectStore.currentProject || undefined"
      hide-mdx
      @success="handleExportSuccess"
    />

    <!-- Edit Project Modal -->
    <a-modal
      v-model:open="showEditProjectModal"
      :title="$t('project.editModalTitle')"
      width="600px"
      @ok="updateProject"
      :confirm-loading="loading"
    >
      <a-form :model="editProject" layout="vertical" ref="editFormRef">
        <a-form-item
          :label="$t('project.projectName')"
          name="title"
          :rules="[{ required: true, message: t('project.enterTitleRequired'), trigger: 'blur' }]"
        >
          <a-input v-model:value="editProject.title" :placeholder="$t('project.enterTitle')" />
        </a-form-item>

        <a-form-item :label="$t('project.projectDescription')">
          <a-textarea
            v-model:value="editProject.description"
            :rows="3"
            :placeholder="$t('project.descriptionPlaceholder')"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="$t('project.genre')">
              <a-select v-model:value="editProject.genre" :placeholder="$t('project.selectGenre')">
                <a-select-option value="奇幻">{{ $t('genre.fantasy') }}</a-select-option>
                <a-select-option value="科幻">{{ $t('genre.scifi') }}</a-select-option>
                <a-select-option value="现实">{{ $t('genre.realistic') }}</a-select-option>
                <a-select-option value="历史">{{ $t('genre.historical') }}</a-select-option>
                <a-select-option value="悬疑">{{ $t('genre.mystery') }}</a-select-option>
                <a-select-option value="言情">{{ $t('genre.romance') }}</a-select-option>
                <a-select-option value="武侠">{{ $t('genre.wuxia') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('project.rating')">
              <a-select v-model:value="editProject.rating" :placeholder="$t('project.selectRating')">
                <a-select-option value="G">{{ $t('rating.g') }}</a-select-option>
                <a-select-option value="PG">{{ $t('rating.pg') }}</a-select-option>
                <a-select-option value="PG-13">{{ $t('rating.pg13') }}</a-select-option>
                <a-select-option value="R">{{ $t('rating.r') }}</a-select-option>
                <a-select-option value="NC-17">{{ $t('rating.nc17') }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item :label="$t('project.targetWordCount')">
          <a-input-number
            v-model:value="editProject.targetWordCount"
            :min="1000"
            :max="10000000"
            :step="1000"
            style="width: 100%"
            :placeholder="$t('project.targetWordCountPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import type { Novel, ProjectOverviewStats } from '@/types'
import { novelService } from '@/services/novelService'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { getNovelStatusText, getNovelStatusColor } from '@/constants/status'
import ImportModal from '@/components/ImportModal.vue'
import ExportModal from '@/components/novel/ExportModal.vue'

const { t } = useI18n()

// 全局作品状态
const projectStore = useProjectStore()
const authStore = useAuthStore()

// 响应式数据
const recentProjects = ref<Novel[]>([])
const projectStats = ref<ProjectOverviewStats | null>(null)
const loading = ref(false)
const showNewProjectModal = ref(false)
const showEditProjectModal = ref(false)
const showImportModal = ref(false)
const showExportModal = ref(false)
const showAllRecent = ref(false)
const newFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const newProject = ref({
  title: '',
  description: '',
  genre: '',
  rating: 'PG-13' as const,
  targetWordCount: 100000
})
const editProject = ref({
  title: '',
  description: '',
  genre: '',
  rating: 'PG-13' as const,
  targetWordCount: 100000
})

// 计算属性
const chaptersCount = computed(() => projectStore.currentProject?._count?.chapters || 0)
const charactersCount = computed(() => projectStore.currentProject?._count?.characters || 0)
const currentProjectChapters = computed(() => projectStore.currentProject?.chapters || [])
const totalProjects = computed(() => projectStats.value?.projects.total || 0)
const inProgressProjects = computed(() => projectStats.value?.projects.writing || 0)
const completedProjects = computed(() => projectStats.value?.projects.completed || 0)

// 限制最近作品显示数量为5个（如果showAllRecent为false）
const recentProjectsLimited = computed(() => {
  return showAllRecent.value ? recentProjects.value : recentProjects.value.slice(0, 5)
})

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    const [stats] = await Promise.all([
      novelService.getProjectStats(),
      projectStore.loadProjects()
    ])
    
    projectStats.value = stats
    
    // 设置最近作品列表（排除当前作品）
    if (projectStore.currentProject) {
      recentProjects.value = projectStore.projects.filter(n => n.id !== projectStore.currentProject!.id)
    } else {
      recentProjects.value = projectStore.projects
    }
  } catch (error) {
    console.error('Failed to load project data:', error)
    message.error(t('project.loadFailure'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getRatingColor = (rating: string) => {
  const colors = {
    'G': 'green',
    'PG': 'blue',
    'PG-13': 'orange',
    'R': 'red',
    'NC-17': 'purple'
  }
  return colors[rating as keyof typeof colors] || 'default'
}

const getStatusColor = (status: string) => {
  return getNovelStatusColor(status)
}

const getStatusText = (status: string) => {
  return getNovelStatusText(status)
}

const getProjectColor = (id: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
  return colors[parseInt(id) % colors.length]
}

// Actions
const openEditProject = () => {
  if (!projectStore.currentProject) return
  
  // 用当前作品数据填充编辑表单
  editProject.value = {
    title: projectStore.currentProject.title,
    description: projectStore.currentProject.description || '',
    genre: projectStore.currentProject.genre || '',
    rating: projectStore.currentProject.rating as any,
    targetWordCount: projectStore.currentProject.targetWordCount || 100000
  }
  
  showEditProjectModal.value = true
}

const deleteProject = async () => {
  if (!projectStore.currentProject) return

  try {
    await novelService.deleteNovel(projectStore.currentProject.id)
    projectStore.removeProject(projectStore.currentProject.id)
    message.success(t('project.deleteSuccess'))
    await loadData() // 重新加载数据
  } catch (error) {
    console.error('Failed to delete project:', error)
    message.error(t('project.deleteFailure'))
  }
}

const openProject = (project: Novel) => {
  // 通过全局store切换作品（会刷新页面）
  projectStore.switchProject(project.id)
}

const duplicateProject = async (project: Novel) => {
  try {
    const duplicated = await novelService.duplicateNovel(project.id, `${project.title} (副本)`)
    message.success(t('project.duplicateSuccess'))
    await loadData() // 重新加载数据
  } catch (error) {
    console.error('Failed to duplicate project:', error)
    message.error(t('project.duplicateFailure'))
  }
}

const importProject = () => {
  showImportModal.value = true
}

const handleImportSuccess = async (data: any) => {
  try {
    if (data.id) {
      projectStore.addProject(data)
      message.success(t('project.importSuccess') || 'Import successful!')
    }
    await loadData()
  } catch (error) {
    console.error('Failed to handle import:', error)
  }
}

const handleExportSuccess = async () => {
  try {
    message.success(t('export.success'))
  } catch (error) {
    console.error('Failed to handle export success:', error)
  }
}

const toggleShowAllRecent = () => {
  showAllRecent.value = !showAllRecent.value
}


const createNewProject = async () => {
  try {
    // 表单验证
    await newFormRef.value?.validate()
    
    loading.value = true
    const created = await novelService.createNovel({
      title: newProject.value.title,
      description: newProject.value.description || '',
      genre: newProject.value.genre || '',
      rating: newProject.value.rating as any,
      targetWordCount: newProject.value.targetWordCount
    })
    
    // 添加到全局store
    projectStore.addProject(created)

    message.success(t('project.createSuccess'))
    showNewProjectModal.value = false

    // Reset form
    newFormRef.value?.resetFields()
    newProject.value = {
      title: '',
      description: '',
      genre: '',
      rating: 'PG-13',
      targetWordCount: 100000
    }

    // 重新加载数据
    await loadData()
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // 表单验证错误
      return
    }
    console.error('Failed to create project:', error)
    message.error(t('project.createFailure'))
  } finally {
    loading.value = false
  }
}

const updateProject = async () => {
  if (!projectStore.currentProject) {
    message.error(t('project.noProjectSelected'))
    return
  }

  try {
    // 表单验证
    await editFormRef.value?.validate()

    loading.value = true
    const updated = await novelService.updateNovel(projectStore.currentProject.id, {
      title: editProject.value.title,
      description: editProject.value.description || '',
      genre: editProject.value.genre || '',
      rating: editProject.value.rating as any,
      targetWordCount: editProject.value.targetWordCount
    })

    // 更新全局store中的作品数据
    projectStore.updateProject(updated)

    message.success(t('project.updateSuccess'))
    showEditProjectModal.value = false

    // 重新加载数据以保证数据一致性
    await loadData()
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // 表单验证错误
      return
    }
    console.error('Failed to update project:', error)
    message.error(t('project.updateFailure'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.project-selector {
  /* 确保选择器在较小屏幕上的响应式行为 */
  @media (max-width: 768px) {
    min-width: 200px !important;
    max-width: 250px !important;
  }
}

.project-selector :deep(.ant-select-selector) {
  /* 添加一些内边距使选择器看起来更美观 */
  padding-left: 12px;
  padding-right: 12px;
}

.project-selector :deep(.ant-select-selection-search-input) {
  /* 搜索输入框的样式 */
  height: 32px;
}

/* 当没有作品时的提示样式 */
.no-projects-hint {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>