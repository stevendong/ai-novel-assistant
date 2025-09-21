import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import Login from '@/views/Login.vue'
import InviteVerification from '@/views/InviteVerification.vue'
import ProjectManagement from '@/components/novel/ProjectManagement.vue'
import CharacterManagement from '@/components/character/CharacterManagement.vue'
import WorldSettingManagement from '@/components/worldsetting/WorldSettingManagement.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import ChapterList from '@/views/ChapterList.vue'
import ProgressStats from '@/components/novel/ProgressStats.vue'
import InviteManagement from '@/components/admin/InviteManagement.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/invite-verification',
      name: 'inviteVerification',
      component: InviteVerification,
      meta: {
        requiresAuth: true,
        requiresUnverified: true
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
            title: '项目信息',
            icon: 'BookOutlined'
          }
        },
        {
          path: '/characters',
          name: 'characters',
          component: CharacterManagement,
          meta: {
            title: '角色库',
            icon: 'TeamOutlined'
          }
        },
        {
          path: '/worldsettings',
          name: 'worldSettings',
          component: WorldSettingManagement,
          meta: {
            title: '世界设定',
            icon: 'GlobalOutlined'
          }
        },
        {
          path: '/chapters',
          name: 'chapters',
          component: ChapterList,
          meta: {
            title: '章节列表',
            icon: 'FileTextOutlined'
          }
        },
        {
          path: '/chapter/:id?',
          name: 'chapter',
          component: ChapterEditor,
          meta: {
            title: '章节编辑',
            icon: 'FileTextOutlined',
            hidden: true // Don't show in navigation menu
          }
        },
        {
          path: '/progress',
          name: 'progress',
          component: ProgressStats,
          meta: {
            title: '进度统计',
            icon: 'BarChartOutlined'
          }
        },
        {
          path: '/admin/invites',
          name: 'inviteManagement',
          component: InviteManagement,
          meta: {
            title: '邀请码管理',
            icon: 'GiftOutlined',
            admin: true // 标记为管理员功能
          }
        }
      ]
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 初始化认证状态
  await authStore.init()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresUnverified = to.matched.some(record => record.meta.requiresUnverified)

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
    next('/')
    return
  }

  // 如果已登录但未验证邀请码，且不是邀请码验证页面，跳转到邀请码验证页
  if (authStore.isAuthenticated && !authStore.user?.inviteVerified && to.name !== 'inviteVerification') {
    next('/invite-verification')
    return
  }

  next()
})

export default router
