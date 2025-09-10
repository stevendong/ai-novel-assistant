<template>
  <div class="h-full p-6 overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">项目管理</h1>
        <a-space>
          <a-button type="primary" @click="showNewProjectModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            新建项目
          </a-button>
          <a-button @click="importProject">
            <template #icon>
              <ImportOutlined />
            </template>
            导入项目
          </a-button>
        </a-space>
      </div>

      <!-- Current Project Info -->
      <a-card v-if="projectStore.currentProject" class="mb-6" title="当前项目">
        <template #extra>
          <a-space>
            <a-button size="small" @click="openEditProject">
              <template #icon>
                <EditOutlined />
              </template>
              编辑
            </a-button>
            <a-button size="small" danger @click="deleteProject">
              <template #icon>
                <DeleteOutlined />
              </template>
              删除
            </a-button>
          </a-space>
        </template>

        <a-row :gutter="[16, 16]">
          <a-col :span="12">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="项目名称">
                {{ projectStore.currentProject.title }}
              </a-descriptions-item>
              <a-descriptions-item label="类型">
                {{ projectStore.currentProject.genre }}
              </a-descriptions-item>
              <a-descriptions-item label="分级">
                <a-tag :color="getRatingColor(projectStore.currentProject.rating)">
                  {{ projectStore.currentProject.rating }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="getStatusColor(projectStore.currentProject.status)">
                  {{ getStatusText(projectStore.currentProject.status) }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
          <a-col :span="12">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="创建时间">
                {{ formatDate(projectStore.currentProject.createdAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="最后更新">
                {{ formatDate(projectStore.currentProject.updatedAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="章节数量">
                {{ chaptersCount }}
              </a-descriptions-item>
              <a-descriptions-item label="角色数量">
                {{ charactersCount }}
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
        </a-row>

        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">项目描述</h4>
          <p class="text-gray-600 text-sm leading-relaxed">
            {{ projectStore.currentProject.description }}
          </p>
        </div>
      </a-card>

      <!-- Recent Projects -->
      <a-card class="mb-6">
        <template #title>
          <div class="flex items-center justify-between">
            <span>最近项目</span>
            <div class="flex items-center gap-2">
              <a-tag v-if="recentProjects.length > 5" color="blue">
                {{ showAllRecent ? `显示全部 ${recentProjects.length}` : `显示 5 / ${recentProjects.length}` }}
              </a-tag>
              <a-button 
                v-if="recentProjects.length > 5" 
                type="link" 
                size="small"
                @click="toggleShowAllRecent"
              >
                {{ showAllRecent ? '收起' : '查看全部' }}
              </a-button>
            </div>
          </div>
        </template>
        <a-list :data-source="recentProjectsLimited" class="w-full">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-button type="text" size="small" @click="openProject(item)">
                  打开
                </a-button>
                <a-button type="text" size="small" @click="duplicateProject(item)">
                  复制
                </a-button>
              </template>
              
              <a-list-item-meta>
                <template #title>
                  <span class="text-gray-800">{{ item.title }}</span>
                  <a-tag size="small" class="ml-2" :color="getStatusColor(item.status)">
                    {{ getStatusText(item.status) }}
                  </a-tag>
                </template>
                <template #description>
                  <div class="text-sm text-gray-500">
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
              title="总项目数"
              :value="totalProjects"
              :prefix="h(BookOutlined)"
            />
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card size="small">
            <a-statistic
              title="进行中项目"
              :value="inProgressProjects"
              :prefix="h(EditOutlined)"
              value-style="color: #3f8600"
            />
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card size="small">
            <a-statistic
              title="已完成项目"
              :value="completedProjects"
              :prefix="h(CheckCircleOutlined)"
              value-style="color: #cf1322"
            />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- New Project Modal -->
    <a-modal
      v-model:open="showNewProjectModal"
      title="创建新项目"
      width="600px"
      @ok="createNewProject"
      :confirm-loading="loading"
    >
      <a-form :model="newProject" layout="vertical" ref="newFormRef">
        <a-form-item 
          label="项目名称" 
          name="title"
          :rules="[{ required: true, message: '请输入项目名称', trigger: 'blur' }]"
        >
          <a-input v-model:value="newProject.title" placeholder="输入项目名称" />
        </a-form-item>
        
        <a-form-item label="项目描述">
          <a-textarea
            v-model:value="newProject.description"
            :rows="3"
            placeholder="简要描述您的小说内容和主题"
          />
        </a-form-item>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="类型">
              <a-select v-model:value="newProject.genre" placeholder="选择小说类型">
                <a-select-option value="奇幻">奇幻</a-select-option>
                <a-select-option value="科幻">科幻</a-select-option>
                <a-select-option value="现实">现实</a-select-option>
                <a-select-option value="历史">历史</a-select-option>
                <a-select-option value="悬疑">悬疑</a-select-option>
                <a-select-option value="言情">言情</a-select-option>
                <a-select-option value="武侠">武侠</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="内容分级">
              <a-select v-model:value="newProject.rating" placeholder="选择内容分级">
                <a-select-option value="G">G - 全年龄</a-select-option>
                <a-select-option value="PG">PG - 家长指导</a-select-option>
                <a-select-option value="PG-13">PG-13 - 13岁以上</a-select-option>
                <a-select-option value="R">R - 17岁以上</a-select-option>
                <a-select-option value="NC-17">NC-17 - 成人内容</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="目标字数">
          <a-input-number
            v-model:value="newProject.targetWordCount"
            :min="1000"
            :max="10000000"
            :step="1000"
            style="width: 100%"
            placeholder="设置小说目标字数"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Edit Project Modal -->
    <a-modal
      v-model:open="showEditProjectModal"
      title="编辑项目"
      width="600px"
      @ok="updateProject"
      :confirm-loading="loading"
    >
      <a-form :model="editProject" layout="vertical" ref="editFormRef">
        <a-form-item 
          label="项目名称" 
          name="title"
          :rules="[{ required: true, message: '请输入项目名称', trigger: 'blur' }]"
        >
          <a-input v-model:value="editProject.title" placeholder="输入项目名称" />
        </a-form-item>
        
        <a-form-item label="项目描述">
          <a-textarea
            v-model:value="editProject.description"
            :rows="3"
            placeholder="简要描述您的小说内容和主题"
          />
        </a-form-item>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="类型">
              <a-select v-model:value="editProject.genre" placeholder="选择小说类型">
                <a-select-option value="奇幻">奇幻</a-select-option>
                <a-select-option value="科幻">科幻</a-select-option>
                <a-select-option value="现实">现实</a-select-option>
                <a-select-option value="历史">历史</a-select-option>
                <a-select-option value="悬疑">悬疑</a-select-option>
                <a-select-option value="言情">言情</a-select-option>
                <a-select-option value="武侠">武侠</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="内容分级">
              <a-select v-model:value="editProject.rating" placeholder="选择内容分级">
                <a-select-option value="G">G - 全年龄</a-select-option>
                <a-select-option value="PG">PG - 家长指导</a-select-option>
                <a-select-option value="PG-13">PG-13 - 13岁以上</a-select-option>
                <a-select-option value="R">R - 17岁以上</a-select-option>
                <a-select-option value="NC-17">NC-17 - 成人内容</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="目标字数">
          <a-input-number
            v-model:value="editProject.targetWordCount"
            :min="1000"
            :max="10000000"
            :step="1000"
            style="width: 100%"
            placeholder="设置小说目标字数"
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
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { Novel, ProjectOverviewStats } from '@/types'
import { novelService } from '@/services/novelService'
import { useProjectStore } from '@/stores/project'

// 全局项目状态
const projectStore = useProjectStore()

// 响应式数据
const recentProjects = ref<Novel[]>([])
const projectStats = ref<ProjectOverviewStats | null>(null)
const loading = ref(false)
const showNewProjectModal = ref(false)
const showEditProjectModal = ref(false)
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
const totalProjects = computed(() => projectStats.value?.projects.total || 0)
const inProgressProjects = computed(() => projectStats.value?.projects.writing || 0)
const completedProjects = computed(() => projectStats.value?.projects.completed || 0)

// 限制最近项目显示数量为5个（如果showAllRecent为false）
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
    
    // 设置最近项目列表（排除当前项目）
    if (projectStore.currentProject) {
      recentProjects.value = projectStore.projects.filter(n => n.id !== projectStore.currentProject!.id)
    } else {
      recentProjects.value = projectStore.projects
    }
  } catch (error) {
    console.error('Failed to load project data:', error)
    message.error('加载项目数据失败')
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
  const colors = {
    'draft': 'default',
    'writing': 'processing',
    'completed': 'success'
  }
  return colors[status as keyof typeof colors] || 'default'
}

const getStatusText = (status: string) => {
  const texts = {
    'draft': '草稿',
    'writing': '写作中',
    'completed': '已完成'
  }
  return texts[status as keyof typeof texts] || status
}

const getProjectColor = (id: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
  return colors[parseInt(id) % colors.length]
}

// Actions
const openEditProject = () => {
  if (!projectStore.currentProject) return
  
  // 用当前项目数据填充编辑表单
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
    message.success('项目删除成功')
    await loadData() // 重新加载数据
  } catch (error) {
    console.error('Failed to delete project:', error)
    message.error('删除项目失败')
  }
}

const openProject = (project: Novel) => {
  // 通过全局store切换项目（会刷新页面）
  projectStore.switchProject(project.id)
}

const duplicateProject = async (project: Novel) => {
  try {
    const duplicated = await novelService.duplicateNovel(project.id, `${project.title} (副本)`)
    message.success('项目复制成功')
    await loadData() // 重新加载数据
  } catch (error) {
    console.error('Failed to duplicate project:', error)
    message.error('复制项目失败')
  }
}

const importProject = () => {
  // TODO: 实现项目导入功能
  message.info('导入功能开发中...')
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
    
    message.success('项目创建成功')
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
    message.error('创建项目失败')
  } finally {
    loading.value = false
  }
}

const updateProject = async () => {
  if (!projectStore.currentProject) {
    message.error('没有选择要编辑的项目')
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
    
    // 更新全局store中的项目数据
    projectStore.updateProject(updated)
    
    message.success('项目更新成功')
    showEditProjectModal.value = false
    
    // 重新加载数据以保证数据一致性
    await loadData()
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // 表单验证错误
      return
    }
    console.error('Failed to update project:', error)
    message.error('项目更新失败')
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

/* 当没有项目时的提示样式 */
.no-projects-hint {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>