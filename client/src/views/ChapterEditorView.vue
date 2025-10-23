<template>
  <div class="chapter-editor-view">
    <ChapterEditor
      v-if="chapterId"
      :chapter-id="chapterId"
      @saved="handleSaved"
      @deleted="handleDeleted"
    />
    <div v-else class="no-chapter">
      <a-empty description="未找到章节" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'

const route = useRoute()
const router = useRouter()

const chapterId = computed(() => route.params.id as string)

const handleSaved = () => {
  // 保存成功后的处理
}

const handleDeleted = () => {
  // 删除后跳转回章节列表
  router.push({ name: 'chapters' })
}
</script>

<style scoped>
.chapter-editor-view {
  height: 100%;
}

.no-chapter {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
</style>
