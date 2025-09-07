<template>
  <div class="h-full p-6 max-w-6xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 mb-2">项目管理</h1>
        <p class="text-gray-600">管理您的所有小说创作项目</p>
      </div>
      <a-button 
        type="primary" 
        size="large"
        @click="showCreateModal = true"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        新建项目
      </a-button>
    </div>

    <!-- Project Statistics -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">{{ projects.length }}</div>
        <div class="text-sm text-gray-500">总项目数</div>
      </div>
      <div class="bg-white border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-green-600">{{ completedProjects }}</div>
        <div class="text-sm text-gray-500">已完成</div>
      </div>
      <div class="bg-white border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-yellow-600">{{ activeProjects }}</div>
        <div class="text-sm text-gray-500">进行中</div>
      </div>
      <div class="bg-white border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gray-600">{{ draftProjects }}</div>
        <div class="text-sm text-gray-500">草稿</div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="bg-white rounded-lg border p-4 mb-6">
      <div class="flex items-center space-x-4">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索项目名称或描述..."
          style="width: 300px"
          @search="handleSearch"
        />
        <a-select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          style="width: 120px"
          @change="handleStatusFilter"
        >
          <a-select-option value="">全部</a-select-option>
          <a-select-option value="draft">草稿</a-select-option>
          <a-select-option value="writing">写作中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
        </a-select>
        <a-select
          v-model:value="genreFilter"
          placeholder="类型筛选"
          style="width: 120px"
          @change="handleGenreFilter"
        >
          <a-select-option value="">全部</a-select-option>
          <a-select-option value="玄幻">玄幻</a-select-option>
          <a-select-option value="都市">都市</a-select-option>
          <a-select-option value="历史">历史</a-select-option>
          <a-select-option value="科幻">科幻</a-select-option>
          <a-select-option value="悬疑">悬疑</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- Projects Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        @click="selectProject(project)"
      >
        <div class="p-6">
          <!-- Project Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-800 truncate">
                {{ project.title }}
              </h3>
              <p class="text-sm text-gray-500 mt-1">
                {{ formatDate(project.updatedAt) }}
              </p>
            </div>
            <a-dropdown>
              <a-button type="text" size="small" @click.stop>
                <MoreOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleMenuClick($event, project)">
                  <a-menu-item key="edit">
                    <EditOutlined />
                    编辑
                  </a-menu-item>
                  <a-menu-item key="duplicate">
                    <CopyOutlined />
                    复制
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" class="text-red-600">
                    <DeleteOutlined />
                    删除
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>

          <!-- Project Description -->
          <p class="text-gray-600 text-sm line-clamp-3 mb-4">
            {{ project.description || '暂无描述' }}
          </p>

          <!-- Project Metadata -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <a-tag :color="getStatusColor(project.status)">
                {{ getStatusText(project.status) }}
              </a-tag>
              <a-tag color="blue">{{ project.genre }}</a-tag>
            </div>
            <div class="flex items-center space-x-3 text-sm text-gray-500">
              <span>{{ getWordCount(project) }}字</span>
              <span>{{ getChapterCount(project) }}章</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div 
        v-if="filteredProjects.length === 0"
        class="col-span-full flex flex-col items-center justify-center py-12 text-gray-500"
      >
        <BookOutlined class="text-6xl mb-4 text-gray-300" />
        <p class="text-lg mb-2">暂无项目</p>
        <p class="text-sm">点击右上角"新建项目"开始您的创作之旅</p>
      </div>
    </div>

    <!-- Create Project Modal -->
    <a-modal
      v-model:open="showCreateModal"
      title="新建项目"
      @ok="handleCreateProject"
      @cancel="resetCreateForm"
    >
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        layout="vertical"
      >
        <a-form-item label="项目名称" name="title" required>
          <a-input 
            v-model:value="createForm.title" 
            placeholder="请输入项目名称"
            :maxlength="50"
          />
        </a-form-item>
        
        <a-form-item label="项目描述" name="description">
          <a-textarea 
            v-model:value="createForm.description"
            placeholder="简要描述您的作品内容、风格等"
            :rows="3"
            :maxlength="200"
          />
        </a-form-item>
        
        <a-form-item label="作品类型" name="genre" required>
          <a-select v-model:value="createForm.genre" placeholder="选择作品类型">
            <a-select-option value="玄幻">玄幻</a-select-option>
            <a-select-option value="都市">都市</a-select-option>
            <a-select-option value="历史">历史</a-select-option>
            <a-select-option value="科幻">科幻</a-select-option>
            <a-select-option value="悬疑">悬疑</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="内容评级" name="rating" required>
          <a-select v-model:value="createForm.rating" placeholder="选择内容评级">
            <a-select-option value="G">G - 所有年龄</a-select-option>
            <a-select-option value="PG">PG - 建议家长指导</a-select-option>
            <a-select-option value="PG-13">PG-13 - 13岁以上</a-select-option>
            <a-select-option value="R">R - 限制级</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  BookOutlined,
  MoreOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { Novel } from '@/types'

