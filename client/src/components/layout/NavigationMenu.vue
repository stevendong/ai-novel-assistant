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
      <span>{{ route.meta?.title }}</span>
    </a-menu-item>

    <!-- Chapters submenu -->
    <a-sub-menu key="chapters">
      <template #icon>
        <FileTextOutlined />
      </template>
      <template #title>章节列表</template>
      <a-menu-item
        v-for="chapter in chapters"
        :key="`chapter-${chapter.id}`"
        @click="selectChapter(chapter)"
      >
        第{{ chapter.chapterNumber }}章：{{ chapter.title }}
      </a-menu-item>
      <a-menu-item key="add-chapter" @click="addNewChapter">
        <template #icon>
          <PlusOutlined />
        </template>
        添加章节
      </a-menu-item>
    </a-sub-menu>
  </a-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'

interface Props {
  collapsed?: boolean
  chapters?: Chapter[]
}

interface Emits {
  (e: 'chapter-selected', chapter: Chapter): void
  (e: 'add-chapter'): void
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  chapters: () => []
})

const emit = defineEmits<Emits>()

const router = useRouter()
const route = useRoute()

const selectedKeys = ref<string[]>([])

// Icon mapping
const iconMap = {
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  FileTextOutlined,
  BarChartOutlined
}

// Get navigation routes from router
const navigationRoutes = computed(() => {
  const mainRoute = router.getRoutes().find(r => r.path === '/')
  if (!mainRoute?.children) return []
  
  return mainRoute.children.filter(child => 
    child.name && 
    child.meta?.title && 
    !child.meta?.hidden
  )
})

// Get icon component
const getIcon = (iconName?: string) => {
  if (!iconName || !(iconName in iconMap)) return BookOutlined
  return iconMap[iconName as keyof typeof iconMap]
}

// Navigate to route
const navigateToRoute = (routeName: string) => {
  router.push({ name: routeName })
}

// Select chapter
const selectChapter = (chapter: Chapter) => {
  router.push({ name: 'chapter', params: { id: chapter.id } })
  emit('chapter-selected', chapter)
}

// Add new chapter
const addNewChapter = () => {
  emit('add-chapter')
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