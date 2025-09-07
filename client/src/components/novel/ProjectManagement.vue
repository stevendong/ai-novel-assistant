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
      <a-card v-if="currentProject" class="mb-6" title="当前项目">
        <template #extra>
          <a-space>
            <a-button size="small" @click="editProject">
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
                {{ currentProject.title }}
              </a-descriptions-item>
              <a-descriptions-item label="类型">
                {{ currentProject.genre }}
              </a-descriptions-item>
              <a-descriptions-item label="分级">
                <a-tag :color="getRatingColor(currentProject.rating)">
                  {{ currentProject.rating }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="getStatusColor(currentProject.status)">
                  {{ getStatusText(currentProject.status) }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
          <a-col :span="12">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="创建时间">
                {{ formatDate(currentProject.createdAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="最后更新">
                {{ formatDate(currentProject.updatedAt) }}
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
            {{ currentProject.description }}
          </p>
        </div>
      </a-card>

      <!-- Recent Projects -->
      <a-card title="最近项目" class="mb-6">
        <a-list :data-source="recentProjects" class="w-full">
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
    >
      <a-form :model="newProject" layout="vertical">
        <a-form-item label="项目名称" required>
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
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  PlusOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import type { Novel } from '@/types'

// Mock data - will be replaced with actual store data
const currentProject = ref<Novel | null>({
  id: '1',
  title: '神秘森林的传说',
  description: '一个关于魔法森林中冒险的奇幻故事，主角是一位年轻的法师学徒。',
  genre: '奇幻',
  rating: 'PG-13',
  status: 'writing',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-20T15:45:00Z'
})

const recentProjects = ref<Novel[]>([
  {
    id: '2',
    title: '星际漂流者',
    description: '科幻背景下的太空探险故事',
    genre: '科幻',
    rating: 'PG-13',
    status: 'completed',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T12:00:00Z'
  },
  {
    id: '3',
    title: '都市夜行者',
    description: '现代都市中的悬疑推理小说',
    genre: '悬疑',
    rating: 'R',
    status: 'draft',
    createdAt: '2024-01-05T14:20:00Z',
    updatedAt: '2024-01-12T09:15:00Z'
  }
])

const showNewProjectModal = ref(false)
const newProject = ref({
  title: '',
  description: '',
  genre: '',
  rating: 'PG-13' as const
})

// Statistics
const chaptersCount = ref(8)
const charactersCount = ref(15)
const totalProjects = computed(() => recentProjects.value.length + (currentProject.value ? 1 : 0))
const inProgressProjects = computed(() => 
  recentProjects.value.filter(p => p.status === 'writing').length + 
  (currentProject.value?.status === 'writing' ? 1 : 0)
)
const completedProjects = computed(() => 
  recentProjects.value.filter(p => p.status === 'completed').length + 
  (currentProject.value?.status === 'completed' ? 1 : 0)
)

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
const editProject = () => {
  console.log('Edit project')
}

const deleteProject = () => {
  console.log('Delete project')
}

const openProject = (project: Novel) => {
  console.log('Open project:', project)
}

const duplicateProject = (project: Novel) => {
  console.log('Duplicate project:', project)
}

const importProject = () => {
  console.log('Import project')
}

const createNewProject = () => {
  console.log('Create new project:', newProject.value)
  showNewProjectModal.value = false
  // Reset form
  newProject.value = {
    title: '',
    description: '',
    genre: '',
    rating: 'PG-13'
  }
}
</script>