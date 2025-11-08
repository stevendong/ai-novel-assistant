import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import MainLayout from '@/components/layout/MainLayout.vue'
import Login from '@/views/Login.vue'
import InviteVerification from '@/views/InviteVerification.vue'
import ProjectManagement from '@/components/novel/ProjectManagement.vue'
import CharacterManagement from '@/components/character/CharacterManagement.vue'
import WorldSettingManagement from '@/components/worldsetting/WorldSettingManagement.vue'
import ChapterEditorView from '@/views/ChapterEditorView.vue'
import ChapterList from '@/views/ChapterList.vue'
import ProgressStats from '@/components/novel/ProgressStats.vue'
import FileManagement from '@/components/file/FileManagement.vue'
import GitHubCallback from '@/views/auth/GitHubCallback.vue'
import AILogsViewer from '@/components/ai-logs/AILogsViewer.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: {
        requiresGuest: true,
        titleKey: 'auth.loginTitle'
      }
    },
    {
      path: '/auth/github/callback',
      name: 'GitHubCallback',
      component: GitHubCallback,
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/invite-verification',
      name: 'inviteVerification',
      component: InviteVerification,
      meta: {
        requiresAuth: true,
        requiresUnverified: true,
        titleKey: 'auth.inviteVerification.title'
      }
    },
    {
      path: '/',
      component: MainLayout,
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: '',
          redirect: '/project'
        },
        {
          path: '/project',
          name: 'project',
          component: ProjectManagement,
          meta: {
            title: '作品信息',
            icon: 'BookOutlined',
            titleKey: 'nav.project'
          }
        },
        {
          path: '/characters',
          name: 'characters',
          component: CharacterManagement,
          meta: {
            title: '角色库',
            icon: 'TeamOutlined',
            titleKey: 'nav.characters'
          }
        },
        {
          path: '/worldsettings',
          name: 'worldSettings',
          component: WorldSettingManagement,
          meta: {
            title: '世界设定',
            icon: 'GlobalOutlined',
            titleKey: 'nav.worldSettings'
          }
        },
        {
          path: '/chapters',
          name: 'chapters',
          component: ChapterList,
          meta: {
            title: '章节列表',
            icon: 'FileTextOutlined',
            titleKey: 'nav.chapters'
          }
        },
        {
          path: '/chapter/:id',
          name: 'chapter',
          component: ChapterEditorView,
          meta: {
            title: '章节编辑',
            icon: 'FileTextOutlined',
            hidden: true, // Don't show in navigation menu
            titleKey: 'nav.chapters'
          }
        },
        {
          path: '/progress',
          name: 'progress',
          component: ProgressStats,
          meta: {
            title: '进度统计',
            icon: 'BarChartOutlined',
            titleKey: 'nav.progress'
          }
        },
        {
          path: '/files',
          name: 'files',
          component: FileManagement,
          meta: {
            title: '文件管理',
            icon: 'FolderOutlined',
            titleKey: 'nav.files'
          }
        },
        {
          path: '/ai-logs',
          name: 'aiLogs',
          component: AILogsViewer,
          meta: {
            title: 'AI调用日志',
            icon: 'HistoryOutlined',
            titleKey: 'nav.aiLogs'
          }
        },
        {
          path: '/profile',
          name: 'userProfile',
          component: () => import('@/views/user/UserProfile.vue'),
          meta: {
            title: '个人资料',
            icon: 'UserOutlined',
            hidden: true,
            titleKey: 'profile.header.title'
          }
        },
        {
          path: '/admin/dashboard',
          name: 'adminDashboard',
          component: () => import('@/views/admin/AdminDashboard.vue'),
          meta: {
            title: '管理面板',
            icon: 'SettingOutlined',
            requiresAdmin: true,
            titleKey: 'nav.adminDashboard'
          }
        },
        {
          path: '/admin/invites',
          name: 'inviteManagement',
          component: () => import('@/views/admin/InviteManagement.vue'),
          meta: {
            title: '邀请码管理',
            icon: 'GiftOutlined',
            requiresAdmin: true,
            titleKey: 'nav.inviteManagement'
          }
        },
        {
          path: '/admin/users',
          name: 'userManagement',
          component: () => import('@/views/admin/UserManagement.vue'),
          meta: {
            title: '用户管理',
            icon: 'UserOutlined',
            requiresAdmin: true,
            titleKey: 'nav.userManagement'
          }
        }
      ]
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const { hasAdminAccess } = usePermissions()

  // 初始化认证状态
  await authStore.init()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresUnverified = to.matched.some(record => record.meta.requiresUnverified)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  console.log('[Router] Navigation guard - Auth state:', {
    to: to.path,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user ? {
      id: authStore.user.id,
      username: authStore.user.username,
      inviteVerified: authStore.user.inviteVerified
    } : null,
    requiresAuth,
    requiresGuest,
    requiresUnverified,
    requiresAdmin
  })

  // 如果需要认证但未登录，跳转到登录页
  if (requiresAuth && !authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 如果是访客页面但已登录，跳转到主页或邀请码验证页
  if (requiresGuest && authStore.isAuthenticated) {
    // 检查是否需要验证邀请码
    if (!authStore.user?.inviteVerified) {
      next('/invite-verification')
    } else {
      next('/')
    }
    return
  }

  // 如果页面需要未验证状态但用户已验证，跳转到主页
  if (requiresUnverified && authStore.user?.inviteVerified) {
    console.log('[Router] User already verified, redirecting to home')
    next('/')
    return
  }

  // 如果已登录但未验证邀请码，且不是邀请码验证页面，跳转到邀请码验证页
  if (authStore.isAuthenticated && !authStore.user?.inviteVerified && to.name !== 'inviteVerification') {
    console.log('[Router] User not verified, redirecting to invite verification')
    next('/invite-verification')
    return
  }

  // 如果需要管理员权限但用户不是管理员，返回403错误或跳转到主页
  if (requiresAdmin && !hasAdminAccess.value) {
    // 可以跳转到403页面，这里简单跳转到主页
    next('/')
    return
  }

  next()
})

export default router
