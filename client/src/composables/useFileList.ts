import { ref, computed } from 'vue'
import { api } from '@/utils/api'

export interface FileListParams {
  category?: string
  search?: string
  novelId?: string
  page?: number
  limit?: number
}

export function useFileList() {
  const files = ref<any[]>([])
  const loading = ref(false)
  const total = ref(0)

  /**
   * 加载文件列表
   */
  const loadFiles = async (params: FileListParams = {}) => {
    try {
      loading.value = true
      const response = await api.get('/api/upload/files', { params })
      files.value = response.data.files || []
      total.value = response.data.pagination?.total || 0
    } catch (error: any) {
      console.error('加载文件列表失败:', error)
      files.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /**
   * 按分类筛选文件
   */
  const filterByCategory = (category: string) => {
    return computed(() => {
      if (!category) return files.value
      return files.value.filter(f => f.category === category)
    })
  }

  /**
   * 按类型筛选文件（图片/文档等）
   */
  const filterByType = (accept: string[]) => {
    return computed(() => {
      if (!accept || accept.length === 0) return files.value

      return files.value.filter(file => {
        return accept.some(type => {
          if (type.endsWith('/*')) {
            const prefix = type.split('/')[0]
            return file.fileType?.startsWith(prefix + '/')
          }
          if (type.startsWith('.')) {
            return file.fileName?.toLowerCase().endsWith(type.toLowerCase())
          }
          return file.fileType === type
        })
      })
    })
  }

  /**
   * 搜索文件
   */
  const searchFiles = (keyword: string) => {
    return computed(() => {
      if (!keyword) return files.value

      const lowerKeyword = keyword.toLowerCase()
      return files.value.filter(file => {
        return (
          file.fileName?.toLowerCase().includes(lowerKeyword) ||
          file.description?.toLowerCase().includes(lowerKeyword)
        )
      })
    })
  }

  /**
   * 判断是否为图片文件
   */
  const isImageFile = (mimeType: string) => {
    return mimeType?.startsWith('image/')
  }

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return {
    files,
    loading,
    total,
    loadFiles,
    filterByCategory,
    filterByType,
    searchFiles,
    isImageFile,
    formatFileSize
  }
}
