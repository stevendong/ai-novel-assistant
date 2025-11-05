import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { message } from 'ant-design-vue'
import { requestDeduplicator } from './requestDeduplicator'

// API响应数据的基础接口
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success?: boolean
}

// API错误响应接口
export interface ApiErrorResponse {
  error: string
  message: string
  statusCode?: number
}

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean
  skipErrorHandler?: boolean
  skipDeduplication?: boolean // 是否跳过请求去重
  _retry?: boolean
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API客户端类
class ApiClient {
  private axiosInstance: AxiosInstance
  private baseURL: string
  private timeout: number

  constructor(baseURL?: string, timeout?: number) {
    this.baseURL = baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
    this.timeout = timeout || 1000 * 60 * 10

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  // 设置拦截器
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // 添加认证 token
        if (!(config as RequestConfig).skipAuth && !config.headers.Authorization) {
          const token = localStorage.getItem('sessionToken')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as RequestConfig

        // 处理401错误 - 尝试刷新token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken)
              if (response.data.session?.sessionToken) {
                localStorage.setItem('sessionToken', response.data.session.sessionToken)
                localStorage.setItem('refreshToken', response.data.session.refreshToken)
                localStorage.setItem('user', JSON.stringify(response.data.user))

                // 重新发送原始请求
                originalRequest.headers = originalRequest.headers || {}
                originalRequest.headers.Authorization = `Bearer ${response.data.session.sessionToken}`
                return this.axiosInstance(originalRequest)
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            // 刷新失败，清除认证信息并触发登出
            this.handleAuthFailure()
            return Promise.reject(error)
          }

          // 如果没有refresh token或刷新失败，清除认证并触发登出
          this.handleAuthFailure()
          return Promise.reject(error)
        }

        // 统一错误处理（跳过 AbortError）
        if (!originalRequest?.skipErrorHandler && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          this.handleError(error)
        }

        return Promise.reject(error)
      }
    )
  }

  // 刷新token
  private async refreshToken(refreshToken: string) {
    return this.axiosInstance.post('/api/auth/refresh', { refreshToken }, { skipAuth: true } as RequestConfig)
  }

  // 清除认证信息
  private clearAuth(): void {
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')
  }

  // 处理认证失败（token过期或无效）
  private handleAuthFailure(): void {
    console.log('[API] Authentication failed, clearing auth and redirecting to login')

    // 清除所有认证信息
    this.clearAuth()
    this.clearAuthToken()

    // 发送自定义事件，通知应用层认证失败
    window.dispatchEvent(new CustomEvent('auth:unauthorized', {
      detail: { message: '登录已过期，请重新登录' }
    }))

    // 保存当前路径用于登录后重定向
    const currentPath = window.location.pathname + window.location.search
    const redirectPath = currentPath !== '/login' ? currentPath : '/'

    // 延迟跳转，确保事件已被处理
    setTimeout(() => {
      // 跳转到登录页，携带重定向参数
      window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`
    }, 100)
  }

  // 统一错误处理
  private handleError(error: AxiosError<ApiErrorResponse>): void {
    // 跳过用户主动取消的请求
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return
    }

    // 跳过401错误（已由handleAuthFailure处理）
    if (error.response?.status === 401) {
      return
    }

    let errorMessage = '请求失败'

    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          errorMessage = data?.message || '请求参数错误'
          break
        case 403:
          errorMessage = '没有权限访问该资源'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 422:
          errorMessage = data?.message || '数据验证失败'
          break
        case 429:
          errorMessage = '请求过于频繁，请稍后再试'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        case 502:
          errorMessage = '网关错误'
          break
        case 503:
          errorMessage = '服务暂时不可用'
          break
        default:
          errorMessage = data?.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      errorMessage = '网络连接失败，请检查网络设置'
    } else {
      errorMessage = error.message || '未知错误'
    }

    message.error(errorMessage)
  }

  // 设置认证token
  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // 清除认证token
  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization']
  }

  // GET请求（带去重）
  async get<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
    // 如果配置了跳过去重，直接请求
    if (config?.skipDeduplication) {
      return this.axiosInstance.get<T>(url, config)
    }

    // 使用去重器
    return requestDeduplicator.deduplicate(
      'GET',
      url,
      (signal) => this.axiosInstance.get<T>(url, { ...config, signal })
    )
  }

  // POST请求（带去重）
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<T>> {
    // 如果配置了跳过去重，直接请求
    if (config?.skipDeduplication) {
      return this.axiosInstance.post<T>(url, data, config)
    }

    // 使用去重器
    return requestDeduplicator.deduplicate(
      'POST',
      url,
      (signal) => this.axiosInstance.post<T>(url, data, { ...config, signal }),
      data
    )
  }

  // PUT请求（带去重）
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<T>> {
    // 如果配置了跳过去重，直接请求
    if (config?.skipDeduplication) {
      return this.axiosInstance.put<T>(url, data, config)
    }

    // 使用去重器
    return requestDeduplicator.deduplicate(
      'PUT',
      url,
      (signal) => this.axiosInstance.put<T>(url, data, { ...config, signal }),
      data
    )
  }

  // PATCH请求（带去重）
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<T>> {
    // 如果配置了跳过去重，直接请求
    if (config?.skipDeduplication) {
      return this.axiosInstance.patch<T>(url, data, config)
    }

    // 使用去重器
    return requestDeduplicator.deduplicate(
      'PATCH',
      url,
      (signal) => this.axiosInstance.patch<T>(url, data, { ...config, signal }),
      data
    )
  }

  // DELETE请求（带去重）
  async delete<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
    // 如果配置了跳过去重，直接请求
    if (config?.skipDeduplication) {
      return this.axiosInstance.delete<T>(url, config)
    }

    // 使用去重器
    return requestDeduplicator.deduplicate(
      'DELETE',
      url,
      (signal) => this.axiosInstance.delete<T>(url, { ...config, signal })
    )
  }

  // 文件上传
  async upload<T = any>(url: string, file: File, config?: RequestConfig): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.axiosInstance.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  // 批量文件上传
  async uploadMultiple<T = any>(url: string, files: File[], config?: RequestConfig): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file)
    })

    return this.axiosInstance.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  // 下载文件
  async download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: 'blob'
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  // 取消请求的方法
  createCancelToken() {
    return axios.CancelToken.source()
  }

  // 获取原始axios实例（用于特殊情况）
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

// 创建默认API客户端实例
export const apiClient = new ApiClient()

// 导出便捷的API方法
export const api = {
  get: <T = any>(url: string, config?: RequestConfig) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: RequestConfig) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: RequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: RequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: RequestConfig) => apiClient.delete<T>(url, config),
  upload: <T = any>(url: string, file: File, config?: RequestConfig) => apiClient.upload<T>(url, file, config),
  uploadMultiple: <T = any>(url: string, files: File[], config?: RequestConfig) => apiClient.uploadMultiple<T>(url, files, config),
  download: (url: string, filename?: string, config?: RequestConfig) => apiClient.download(url, filename, config)
}

// 用于向后兼容的导出
export const getApiClient = () => apiClient

// 类型导出
export type { AxiosResponse, AxiosError, AxiosRequestConfig }
export { ApiClient }
