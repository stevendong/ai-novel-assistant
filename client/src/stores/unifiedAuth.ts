import { defineStore } from 'pinia'
import { ref, computed, watch, readonly } from 'vue'
import { authConfig, type AuthMode } from '@/config/authConfig'

// 统一的用户接口
export interface UnifiedUser {
  id: string
  email: string
  username?: string
  displayName: string
  firstName?: string
  lastName?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

// 统一的认证状态接口
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  user: UnifiedUser | null
  authMode: AuthMode
}

// 统一的认证操作接口
export interface AuthActions {
  init(): Promise<void>
  signIn(): Promise<{ success: boolean; error?: string }>
  signUp(): Promise<{ success: boolean; error?: string }>
  signOut(): Promise<{ success: boolean; error?: string }>
  getAuthToken(): Promise<string | null>
  openUserProfile?(): Promise<void>
}

export const useUnifiedAuthStore = defineStore('unifiedAuth', () => {
  // 状态
  const currentAuthMode = ref<AuthMode>(authConfig.getAuthMode())
  const activeAuthStore = ref<any>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const switchingMode = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => activeAuthStore.value?.isAuthenticated || false)
  const user = computed((): UnifiedUser | null => {
    if (!activeAuthStore.value?.currentUser && !activeAuthStore.value?.user) {
      return null
    }

    // 根据当前模式格式化用户数据
    const rawUser = activeAuthStore.value.currentUser || activeAuthStore.value.user

    if (currentAuthMode.value === 'clerk') {
      return formatClerkUser(rawUser)
    } else {
      return formatLegacyUser(rawUser)
    }
  })

  const authState = computed((): AuthState => ({
    isAuthenticated: isAuthenticated.value,
    isLoading: isLoading.value || activeAuthStore.value?.isLoading || false,
    isInitialized: isInitialized.value && (activeAuthStore.value?.isInitialized || false),
    user: user.value,
    authMode: currentAuthMode.value
  }))

  // 格式化 Clerk 用户数据
  function formatClerkUser(clerkUser: any): UnifiedUser {
    if (!clerkUser) return null

    const primaryEmail = clerkUser.email || clerkUser.emailAddresses?.[0]?.emailAddress || ''
    const displayName = clerkUser.displayName ||
      (clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username || clerkUser.firstName || primaryEmail.split('@')[0])

    return {
      id: clerkUser.id,
      email: primaryEmail,
      username: clerkUser.username,
      displayName,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatar: clerkUser.avatar || clerkUser.imageUrl,
      createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt).toISOString() : new Date().toISOString()
    }
  }

  // 格式化传统用户数据
  function formatLegacyUser(legacyUser: any): UnifiedUser {
    if (!legacyUser) return null

    return {
      id: legacyUser.id,
      email: legacyUser.email,
      username: legacyUser.username,
      displayName: legacyUser.nickname || legacyUser.username || legacyUser.email?.split('@')[0] || 'User',
      firstName: legacyUser.firstName,
      lastName: legacyUser.lastName,
      avatar: legacyUser.avatar,
      createdAt: legacyUser.createdAt || new Date().toISOString(),
      updatedAt: legacyUser.updatedAt || new Date().toISOString()
    }
  }

  // 加载对应的认证 store
  async function loadAuthStore(mode: AuthMode) {
    try {
      if (mode === 'clerk') {
        const { useClerkAuthStore } = await import('@/stores/clerkAuth')
        return useClerkAuthStore()
      } else {
        const { useAuthStore } = await import('@/stores/auth')
        return useAuthStore()
      }
    } catch (error) {
      console.error(`Failed to load auth store for mode: ${mode}`, error)
      throw error
    }
  }

  // 初始化
  async function init(): Promise<void> {
    if (isInitialized.value && !switchingMode.value) return

    isLoading.value = true

    try {
      const mode = authConfig.getAuthMode()
      currentAuthMode.value = mode

      // 加载对应的认证 store
      activeAuthStore.value = await loadAuthStore(mode)

      // 初始化认证 store
      if (activeAuthStore.value?.init) {
        await activeAuthStore.value.init()
      }

      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize unified auth store:', error)
      throw error
    } finally {
      isLoading.value = false
      switchingMode.value = false
    }
  }

  // 切换认证模式
  async function switchAuthMode(newMode: AuthMode): Promise<boolean> {
    if (switchingMode.value) {
      console.warn('Auth mode switching already in progress')
      return false
    }

    if (!authConfig.allowsModeSwitch()) {
      console.warn('Auth mode switching is not allowed')
      return false
    }

    if (newMode === currentAuthMode.value) {
      console.log('Already in the requested auth mode')
      return true
    }

    switchingMode.value = true
    isLoading.value = true

    try {
      // 登出当前认证系统
      if (isAuthenticated.value && activeAuthStore.value?.signOut) {
        await activeAuthStore.value.signOut()
      }

      // 清理认证数据
      authConfig.clearAuthData()

      // 更新配置
      const success = authConfig.setAuthMode(newMode)
      if (!success) {
        throw new Error(`Failed to set auth mode to ${newMode}`)
      }

      // 重新初始化
      isInitialized.value = false
      await init()

      console.log(`Successfully switched to ${newMode} auth mode`)
      return true
    } catch (error) {
      console.error('Failed to switch auth mode:', error)
      switchingMode.value = false
      isLoading.value = false
      return false
    }
  }

  // 登录
  async function signIn(): Promise<{ success: boolean; error?: string }> {
    if (!activeAuthStore.value) {
      return { success: false, error: 'Auth store not initialized' }
    }

    try {
      if (currentAuthMode.value === 'clerk') {
        await activeAuthStore.value.signIn()
        return { success: true }
      } else {
        // 对于传统模式，重定向到登录页面
        const loginRoute = authConfig.getLoginRoute()
        window.location.href = loginRoute
        return { success: true }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' }
    }
  }

  // 注册
  async function signUp(): Promise<{ success: boolean; error?: string }> {
    if (!activeAuthStore.value) {
      return { success: false, error: 'Auth store not initialized' }
    }

    try {
      if (currentAuthMode.value === 'clerk') {
        await activeAuthStore.value.signUp()
        return { success: true }
      } else {
        // 对于传统模式，重定向到注册页面
        const signupRoute = authConfig.getSignupRoute()
        window.location.href = signupRoute
        return { success: true }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed' }
    }
  }

  // 登出
  async function signOut(): Promise<{ success: boolean; error?: string }> {
    if (!activeAuthStore.value) {
      return { success: false, error: 'Auth store not initialized' }
    }

    try {
      const result = await activeAuthStore.value.signOut()
      return result || { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign out failed' }
    }
  }

  // 获取认证 token
  async function getAuthToken(): Promise<string | null> {
    if (!activeAuthStore.value) return null

    try {
      if (activeAuthStore.value.getAuthToken) {
        return await activeAuthStore.value.getAuthToken()
      }
      return null
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  // 打开用户资料页面
  async function openUserProfile(): Promise<void> {
    if (!activeAuthStore.value) return

    try {
      if (currentAuthMode.value === 'clerk' && activeAuthStore.value.openUserProfile) {
        await activeAuthStore.value.openUserProfile()
      } else {
        // 对于传统模式，可以打开自定义的用户资料页面
        const profileRoute = authConfig.getProfileRoute()
        if (profileRoute) {
          window.location.href = profileRoute
        }
      }
    } catch (error) {
      console.error('Failed to open user profile:', error)
    }
  }

  // 获取用户显示名称
  function getDisplayName(): string {
    return user.value?.displayName || 'User'
  }

  // 获取用户头像
  function getAvatarUrl(): string | undefined {
    return user.value?.avatar
  }

  // 检查权限
  function hasPermission(permission: string): boolean {
    if (activeAuthStore.value?.hasPermission) {
      return activeAuthStore.value.hasPermission(permission)
    }
    // 默认返回是否已认证
    return isAuthenticated.value
  }

  // 监听认证配置变化
  authConfig.addListener(async (config) => {
    if (config.mode !== currentAuthMode.value) {
      console.log(`Auth config changed, switching to ${config.mode} mode`)
      await switchAuthMode(config.mode)
    }
  })

  return {
    // 状态
    authState: readonly(authState),
    isAuthenticated,
    isLoading: computed(() => isLoading.value || switchingMode.value),
    isInitialized,
    user: readonly(user),
    currentAuthMode: readonly(currentAuthMode),
    switchingMode: readonly(switchingMode),

    // 方法
    init,
    switchAuthMode,
    signIn,
    signUp,
    signOut,
    getAuthToken,
    openUserProfile,
    getDisplayName,
    getAvatarUrl,
    hasPermission,

    // 配置相关
    authConfig: readonly(authConfig.getConfig()),
    availableModes: computed(() => authConfig.getAvailableModes()),
    allowsModeSwitch: computed(() => authConfig.allowsModeSwitch()),
    supportsSocialLogin: computed(() => authConfig.supportsSocialLogin()),
    supportsEmailVerification: computed(() => authConfig.supportsEmailVerification()),

    // 原始 store 访问（用于特殊情况）
    getActiveAuthStore: () => activeAuthStore.value
  }
})