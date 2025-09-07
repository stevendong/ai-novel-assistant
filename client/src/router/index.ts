import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProjectManagement from '@/components/novel/ProjectManagement.vue'
import CharacterManagement from '@/components/character/CharacterManagement.vue'
import WorldSettingManagement from '@/components/worldsetting/WorldSettingManagement.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import ProgressStats from '@/components/novel/ProgressStats.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
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
          name: 'worldsettings',
          component: WorldSettingManagement,
          meta: {
            title: '世界设定',
            icon: 'GlobalOutlined'
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

export default router
