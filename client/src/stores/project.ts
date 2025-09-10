import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Novel } from '@/types'
import { novelService } from '@/services/novelService'
import { message } from 'ant-design-vue'

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref<Novel[]>([])
  const currentProject = ref<Novel | null>(null)
  const loading = ref(false)
  
  // 计算属性
  const projectOptions = computed(() => 
    projects.value.map(project => ({
      label: project.title,
      value: project.id,
      project: project
    }))
  )
  
  const currentProjectId = computed(() => currentProject.value?.id || '')
  
  // 从localStorage获取保存的项目ID
  const getSavedProjectId = (): string | null => {
    try {
      return localStorage.getItem('selectedProjectId')
    } catch (error) {
      console.warn('Unable to access localStorage:', error)
      return null
    }
  }
  
  // 保存项目ID到localStorage
  const saveProjectId = (projectId: string) => {
    try {
      localStorage.setItem('selectedProjectId', projectId)
    } catch (error) {
      console.warn('Unable to save to localStorage:', error)
    }
  }
  
  // 加载所有项目
  const loadProjects = async () => {
    try {
      loading.value = true
      const novels = await novelService.getNovels()
      
      // 按更新时间排序（最新的在前）
      projects.value = novels.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      
      // 设置当前项目
      const savedProjectId = getSavedProjectId()
      let targetProject: Novel | null = null
      
      if (savedProjectId && projects.value.find(p => p.id === savedProjectId)) {
        // 使用保存的项目
        targetProject = projects.value.find(p => p.id === savedProjectId) || null
      } else {
        // 选择第一个进行中的项目或最新的项目
        const writingProject = projects.value.find(n => n.status === 'writing')
        targetProject = writingProject || projects.value[0] || null
      }
      
      if (targetProject) {
        currentProject.value = targetProject
        saveProjectId(targetProject.id)
      }
      
      return projects.value
    } catch (error) {
      console.error('Failed to load projects:', error)
      message.error('加载项目列表失败')
      return []
    } finally {
      loading.value = false
    }
  }
  
  // 切换当前项目
  const switchProject = async (projectId: string) => {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) {
      message.error('项目不存在')
      return false
    }
    
    currentProject.value = project
    saveProjectId(projectId)
    message.success(`已切换到项目：${project.title}`)
    
    // 刷新页面以确保所有组件都使用新的项目数据
    window.location.reload()
    
    return true
  }
  
  // 添加新项目
  const addProject = (project: Novel) => {
    projects.value.unshift(project)
    // 如果没有当前项目，设置新项目为当前项目
    if (!currentProject.value) {
      currentProject.value = project
      saveProjectId(project.id)
    }
  }
  
  // 更新项目
  const updateProject = (updatedProject: Novel) => {
    const index = projects.value.findIndex(p => p.id === updatedProject.id)
    if (index !== -1) {
      projects.value[index] = updatedProject
      
      // 如果更新的是当前项目，同时更新当前项目引用
      if (currentProject.value?.id === updatedProject.id) {
        currentProject.value = updatedProject
      }
    }
  }
  
  // 删除项目
  const removeProject = (projectId: string) => {
    const index = projects.value.findIndex(p => p.id === projectId)
    if (index !== -1) {
      projects.value.splice(index, 1)
      
      // 如果删除的是当前项目，切换到第一个可用的项目
      if (currentProject.value?.id === projectId) {
        if (projects.value.length > 0) {
          const nextProject = projects.value[0]
          currentProject.value = nextProject
          saveProjectId(nextProject.id)
        } else {
          currentProject.value = null
          saveProjectId('')
        }
      }
    }
  }
  
  // 重置状态
  const reset = () => {
    projects.value = []
    currentProject.value = null
    loading.value = false
  }
  
  return {
    // 状态
    projects,
    currentProject,
    loading,
    
    // 计算属性
    projectOptions,
    currentProjectId,
    
    // 方法
    loadProjects,
    switchProject,
    addProject,
    updateProject,
    removeProject,
    reset,
    getSavedProjectId,
    saveProjectId
  }
})