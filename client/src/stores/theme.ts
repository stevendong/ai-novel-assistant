import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { theme } from 'ant-design-vue'

export type Theme = 'light' | 'dark'
export type ThemeSetting = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>('light')
  const themeSetting = ref<ThemeSetting>('system')
  let systemThemeCleanup: (() => void) | null = null
  
  const isDark = computed(() => currentTheme.value === 'dark')
  const isSystem = computed(() => themeSetting.value === 'system')
  
  // Ant Design 主题配置
  const antdTheme = computed(() => {
    if (currentTheme.value === 'dark') {
      return {
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgBase: '#141414',
          colorBgContainer: '#1f1f1f',
          colorBgElevated: '#262626',
          colorBorder: '#303030',
          colorText: 'rgba(255, 255, 255, 0.85)',
          colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
          colorTextDisabled: 'rgba(255, 255, 255, 0.25)',
        },
      }
    } else {
      return {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#fafafa',
          colorBorder: '#f0f0f0',
          colorText: 'rgba(0, 0, 0, 0.85)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
          colorTextDisabled: 'rgba(0, 0, 0, 0.25)',
        },
      }
    }
  })
  
  const getSavedThemeSetting = (): ThemeSetting => {
    try {
      const saved = localStorage.getItem('theme-setting')
      return (saved as ThemeSetting) || 'system'
    } catch (error) {
      console.warn('Unable to access localStorage:', error)
      return 'system'
    }
  }
  
  const saveThemeSetting = (setting: ThemeSetting) => {
    try {
      localStorage.setItem('theme-setting', setting)
    } catch (error) {
      console.warn('Unable to save to localStorage:', error)
    }
  }
  
  // 获取系统主题偏好
  const getSystemTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  // 监听系统主题变化
  const watchSystemTheme = () => {
    if (typeof window === 'undefined') return
    
    // 清理现有监听器
    if (systemThemeCleanup) {
      systemThemeCleanup()
      systemThemeCleanup = null
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (themeSetting.value === 'system') {
        const systemTheme = e.matches ? 'dark' : 'light'
        setCurrentTheme(systemTheme)
      }
    }
    
    // 添加监听器
    mediaQuery.addEventListener('change', handleChange)
    
    // 保存清理函数
    systemThemeCleanup = () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }
  
  // 清理监听器
  const cleanupSystemThemeListener = () => {
    if (systemThemeCleanup) {
      systemThemeCleanup()
      systemThemeCleanup = null
    }
  }
  
  const initTheme = () => {
    const savedSetting = getSavedThemeSetting()
    setThemeSetting(savedSetting)
    
    // 开始监听系统主题变化
    watchSystemTheme()
  }
  
  // 监听设置变化，当切换到或离开system模式时管理监听器
  watch(themeSetting, (newSetting, oldSetting) => {
    if (newSetting === 'system' && oldSetting !== 'system') {
      watchSystemTheme()
    } else if (newSetting !== 'system' && oldSetting === 'system') {
      // 当从system模式切换出来时，仍然保持监听器，但只在system模式时响应
    }
  })
  
  const applyTheme = (theme: Theme) => {
    const html = document.documentElement
    
    if (theme === 'dark') {
      html.classList.add('dark')
      html.classList.remove('light')
      // 更新CSS变量
      html.style.setProperty('--theme-bg-base', '#141414')
      html.style.setProperty('--theme-bg-container', '#1f1f1f')
      html.style.setProperty('--theme-bg-elevated', '#262626')
      html.style.setProperty('--theme-border', '#303030')
      html.style.setProperty('--theme-text', 'rgba(255, 255, 255, 0.85)')
      html.style.setProperty('--theme-text-secondary', 'rgba(255, 255, 255, 0.65)')
      // 选中状态变量 - 暗黑模式
      html.style.setProperty('--theme-selected-bg', '#1a3a52')
      html.style.setProperty('--theme-selected-border', '#2b5a7a')
      html.style.setProperty('--theme-selected-hover-bg', '#234a63')
      // 图标背景变量 - 暗黑模式
      html.style.setProperty('--theme-icon-bg', '#1a3a52')
      html.style.setProperty('--theme-icon-text', '#4db8ff')
      // 编辑器变量 - 暗黑模式
      html.style.setProperty('--theme-editor-bg', '#1f1f1f')
      html.style.setProperty('--theme-editor-text', 'rgba(255, 255, 255, 0.85)')
      html.style.setProperty('--theme-editor-toolbar', '#262626')
      html.style.setProperty('--theme-editor-border', '#303030')
      html.style.setProperty('--theme-editor-preview', '#1a1a1a')
      html.style.setProperty('--theme-chapter-avatar', '#4db8ff')
      html.style.setProperty('--theme-warning-text', '#ff9a3c')
      // 编辑器内容样式变量 - 暗黑模式
      html.style.setProperty('--theme-editor-focus-bg', '#252525')
      html.style.setProperty('--theme-editor-placeholder', 'rgba(255, 255, 255, 0.35)')
      html.style.setProperty('--theme-editor-dialogue', '#6bb6ff')
      html.style.setProperty('--theme-editor-scene', 'rgba(255, 255, 255, 0.45)')
      html.style.setProperty('--theme-editor-thought', '#b19df2')
      html.style.setProperty('--theme-editor-active-btn', '#4db8ff')
      html.style.setProperty('--theme-editor-secondary-text', 'rgba(255, 255, 255, 0.55)')
      html.style.setProperty('--theme-editor-unsaved', '#ff7a7a')
      // 一致性检查变量 - 暗黑模式
      html.style.setProperty('--theme-consistency-panel-bg', '#262626')
      html.style.setProperty('--theme-consistency-hover', 'rgba(255, 255, 255, 0.08)')
      html.style.setProperty('--theme-consistency-success', '#73d13d')
      html.style.setProperty('--theme-consistency-high-bg', '#2a1a1a')
      html.style.setProperty('--theme-consistency-high-border', '#5c2d2d')
      html.style.setProperty('--theme-consistency-high-text', '#ff7875')
      html.style.setProperty('--theme-consistency-medium-bg', '#2a261a')
      html.style.setProperty('--theme-consistency-medium-border', '#5c5a2d')
      html.style.setProperty('--theme-consistency-medium-text', '#ffd666')
      html.style.setProperty('--theme-consistency-low-bg', '#1f3a1f')
      html.style.setProperty('--theme-consistency-low-border', '#2d5c2d')
      html.style.setProperty('--theme-consistency-low-text', '#73d13d')
      html.style.setProperty('--theme-consistency-link', '#4db8ff')
    } else {
      html.classList.add('light')
      html.classList.remove('dark')
      // 更新CSS变量
      html.style.setProperty('--theme-bg-base', '#ffffff')
      html.style.setProperty('--theme-bg-container', '#ffffff')
      html.style.setProperty('--theme-bg-elevated', '#fafafa')
      html.style.setProperty('--theme-border', '#f0f0f0')
      html.style.setProperty('--theme-text', 'rgba(0, 0, 0, 0.85)')
      html.style.setProperty('--theme-text-secondary', 'rgba(0, 0, 0, 0.65)')
      // 选中状态变量 - 亮色模式
      html.style.setProperty('--theme-selected-bg', '#e6f7ff')
      html.style.setProperty('--theme-selected-border', '#91d5ff')
      html.style.setProperty('--theme-selected-hover-bg', '#bae7ff')
      // 图标背景变量 - 亮色模式
      html.style.setProperty('--theme-icon-bg', '#e6f7ff')
      html.style.setProperty('--theme-icon-text', '#1890ff')
      // 编辑器变量 - 亮色模式
      html.style.setProperty('--theme-editor-bg', '#ffffff')
      html.style.setProperty('--theme-editor-text', '#333333')
      html.style.setProperty('--theme-editor-toolbar', '#fafafa')
      html.style.setProperty('--theme-editor-border', '#e8e8e8')
      html.style.setProperty('--theme-editor-preview', '#f9f9f9')
      html.style.setProperty('--theme-chapter-avatar', '#1890ff')
      html.style.setProperty('--theme-warning-text', '#ff6b35')
      // 编辑器内容样式变量 - 亮色模式
      html.style.setProperty('--theme-editor-focus-bg', '#fefefe')
      html.style.setProperty('--theme-editor-placeholder', '#bbbbbb')
      html.style.setProperty('--theme-editor-dialogue', '#2c5aa0')
      html.style.setProperty('--theme-editor-scene', '#999999')
      html.style.setProperty('--theme-editor-thought', '#7b68ee')
      html.style.setProperty('--theme-editor-active-btn', '#1890ff')
      html.style.setProperty('--theme-editor-secondary-text', '#666666')
      html.style.setProperty('--theme-editor-unsaved', '#ff6b6b')
      // 一致性检查变量 - 亮色模式
      html.style.setProperty('--theme-consistency-panel-bg', '#fafafa')
      html.style.setProperty('--theme-consistency-hover', 'rgba(0, 0, 0, 0.04)')
      html.style.setProperty('--theme-consistency-success', '#52c41a')
      html.style.setProperty('--theme-consistency-high-bg', '#fff2f0')
      html.style.setProperty('--theme-consistency-high-border', '#ffccc7')
      html.style.setProperty('--theme-consistency-high-text', '#f5222d')
      html.style.setProperty('--theme-consistency-medium-bg', '#fffbe6')
      html.style.setProperty('--theme-consistency-medium-border', '#ffe58f')
      html.style.setProperty('--theme-consistency-medium-text', '#faad14')
      html.style.setProperty('--theme-consistency-low-bg', '#f6ffed')
      html.style.setProperty('--theme-consistency-low-border', '#b7eb8f')
      html.style.setProperty('--theme-consistency-low-text', '#52c41a')
      html.style.setProperty('--theme-consistency-link', '#1890ff')
    }
  }
  
  const setCurrentTheme = (theme: Theme) => {
    currentTheme.value = theme
    applyTheme(theme)
  }
  
  const setThemeSetting = (setting: ThemeSetting) => {
    themeSetting.value = setting
    
    if (setting === 'system') {
      // 使用系统主题
      const systemTheme = getSystemTheme()
      setCurrentTheme(systemTheme)
    } else {
      // 使用指定主题
      setCurrentTheme(setting as Theme)
    }
    
    saveThemeSetting(setting)
  }
  
  const toggleTheme = () => {
    if (themeSetting.value === 'light') {
      setThemeSetting('dark')
    } else if (themeSetting.value === 'dark') {
      setThemeSetting('system')
    } else {
      setThemeSetting('light')
    }
  }
  
  return {
    currentTheme,
    themeSetting,
    isDark,
    isSystem,
    antdTheme,
    initTheme,
    toggleTheme,
    setThemeSetting,
    setCurrentTheme,
    getSystemTheme,
    cleanupSystemThemeListener
  }
})