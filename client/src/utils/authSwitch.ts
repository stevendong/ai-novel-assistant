// 认证系统切换工具
export const AuthConfig = {
  // 检测是否启用 Clerk
  isClerkEnabled(): boolean {
    return !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  },

  // 获取当前认证系统类型
  getAuthType(): 'clerk' | 'legacy' {
    return this.isClerkEnabled() ? 'clerk' : 'legacy'
  },

  // 获取登录路由
  getLoginRoute(): string {
    return this.isClerkEnabled() ? '/login' : '/legacy-login'
  },

  // 获取注册路由
  getSignupRoute(): string {
    return this.isClerkEnabled() ? '/signup' : '/legacy-login'
  },

  // 获取认证存储键名
  getAuthStoreKey(): string {
    return this.isClerkEnabled() ? 'clerkAuth' : 'auth'
  },

  // 清理认证数据（切换系统时使用）
  clearAuthData(): void {
    // 清理传统认证数据
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')

    // 清理 Clerk 数据会由 Clerk 自动处理
  },

  // 检查功能支持
  getFeatureSupport() {
    const isClerk = this.isClerkEnabled()

    return {
      socialLogin: isClerk, // 只有 Clerk 支持社交登录
      emailVerification: isClerk, // Clerk 自动处理邮箱验证
      profileManagement: isClerk, // Clerk 提供内置的用户资料管理
      multiFactorAuth: isClerk, // Clerk 支持 MFA
      sessionManagement: true, // 两种系统都支持
      passwordReset: isClerk, // Clerk 自动处理密码重置
    }
  },

  // 获取用户显示信息
  getUserDisplayInfo(user: any) {
    if (this.isClerkEnabled()) {
      // Clerk 用户格式
      return {
        name: user?.displayName || user?.firstName || user?.username || 'User',
        email: user?.email || user?.primaryEmailAddress?.emailAddress || '',
        avatar: user?.avatar || user?.imageUrl || null,
        id: user?.id || '',
      }
    } else {
      // 传统用户格式
      return {
        name: user?.nickname || user?.username || 'User',
        email: user?.email || '',
        avatar: user?.avatar || null,
        id: user?.id || '',
      }
    }
  }
}

// 认证状态监听器
export class AuthStateListener {
  private listeners: Array<(authType: 'clerk' | 'legacy', isAuthenticated: boolean) => void> = []

  // 添加监听器
  addListener(callback: (authType: 'clerk' | 'legacy', isAuthenticated: boolean) => void) {
    this.listeners.push(callback)
  }

  // 移除监听器
  removeListener(callback: (authType: 'clerk' | 'legacy', isAuthenticated: boolean) => void) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 通知所有监听器
  notify(authType: 'clerk' | 'legacy', isAuthenticated: boolean) {
    this.listeners.forEach(callback => callback(authType, isAuthenticated))
  }
}

// 全局认证状态监听器实例
export const authStateListener = new AuthStateListener()

// 认证系统工厂函数
export async function createAuthStore() {
  if (AuthConfig.isClerkEnabled()) {
    const { useClerkAuthStore } = await import('@/stores/clerkAuth')
    return useClerkAuthStore()
  } else {
    const { useAuthStore } = await import('@/stores/auth')
    return useAuthStore()
  }
}

// 认证路由守卫
export async function createAuthGuard() {
  const authStore = await createAuthStore()

  return async (to: any, from: any, next: any) => {
    // 等待认证状态初始化
    await authStore.init()

    const requiresAuth = to.matched.some((record: any) => record.meta.requiresAuth)
    const requiresGuest = to.matched.some((record: any) => record.meta.requiresGuest)

    const isAuthenticated = authStore.isAuthenticated

    if (requiresAuth && !isAuthenticated) {
      next({
        path: AuthConfig.getLoginRoute(),
        query: { redirect: to.fullPath }
      })
    } else if (requiresGuest && isAuthenticated) {
      next('/')
    } else {
      next()
    }

    // 通知认证状态监听器
    authStateListener.notify(AuthConfig.getAuthType(), isAuthenticated)
  }
}

// 开发者工具（仅开发环境）
if (import.meta.env.DEV) {
  (window as any).__AUTH_DEBUG__ = {
    AuthConfig,
    authStateListener,
    switchToClerk: () => {
      console.log('To switch to Clerk:')
      console.log('1. Set VITE_CLERK_PUBLISHABLE_KEY in .env file')
      console.log('2. Restart the development server')
    },
    switchToLegacy: () => {
      console.log('To switch to Legacy auth:')
      console.log('1. Remove or comment out VITE_CLERK_PUBLISHABLE_KEY in .env file')
      console.log('2. Restart the development server')
    },
    clearAllAuth: () => {
      AuthConfig.clearAuthData()
      console.log('All authentication data cleared')
    }
  }
}