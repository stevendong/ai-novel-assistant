export type AuthMode = 'clerk' | 'legacy' | 'auto'

export interface AuthConfig {
  mode: AuthMode
  clerkPublishableKey?: string
  enableSocialLogin?: boolean
  enableEmailVerification?: boolean
  allowModeSwitch?: boolean
  defaultLoginRoute?: string
  defaultSignupRoute?: string
}

// 默认配置
const defaultConfig: AuthConfig = {
  mode: 'auto', // 自动检测
  enableSocialLogin: true,
  enableEmailVerification: true,
  allowModeSwitch: true,
  defaultLoginRoute: '/login',
  defaultSignupRoute: '/signup'
}

class AuthConfigManager {
  private config: AuthConfig
  private listeners: Array<(config: AuthConfig) => void> = []

  constructor() {
    this.config = { ...defaultConfig }
    this.loadFromEnv()
    this.loadFromStorage()
  }

  // 从环境变量加载配置
  private loadFromEnv(): void {
    const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

    if (clerkKey) {
      this.config.clerkPublishableKey = clerkKey

      // 如果是 auto 模式，有 Clerk 密钥就使用 Clerk
      if (this.config.mode === 'auto') {
        this.config.mode = 'clerk'
      }
    } else if (this.config.mode === 'auto') {
      this.config.mode = 'legacy'
    }

    // 其他环境变量配置
    this.config.enableSocialLogin = import.meta.env.VITE_ENABLE_SOCIAL_LOGIN !== 'false'
    this.config.enableEmailVerification = import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION !== 'false'
    this.config.allowModeSwitch = import.meta.env.VITE_ALLOW_AUTH_MODE_SWITCH !== 'false'
  }

  // 从本地存储加载用户偏好
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('auth_config_preference')
      if (stored) {
        const preference = JSON.parse(stored)

        // 只在允许切换且有有效偏好时应用
        if (this.config.allowModeSwitch && (preference.mode === 'clerk' || preference.mode === 'legacy')) {
          // 验证是否可以使用首选模式
          if (preference.mode === 'clerk' && this.config.clerkPublishableKey) {
            this.config.mode = 'clerk'
          } else if (preference.mode === 'legacy') {
            this.config.mode = 'legacy'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load auth config from storage:', error)
    }
  }

  // 保存用户偏好到本地存储
  private saveToStorage(): void {
    try {
      localStorage.setItem('auth_config_preference', JSON.stringify({
        mode: this.config.mode,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn('Failed to save auth config to storage:', error)
    }
  }

  // 获取当前配置
  getConfig(): Readonly<AuthConfig> {
    return { ...this.config }
  }

  // 获取当前认证模式
  getAuthMode(): AuthMode {
    return this.config.mode
  }

  // 检查是否为 Clerk 模式
  isClerkMode(): boolean {
    return this.config.mode === 'clerk' && !!this.config.clerkPublishableKey
  }

  // 检查是否为传统模式
  isLegacyMode(): boolean {
    return this.config.mode === 'legacy'
  }

  // 检查是否支持社交登录
  supportsSocialLogin(): boolean {
    return this.isClerkMode() && this.config.enableSocialLogin
  }

  // 检查是否支持邮箱验证
  supportsEmailVerification(): boolean {
    return this.isClerkMode() && this.config.enableEmailVerification
  }

  // 检查是否允许模式切换
  allowsModeSwitch(): boolean {
    return this.config.allowModeSwitch && !!this.config.clerkPublishableKey
  }

  // 设置认证模式
  setAuthMode(mode: AuthMode): boolean {
    if (!this.allowsModeSwitch()) {
      console.warn('Auth mode switching is not allowed')
      return false
    }

    // 验证模式是否可用
    if (mode === 'clerk' && !this.config.clerkPublishableKey) {
      console.warn('Cannot switch to Clerk mode: no publishable key configured')
      return false
    }

    if (mode === 'auto') {
      mode = this.config.clerkPublishableKey ? 'clerk' : 'legacy'
    }

    const oldMode = this.config.mode
    this.config.mode = mode

    // 保存到本地存储
    this.saveToStorage()

    // 通知监听器
    this.notifyListeners()

    console.log(`Auth mode switched from ${oldMode} to ${mode}`)
    return true
  }

  // 获取登录路由
  getLoginRoute(): string {
    if (this.isClerkMode()) {
      return '/login' // Clerk 登录页面
    } else {
      return '/legacy-login' // 传统登录页面
    }
  }

  // 获取注册路由
  getSignupRoute(): string {
    if (this.isClerkMode()) {
      return '/signup' // Clerk 注册页面
    } else {
      return '/legacy-login' // 传统登录页面（包含注册功能）
    }
  }

  // 获取用户资料路由
  getProfileRoute(): string {
    if (this.isClerkMode()) {
      return null // Clerk 使用内置的用户资料页面
    } else {
      return '/profile' // 传统用户资料页面
    }
  }

  // 清理认证数据
  clearAuthData(): void {
    // 清理传统认证数据
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')

    // 清理 Clerk 数据（如果使用的话）
    if (this.isClerkMode()) {
      // Clerk 数据会由 Clerk SDK 自动处理
      console.log('Clerk auth data will be cleared by Clerk SDK')
    }
  }

  // 获取可用的认证模式
  getAvailableModes(): AuthMode[] {
    const modes: AuthMode[] = ['legacy']

    if (this.config.clerkPublishableKey) {
      modes.push('clerk')
    }

    return modes
  }

  // 添加配置变更监听器
  addListener(callback: (config: AuthConfig) => void): void {
    this.listeners.push(callback)
  }

  // 移除配置变更监听器
  removeListener(callback: (config: AuthConfig) => void): void {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getConfig())
      } catch (error) {
        console.error('Error in auth config listener:', error)
      }
    })
  }

