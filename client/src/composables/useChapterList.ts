import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { Chapter } from '@/types'
import { 
  chapterService, 
  type ChapterCreateData, 
  type ChapterListQuery, 
  type ChapterListResponse 
} from '@/services/chapterService'
import { useProjectStore } from '@/stores/project'

export function useChapterList() {
  const projectStore = useProjectStore()
  
  const chapters = ref<Chapter[]>([])
  const loading = ref(false)
  const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  
  // 查询参数
  const queryParams = ref<ChapterListQuery>({
    page: 1,
    pageSize: 10,
    sortBy: 'chapterNumber',
    sortOrder: 'asc'
  })
  
  // 计算下一个章节号（需要从所有章节中获取，不仅仅是当前页）
  const nextChapterNumber = ref(1)
  

  // 分页加载章节列表
  const loadChapters = async (novelId?: string, params?: Partial<ChapterListQuery>) => {
    const targetNovelId = novelId || projectStore.currentProject?.id
    console.log('loadChapters called with novelId:', novelId, 'targetNovelId:', targetNovelId)
    
    if (!targetNovelId) {
      console.log('No target novel ID, setting empty chapters')
      chapters.value = []
      pagination.value = { current: 1, pageSize: 10, total: 0, totalPages: 0 }
      nextChapterNumber.value = 1
      return
    }
    
    // 更新查询参数
    if (params) {
      queryParams.value = { ...queryParams.value, ...params }
    }
    console.log('Query params:', queryParams.value)
    
    try {
      loading.value = true
      console.log('Calling paginated API...')
      const result = await chapterService.getChaptersByNovelPaginated(targetNovelId, queryParams.value)
      console.log('Paginated API result:', result)
      
      chapters.value = result.chapters
      pagination.value = {
        current: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
      
      // 使用API返回的最大章节号设置下一个章节号
      nextChapterNumber.value = result.maxChapterNumber + 1
      
    } catch (error) {
      console.error('Failed to load chapters:', error)
      message.error('加载章节列表失败')
      // 设置空数据
      chapters.value = []
      pagination.value = { current: 1, pageSize: 10, total: 0, totalPages: 0 }
      nextChapterNumber.value = 1
    } finally {
      loading.value = false
    }
  }

  // 兼容原有的简单加载方法
  const loadAllChapters = async (novelId?: string) => {
    const targetNovelId = novelId || projectStore.currentProject?.id
    if (!targetNovelId) {
      chapters.value = []
      nextChapterNumber.value = 1
      return
    }
    
    try {
      loading.value = true
      const allChapters = await chapterService.getChaptersByNovel(targetNovelId)
      chapters.value = allChapters
      
      // 计算下一个章节号
      if (allChapters.length === 0) {
        nextChapterNumber.value = 1
      } else {
        const maxNumber = Math.max(...allChapters.map(c => c.chapterNumber))
        nextChapterNumber.value = maxNumber + 1
      }
    } catch (error) {
      console.error('Failed to load chapters:', error)
      message.error('加载章节列表失败')
      chapters.value = []
      nextChapterNumber.value = 1
    } finally {
      loading.value = false
    }
  }
  
  // 创建新章节
  const createChapter = async (data: Omit<ChapterCreateData, 'novelId' | 'chapterNumber'>) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) {
      message.error('请先选择项目')
      return null
    }
    
    try {
      loading.value = true
      const newChapter = await chapterService.createChapter({
        ...data,
        novelId: currentProject.id,
        chapterNumber: nextChapterNumber.value
      })
      
      message.success('章节创建成功')
      
      // 重新加载当前页数据
      await loadChapters(currentProject.id)
      
      return newChapter
    } catch (error) {
      console.error('Failed to create chapter:', error)
      message.error('创建章节失败')
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 更新章节
  const updateChapter = async (id: string, data: any) => {
    try {
      loading.value = true
      const updatedChapter = await chapterService.updateChapter(id, data)
      
      // 更新章节列表中的数据
      const index = chapters.value.findIndex(c => c.id === id)
      if (index !== -1) {
        chapters.value[index] = updatedChapter
      }
      
      message.success('章节更新成功')
      return updatedChapter
    } catch (error) {
      console.error('Failed to update chapter:', error)
      message.error('更新章节失败')
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 删除章节
  const deleteChapter = async (id: string) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) {
      message.error('请先选择项目')
      return false
    }
    
    try {
      loading.value = true
      await chapterService.deleteChapter(id)
      
      message.success('章节删除成功')
      
      // 重新加载当前页数据
      await loadChapters(currentProject.id)
      
      return true
    } catch (error) {
      console.error('Failed to delete chapter:', error)
      message.error('删除章节失败')
      return false
    } finally {
      loading.value = false
    }
  }
  
  // 获取单个章节
  const getChapter = async (id: string) => {
    try {
      return await chapterService.getChapter(id)
    } catch (error) {
      console.error('Failed to get chapter:', error)
      message.error('获取章节详情失败')
      return null
    }
  }

  // 更新查询参数并重新加载
  const updateQuery = async (newParams: Partial<ChapterListQuery>) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) return
    
    await loadChapters(currentProject.id, newParams)
  }

  // 搜索章节
  const searchChapters = async (searchText: string) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) return
    
    await loadChapters(currentProject.id, { 
      ...queryParams.value,
      search: searchText,
      page: 1 // 搜索时重置到第一页
    })
  }

  // 改变页码
  const changePage = async (page: number, pageSize?: number) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) return
    
    await loadChapters(currentProject.id, {
      ...queryParams.value,
      page,
      pageSize: pageSize || queryParams.value.pageSize
    })
  }

  // 改变排序
  const changeSort = async (sortBy: string, sortOrder: 'asc' | 'desc') => {
    const currentProject = projectStore.currentProject
    if (!currentProject) return
    
    await loadChapters(currentProject.id, {
      ...queryParams.value,
      sortBy: sortBy as any,
      sortOrder,
      page: 1 // 排序时重置到第一页
    })
  }

  // 过滤状态
  const filterByStatus = async (status?: string) => {
    const currentProject = projectStore.currentProject
    if (!currentProject) return
    
    await loadChapters(currentProject.id, {
      ...queryParams.value,
      status,
      page: 1 // 过滤时重置到第一页
    })
  }
  
  return {
    chapters,
    loading,
    pagination,
    queryParams,
    nextChapterNumber,
    loadChapters,
    loadAllChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    getChapter,
    updateQuery,
    searchChapters,
    changePage,
    changeSort,
    filterByStatus
  }
}