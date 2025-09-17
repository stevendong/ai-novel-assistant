import { createRouter, createWebHistory } from 'vue-router'
import { useClerkAuthStore } from '@/stores/clerkAuth'
import MainLayout from '@/components/layout/MainLayout.vue'
import Login from '@/views/Login.vue'
import ClerkSignIn from '@/components/auth/ClerkSignIn.vue'
import ClerkSignUp from '@/components/auth/ClerkSignUp.vue'
import ProjectManagement from '@/components/novel/ProjectManagement.vue'
import CharacterManagement from '@/components/character/CharacterManagement.vue'
import WorldSettingManagement from '@/components/worldsetting/WorldSettingManagement.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import ChapterList from '@/views/ChapterList.vue'
import ProgressStats from '@/components/novel/ProgressStats.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: ClerkSignIn,
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/signup',
      name: 'signup',
      component: ClerkSignUp,
      meta: {
        requiresGuest: true
      }
    },
    {
      path: '/legacy-login',
      name: 'legacy-login',
      component: Login,
      meta: {
        requiresGuest: true
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
        }
      ]
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useClerkAuthStore()

  // 等待 Clerk 初始化
  await authStore.init()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (requiresGuest && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
