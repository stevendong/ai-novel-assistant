import { defineStore } from 'pinia'
import {ref, computed, watch, readonly} from 'vue'
import { useClerk, useUser, useAuth } from '@clerk/vue'
import { message } from 'ant-design-vue'
import { apiClient } from '@/utils/api'

// Clerk 用户信息接口
export interface ClerkUser {
  id: string
  emailAddresses: Array<{
    emailAddress: string
    id: string
  }>
  firstName?: string
  lastName?: string
  username?: string
  imageUrl?: string
  createdAt?: number
  updatedAt?: number
}

// 简化的用户信息接口
export interface AppUser {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  displayName: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export const useClerkAuthStore = defineStore('clerkAuth', () => {
  // Clerk hooks
  const clerk = useClerk()
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn, getToken, isLoaded: authLoaded } = useAuth()

  // 本地状态
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const currentUser = ref<AppUser | null>(null)

  // 计算属性
  const isAuthenticated = computed(() => isSignedIn.value && !!currentUser.value)
  const isLoaded = computed(() => userLoaded.value && authLoaded.value)

  // 格式化用户信息
  const formatUser = (clerkUser: any): AppUser => {
    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ''
    const displayName = clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.username || clerkUser.firstName || primaryEmail.split('@')[0]

    return {
      id: clerkUser.id,
      email: primaryEmail,
      username: clerkUser.username,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      displayName,
      avatar: clerkUser.imageUrl,
      createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt).toISOString() : new Date().toISOString()
    }
  }

  // 初始化
  const init = async () => {
    if (isInitialized.value) return

    // 等待 Clerk 加载完成
    await new Promise<void>((resolve) => {
      const unwatch = watch(isLoaded, (loaded) => {
        if (loaded) {
          unwatch()
          resolve()
        }
      }, { immediate: true })
    })

    // 如果用户已登录，格式化用户信息
    if (isSignedIn.value && user.value) {
      currentUser.value = formatUser(user.value)
      await updateApiToken()
    }

    isInitialized.value = true
  }

  // 更新 API 客户端的认证令牌
  const updateApiToken = async () => {
    try {
      if (isSignedIn.value) {
        const token = await getToken()
        if (token) {
          apiClient.setAuthToken(token)
        }
      } else {
        apiClient.clearAuthToken()
      }
    } catch (error) {
      console.error('Failed to update API token:', error)
    }
  }

  // 监听用户状态变化
  watch([isSignedIn, user], async ([signedIn, clerkUser]) => {
    if (signedIn && clerkUser) {
      currentUser.value = formatUser(clerkUser)
      await updateApiToken()
    } else {
      currentUser.value = null
      apiClient.clearAuthToken()
    }
  })

  // 登录（使用 Clerk 的登录页面）
  const signIn = async () => {
    try {
      if (clerk.value) {
        await clerk.value.openSignIn()
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      message.error('登录失败')
    }
  }

  // 注册（使用 Clerk 的注册页面）
  const signUp = async () => {
    try {
      if (clerk.value) {
        await clerk.value.openSignUp()
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      message.error('注册失败')
    }
  }

  // 登出
  const signOut = async () => {
    isLoading.value = true
    try {
      if (clerk.value) {
        await clerk.value.signOut()
        currentUser.value = null
        apiClient.clearAuthToken()
        message.success('已成功登出')
      }
      return { success: true }
    } catch (error: any) {
      console.error('Sign out error:', error)
      message.error('登出失败')
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // 打开用户资料页面
  const openUserProfile = async () => {
    try {
      if (clerk.value) {
        await clerk.value.openUserProfile()
      }
    } catch (error: any) {
      console.error('Open user profile error:', error)
      message.error('打开用户资料失败')
    }
  }

  // 获取当前的认证令牌
  const getAuthToken = async (): Promise<string | null> => {
    try {
      if (isSignedIn.value) {
        return await getToken()
      }
      return null
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  // 检查用户权限（可根据需要扩展）
  const hasPermission = (permission: string): boolean => {
    // 基础实现，可根据需要扩展
    return isAuthenticated.value
  }

  // 获取用户的显示名称
  const getDisplayName = (): string => {
    if (!currentUser.value) return '未登录用户'
    return currentUser.value.displayName
  }

  // 获取用户头像 URL
  const getAvatarUrl = (): string | undefined => {
    return currentUser.value?.avatar
  }

  // 向后兼容的方法
  const login = signIn
  const register = signUp
  const logout = signOut

  return {
    // 状态
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    currentUser: readonly(currentUser),

    // 计算属性
    isAuthenticated,
    isLoaded,

    // Clerk 原始数据访问
    user: readonly(user),
    isSignedIn: readonly(isSignedIn),

    // 方法
    init,
    signIn,
    signUp,
    signOut,
    openUserProfile,
    getAuthToken,
    updateApiToken,
    hasPermission,
    getDisplayName,
    getAvatarUrl,

    // 向后兼容
    login,
    register,
    logout,

    // API客户端访问
    apiClient
  }
})