const router = useRouter()

// Data
const projects = ref<Novel[]>([])
const searchText = ref('')
const statusFilter = ref('')
const genreFilter = ref('')
const showCreateModal = ref(false)

// Create form
const createFormRef = ref()
const createForm = ref({
  title: '',
  description: '',
  genre: '',
  rating: 'PG'
})

const createRules = {
  title: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 50, message: '项目名称长度在1到50个字符', trigger: 'blur' }
  ],
  genre: [
    { required: true, message: '请选择作品类型', trigger: 'change' }
  ],
  rating: [
    { required: true, message: '请选择内容评级', trigger: 'change' }
  ]
}

// Computed
const completedProjects = computed(() => 
  projects.value.filter(p => p.status === 'completed').length
)

const activeProjects = computed(() => 
  projects.value.filter(p => p.status === 'writing').length
)

const draftProjects = computed(() => 
  projects.value.filter(p => p.status === 'draft').length
)

const filteredProjects = computed(() => {
  let filtered = projects.value

  // Search filter
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase().trim()
    filtered = filtered.filter(project => 
      project.title.toLowerCase().includes(search) ||
      project.description?.toLowerCase().includes(search)
    )
  }

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(project => project.status === statusFilter.value)
  }

  // Genre filter
  if (genreFilter.value) {
    filtered = filtered.filter(project => project.genre === genreFilter.value)
  }

  return filtered
})

// Methods
const loadProjects = async () => {
  try {
    // Mock data - replace with actual API call
    projects.value = [
      {
        id: '1',
        title: '剑仙传说',
        description: '一个关于修仙者在现代都市中隐世修炼的故事，融合了传统仙侠与现代元素。',
        genre: '玄幻',
        rating: 'PG-13',
        status: 'writing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: '都市重生',
        description: '主角重生回到十年前，利用前世记忆在商界叱咤风云的故事。',
        genre: '都市',
        rating: 'PG',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        title: '星际探索',
        description: '未来人类踏出地球，在广阔宇宙中寻找新家园的冒险故事。',
        genre: '科幻',
        rating: 'PG-13',
        status: 'draft',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      }
    ]
  } catch (error) {
    message.error('加载项目失败')
  }
}

const selectProject = (project: Novel) => {
  // Navigate to project detail or set as current project
  router.push({ name: 'project', params: { id: project.id } })
}

const handleSearch = (value: string) => {
  searchText.value = value
}

const handleStatusFilter = () => {
  // Filter logic is handled by computed property
}

const handleGenreFilter = () => {
  // Filter logic is handled by computed property
}

const handleMenuClick = ({ key }: { key: string }, project: Novel) => {
  switch (key) {
    case 'edit':
      editProject(project)
      break
    case 'duplicate':
      duplicateProject(project)
      break
    case 'delete':
      deleteProject(project)
      break
  }
}

const editProject = (project: Novel) => {
  // Implement edit logic
  message.info(`编辑项目: ${project.title}`)
}

const duplicateProject = (project: Novel) => {
  // Implement duplicate logic
  message.info(`复制项目: ${project.title}`)
}

const deleteProject = (project: Novel) => {
  // Implement delete logic with confirmation
  message.info(`删除项目: ${project.title}`)
}

const handleCreateProject = async () => {
  try {
    await createFormRef.value.validate()
    
    const newProject: Novel = {
      id: Date.now().toString(),
      title: createForm.value.title,
      description: createForm.value.description,
      genre: createForm.value.genre,
      rating: createForm.value.rating as 'G' | 'PG' | 'PG-13' | 'R',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    projects.value.unshift(newProject)
    message.success('项目创建成功')
    resetCreateForm()
    showCreateModal.value = false
  } catch (error) {
    message.error('请检查表单信息')
  }
}

const resetCreateForm = () => {
  createForm.value = {
    title: '',
    description: '',
    genre: '',
    rating: 'PG'
  }
  createFormRef.value?.resetFields()
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
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

const getWordCount = (project: Novel) => {
  // Mock word count - replace with actual calculation
  return Math.floor(Math.random() * 100000)
}

const getChapterCount = (project: Novel) => {
  // Mock chapter count - replace with actual calculation
  return Math.floor(Math.random() * 20) + 1
}

// Lifecycle
onMounted(() => {
  loadProjects()
})
</script>