<template>
  <div class="chapter-editor-demo h-screen flex flex-col">
    <div class="theme-bg-container shadow-sm border-b p-4">
      <h2 class="text-xl font-bold theme-text-primary">章节编辑器演示</h2>
      <p class="text-sm theme-text-primary mt-1">
        测试章节编辑功能，包括Markdown预览和AI协作功能
      </p>
    </div>
    
    <div class="flex-1 overflow-hidden">
      <!-- 如果有章节ID，显示编辑器 -->
      <ChapterEditor v-if="chapterId" :chapterId="chapterId" />
      
      <!-- 如果没有章节ID，显示选择界面 -->
      <div v-else class="flex items-center justify-center h-full theme-bg-elevated">
        <div class="text-center">
          <div class="text-6xl theme-text-primary mb-4">📝</div>
          <h3 class="text-lg font-medium theme-text-primary mb-2">选择或创建章节</h3>
          <p class="theme-text-primary mb-6">请选择一个已有的章节，或创建新章节来开始编辑</p>
          
          <div class="space-x-4">
            <a-button type="primary" @click="createNewChapter">
              创建新章节
            </a-button>
            <a-button @click="loadExistingChapter">
              加载现有章节
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import ChapterEditor from './ChapterEditor.vue'
import { chapterService } from '@/services/chapterService'

const chapterId = ref<string>('1') // 默认加载章节1，您可以修改这个值进行测试

// 创建新章节
const createNewChapter = async () => {
  try {
    const newChapter = await chapterService.createChapter({
      novelId: '1', // 假设小说ID为1
      title: '新章节',
      chapterNumber: Math.floor(Math.random() * 100) + 1,
      outline: '这是一个新章节的大纲...'
    })
    
    chapterId.value = newChapter.id
    message.success('新章节创建成功！')
  } catch (error) {
    message.error('创建章节失败：' + error)
    console.error('Failed to create chapter:', error)
  }
}

// 加载现有章节
const loadExistingChapter = () => {
  // 这里可以弹出章节选择对话框
  // 暂时直接加载章节1
  chapterId.value = '1'
  message.success('章节加载成功！')
}
</script>

<style scoped>
.chapter-editor-demo {
  background-color: var(--theme-consistency-panel-bg);
  transition: background-color 0.3s ease;
}
</style>
