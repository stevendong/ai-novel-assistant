import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { message } from 'ant-design-vue'
import { apiClient, type ApiResponse } from '@/utils/api'

// 用户信息接口
export interface User {
  id: string
  username: string
  email: string
  nickname?: string
  avatar?: string
  role: string
  createdAt: string
  updatedAt: string
  inviteVerified?: boolean
}

// 会话信息接口
export interface Session {
  sessionToken: string
  refreshToken: string
  expiresAt: string
}

// 认证响应接口
export interface AuthResponse {
  user: User
  session: Session
  message?: string
}

// 注册数据接口
export interface RegisterData {
  username: string
  email: string
  password: string
  nickname?: string
}

// 登录凭据接口
export interface LoginCredentials {
  email: string
  password: string
}

// 个人资料更新数据接口
export interface ProfileUpdateData {
  nickname?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

// API响应类型
type AuthApiResponse<T = any> = ApiResponse<T>

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const sessionToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref<boolean>(false)
  const isInitialized = ref<boolean>(false)

  // 计算属性
  const isAuthenticated = computed(() => !!user.value && !!sessionToken.value)

  // 初始化认证状态
  const init = async (): Promise<void> => {
    if (isInitialized.value) return

    const storedUser = localStorage.getItem('user')
    const storedSessionToken = localStorage.getItem('sessionToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (storedUser && storedSessionToken && storedRefreshToken) {
      try {
        user.value = JSON.parse(storedUser) as User
        sessionToken.value = storedSessionToken
        refreshToken.value = storedRefreshToken

        // 设置API客户端的认证token
        apiClient.setAuthToken(storedSessionToken)

        // 异步获取最新的用户状态以确保数据同步
        try {
          console.log('[Auth] Fetching latest profile during init...')
          await fetchProfile()
          console.log('[Auth] Profile fetched successfully, user:', user.value)
        } catch (error) {
          console.warn('Failed to fetch latest profile during init:', error)
          // 如果获取失败，使用本地存储的数据继续
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        clearAuth()
      }
    }

    isInitialized.value = true
  }

  // 设置认证数据
  const setAuthData = (authData: AuthResponse): void => {
    user.value = authData.user
    sessionToken.value = authData.session.sessionToken
    refreshToken.value = authData.session.refreshToken

    // 保存到localStorage
    localStorage.setItem('user', JSON.stringify(authData.user))
    localStorage.setItem('sessionToken', authData.session.sessionToken)
    localStorage.setItem('refreshToken', authData.session.refreshToken)

    // 设置API客户端的认证token
    apiClient.setAuthToken(authData.session.sessionToken)
  }

  // 清除认证数据
  const clearAuth = (): void => {
    user.value = null
    sessionToken.value = null
    refreshToken.value = null

    // 清除localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')

    // 清除API客户端的认证token
    apiClient.clearAuthToken()
  }

  // 注册
  const register = async (userData: RegisterData): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
    isLoading.value = true
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', userData)
      setAuthData(response.data)
      message.success(response.data.message || 'Account created successfully!')
      return { success: true, data: response.data }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Registration failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 登录
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
    isLoading.value = true
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials)
      setAuthData(response.data)
      message.success(response.data.message || '登录成功!')
      return { success: true, data: response.data }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '登录失败！'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    try {
      if (sessionToken.value) {
        await apiClient.post('/api/auth/logout')
      }
      clearAuth()
      message.success('登出成功！')
      return { success: true }
    } catch (error: any) {
      console.error('Logout error:', error)
      clearAuth() // 即使登出API失败也要清除本地数据
      return { success: true }
    } finally {
      isLoading.value = false
    }
  }

  // 刷新会话
  const refreshSession = async (): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
    if (!refreshToken.value) {
      clearAuth()
      return { success: false, error: 'No refresh token' }
    }

    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
        refreshToken: refreshToken.value
      }, { skipAuth: true })
      setAuthData(response.data)
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error('Token refresh failed:', error)
      clearAuth()
      return { success: false, error: error.response?.data?.message || 'Token refresh failed' }
    }
  }

  // 更新个人资料
  const updateProfile = async (profileData: ProfileUpdateData): Promise<{ success: boolean; data?: { user: User; message?: string }; error?: string }> => {
    isLoading.value = true
    try {
      const response = await apiClient.put<{ user: User; message?: string }>('/api/auth/profile', profileData)
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(response.data.user))
      message.success(response.data.message || 'Profile updated successfully!')
      return { success: true, data: response.data }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Profile update failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 更新用户信息（用于头像上传等场景）
  const updateUserInfo = (updatedUser: User): void => {
    user.value = updatedUser
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  // 获取用户资料
  const fetchProfile = async (): Promise<{ success: boolean; data?: { user: User }; error?: string }> => {
    if (!sessionToken.value) return { success: false, error: 'Not authenticated' }

    try {
      const response = await apiClient.get<{ user: User }>('/api/auth/me')
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(response.data.user))
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error('Fetch profile error:', error)

      if (error.response?.status === 401) {
        // 尝试刷新token
        const refreshResult = await refreshSession()
        if (refreshResult.success) {
          // 刷新成功后重新获取用户资料
          return fetchProfile()
        } else {
          clearAuth()
        }
      }

      return { success: false, error: error.response?.data?.message || 'Failed to fetch profile' }
    }
  }

  // 删除账户
  const deleteAccount = async (password: string): Promise<{ success: boolean; data?: { message?: string }; error?: string }> => {
    isLoading.value = true
    try {
      const response = await apiClient.delete<{ message?: string }>('/api/auth/account', {
        data: { password }
      })
      clearAuth()
      message.success(response.data.message || 'Account deleted successfully')
      return { success: true, data: response.data }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Account deletion failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 登出所有会话
  const logoutAllSessions = async (): Promise<{ success: boolean; data?: { message?: string }; error?: string }> => {
    isLoading.value = true
    try {
      const response = await apiClient.post<{ message?: string }>('/api/auth/logout-all')
      clearAuth()
      message.success(response.data.message || 'All sessions logged out successfully')
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error('Logout all sessions error:', error)
      clearAuth() // 即使API失败也要清除本地数据
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Logout all sessions failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 检查用户名是否可用
  const checkUsernameAvailability = async (username: string): Promise<{ available: boolean; error?: string }> => {
    try {
      const response = await apiClient.get<{ available: boolean }>(`/api/auth/check-username/${username}`, { skipAuth: true })
      return { available: response.data.available }
    } catch (error: any) {
      console.error('Username check error:', error)
      return { available: false, error: error.response?.data?.message || 'Failed to check username' }
    }
  }

  // 检查邮箱是否可用
  const checkEmailAvailability = async (email: string): Promise<{ available: boolean; error?: string }> => {
    try {
      const response = await apiClient.get<{ available: boolean }>(`/api/auth/check-email/${email}`, { skipAuth: true })
      return { available: response.data.available }
    } catch (error: any) {
      console.error('Email check error:', error)
      return { available: false, error: error.response?.data?.message || 'Failed to check email' }
    }
  }

  return {
    // 状态
    user: readonly(user),
    sessionToken: readonly(sessionToken),
    refreshToken: readonly(refreshToken),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),

    // 计算属性
    isAuthenticated,

    // 方法
    init,
    register,
    login,
    logout,
    refreshSession,
    updateProfile,
    updateUserInfo,
    updateUser: updateUserInfo, // 别名
    fetchProfile,
    deleteAccount,
    logoutAllSessions,
    checkUsernameAvailability,
    checkEmailAvailability,
    clearAuth,

    // 向后兼容 - 提供apiClient访问
    apiClient
  }
})
