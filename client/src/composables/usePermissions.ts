import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface User {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
}

export const usePermissions = () => {
  const authStore = useAuthStore()

  // 检查是否为管理员
  const isAdmin = computed(() => {
    return authStore.user?.role === 'admin'
  })

  // 检查是否为普通用户
  const isUser = computed(() => {
    return authStore.user?.role === 'user'
  })

  // 检查是否有管理员权限
  const hasAdminAccess = computed(() => {
    return authStore.isAuthenticated && isAdmin.value
  })

  // 检查是否可以访问用户管理
  const canManageUsers = computed(() => {
    return hasAdminAccess.value
  })

  // 检查是否可以访问系统设置
  const canManageSystem = computed(() => {
    return hasAdminAccess.value
  })

  // 检查是否可以查看管理员面板
  const canAccessAdminPanel = computed(() => {
    return hasAdminAccess.value
  })

  // 权限守卫函数
  const requireAdmin = (): boolean => {
    if (!hasAdminAccess.value) {
      throw new Error('Admin access required')
    }
    return true
  }

  return {
    isAdmin,
    isUser,
    hasAdminAccess,
    canManageUsers,
    canManageSystem,
    canAccessAdminPanel,
    requireAdmin
  }
}