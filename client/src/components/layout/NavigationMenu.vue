<template>
  <a-menu
    v-model:selectedKeys="selectedKeys"
    mode="inline"
    :inline-collapsed="collapsed"
    class="border-0"
  >
    <!-- Main navigation items -->
    <a-menu-item
      v-for="route in navigationRoutes"
      :key="route.name"
      @click="navigateToRoute(route.name)"
    >
      <template #icon>
        <component :is="getIcon(route.meta?.icon)" />
      </template>
      <span>{{ $t(`nav.${route.name}`) }}</span>
    </a-menu-item>
  </a-menu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  FileTextOutlined,
  BarChartOutlined,
  GiftOutlined
} from '@ant-design/icons-vue'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false
})

const router = useRouter()
const route = useRoute()

const selectedKeys = ref<string[]>([])

// Icon mapping
const iconMap = {
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  FileTextOutlined,
  BarChartOutlined,
  GiftOutlined
}

// Define navigation routes directly
const navigationRoutes = ref([
  {
    name: 'project',
    meta: {
      title: '项目信息',
      icon: 'BookOutlined'
    }
  },
  {
    name: 'characters',
    meta: {
      title: '角色库',
      icon: 'TeamOutlined'
    }
  },
  {
    name: 'worldSettings',
    meta: {
      title: '世界设定',
      icon: 'GlobalOutlined'
    }
  },
  {
    name: 'chapters',
    meta: {
      title: '章节管理',
      icon: 'FileTextOutlined'
    }
  },
  {
    name: 'progress',
    meta: {
      title: '进度统计',
      icon: 'BarChartOutlined'
    }
  },
  {
    name: 'inviteManagement',
    meta: {
      title: '邀请码管理',
      icon: 'GiftOutlined'
    }
  }
])

// Get icon component
const getIcon = (iconName?: string) => {
  if (!iconName || !(iconName in iconMap)) return BookOutlined
  return iconMap[iconName as keyof typeof iconMap]
}

// Navigate to route
const navigateToRoute = (routeName: string) => {
  router.push({ name: routeName })
}


// Watch route changes to update selected keys
watch(() => route.name, (newRouteName) => {
  if (newRouteName) {
    selectedKeys.value = [String(newRouteName)]
  }
}, { immediate: true })

// Watch for chapter route with params
watch(() => route.params.id, (chapterId) => {
  if (route.name === 'chapter' && chapterId) {
    selectedKeys.value = [`chapter-${chapterId}`]
  }
}, { immediate: true })
</script>