  // 重置配置
  reset(): void {
    this.config = { ...defaultConfig }
    this.loadFromEnv()
    localStorage.removeItem('auth_config_preference')
    this.notifyListeners()
  }

  // 获取认证模式显示名称
  getAuthModeDisplayName(mode?: AuthMode): string {
    const targetMode = mode || this.config.mode

    switch (targetMode) {
      case 'clerk':
        return 'Clerk 认证'
      case 'legacy':
        return '传统认证'
      case 'auto':
        return '自动选择'
      default:
        return '未知模式'
    }
  }

  // 获取认证模式描述
  getAuthModeDescription(mode?: AuthMode): string {
    const targetMode = mode || this.config.mode

    switch (targetMode) {
      case 'clerk':
        return '现代化认证服务，支持社交登录、邮箱验证等功能'
      case 'legacy':
        return '传统的邮箱密码认证方式'
      case 'auto':
        return '根据配置自动选择最佳认证方式'
      default:
        return ''
    }
  }
}

// 单例实例
export const authConfig = new AuthConfigManager()

// 便捷函数
export const getCurrentAuthMode = () => authConfig.getAuthMode()
export const isClerkMode = () => authConfig.isClerkMode()
export const isLegacyMode = () => authConfig.isLegacyMode()
export const switchAuthMode = (mode: AuthMode) => authConfig.setAuthMode(mode)
export const getLoginRoute = () => authConfig.getLoginRoute()
export const getSignupRoute = () => authConfig.getSignupRoute()

// 开发者工具（仅开发环境）
if (import.meta.env.DEV) {
  (window as any).__AUTH_CONFIG__ = {
    authConfig,
    getCurrentMode: getCurrentAuthMode,
    isClerkMode,
    isLegacyMode,
    switchAuthMode,
    getAvailableModes: () => authConfig.getAvailableModes(),
    reset: () => authConfig.reset(),
    info: () => {
      console.table({
        'Current Mode': authConfig.getAuthModeDisplayName(),
        'Clerk Available': !!authConfig.getConfig().clerkPublishableKey,
        'Allow Switch': authConfig.allowsModeSwitch(),
        'Social Login': authConfig.supportsSocialLogin(),
        'Email Verification': authConfig.supportsEmailVerification(),
        'Available Modes': authConfig.getAvailableModes().join(', ')
      })
    }
  }
}