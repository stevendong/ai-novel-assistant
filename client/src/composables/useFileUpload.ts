import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { api } from '@/utils/api'

export interface UploadFileOptions {
  category?: string
  description?: string
  novelId?: string
}

export function useFileUpload() {
  const uploading = ref(false)

  /**
   * 上传文件到服务器
   */
  const uploadFile = async (
    file: File,
    options: UploadFileOptions = {}
  ): Promise<any> => {
    console.log('[useFileUpload] 开始上传文件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      options
    })

    try {
      uploading.value = true

      const formData = new FormData()
      formData.append('file', file)

      if (options.category) {
        formData.append('category', options.category)
      }

      if (options.description) {
        formData.append('description', options.description)
      }

      if (options.novelId) {
        formData.append('novelId', options.novelId)
      }

      console.log('[useFileUpload] 发送POST请求到 /api/upload/files')

      const response = await api.post('/api/upload/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      console.log('[useFileUpload] 上传响应:', response.data)

      message.success('文件上传成功')
      return response.data.file
    } catch (error: any) {
      console.error('[useFileUpload] 上传错误:', error)
      console.error('[useFileUpload] 错误响应:', error.response?.data)

      const errorMsg = error.response?.data?.error || '文件上传失败'
      message.error(errorMsg)
      throw error
    } finally {
      uploading.value = false
    }
  }

  /**
   * 上传前的文件校验
   */
  const validateFile = (
    file: File,
    options: {
      maxSize?: number        // MB
      accept?: string[]       // MIME types
    } = {}
  ): boolean => {
    const { maxSize = 50, accept = [] } = options

    // 大小校验
    const isLtMaxSize = file.size / 1024 / 1024 < maxSize
    if (!isLtMaxSize) {
      message.error(`文件大小不能超过 ${maxSize}MB!`)
      return false
    }

    // 类型校验
    if (accept.length > 0) {
      const isAccepted = accept.some(type => {
        if (type.endsWith('/*')) {
          const prefix = type.split('/')[0]
          return file.type.startsWith(prefix + '/')
        }
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type === type
      })

      if (!isAccepted) {
        message.error('文件类型不支持!')
        return false
      }
    }

    return true
  }

  return {
    uploading,
    uploadFile,
    validateFile
  }
}
