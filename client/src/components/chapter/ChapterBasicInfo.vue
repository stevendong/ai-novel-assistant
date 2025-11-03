<template>
  <div class="chapter-basic-info">
    <a-form
      :model="formData"
      layout="vertical"
      class="basic-info-form"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('chapterEditor.basic.titleLabel')" required>
            <a-input
              v-model:value="formData.title"
              :placeholder="t('chapterEditor.basic.titlePlaceholder')"
              :maxlength="100"
              show-count
              @change="handleChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item :label="t('chapterEditor.basic.numberLabel')">
            <a-input-number
              v-model:value="formData.chapterNumber"
              :min="1"
              disabled
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item :label="t('chapterEditor.basic.targetWordCountLabel')">
            <a-input-number
              v-model:value="formData.targetWordCount"
              :min="0"
              :placeholder="t('chapterEditor.basic.targetWordCountPlaceholder')"
              style="width: 100%"
              @change="handleChange"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="t('chapterEditor.basic.outlineLabel')">
        <div class="outline-editor-wrapper">
          <OutlineAIGenerator
            v-if="novelId && chapterId"
            :novel-id="novelId"
            :chapter-id="chapterId"
            :chapter-number="formData.chapterNumber"
            :chapter-title="formData.title"
            :existing-outline="formData.outline"
            :characters="characters"
            :settings="settings"
            :target-word-count="formData.targetWordCount"
            @update:outline="handleOutlineUpdate"
            @update:plot-points="handlePlotPointsUpdate"
            @generated="handleOutlineGenerated"
          />
          <a-textarea
            v-model:value="formData.outline"
            :placeholder="t('chapterEditor.basic.outlinePlaceholder')"
            :rows="6"
            :maxlength="2000"
            show-count
            @change="handleChange"
          />
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Character, WorldSetting, PlotPoint } from '@/types'
import OutlineAIGenerator from './OutlineAIGenerator.vue'
import type { ChapterOutlineData } from '@/services/aiService'

interface BasicInfoData {
  title: string
  chapterNumber: number
  targetWordCount?: number
  outline: string
}

interface Props {
  modelValue: BasicInfoData
  novelId?: string
  chapterId?: string
  characters?: Character[]
  settings?: WorldSetting[]
}

interface Emits {
  (e: 'update:modelValue', value: BasicInfoData): void
  (e: 'update:plot-points', value: PlotPoint[]): void
  (e: 'outline-generated', value: ChapterOutlineData): void
}

const props = withDefaults(defineProps<Props>(), {
  characters: () => [],
  settings: () => []
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// 内部表单数据
const formData = ref<BasicInfoData>({
  title: '',
  chapterNumber: 1,
  targetWordCount: undefined,
  outline: ''
})

// 监听外部变化,同步到内部
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      formData.value = { ...newValue }
    }
  },
  { immediate: true, deep: true }
)

// 处理表单变化
const handleChange = () => {
  emit('update:modelValue', { ...formData.value })
}

// 处理大纲更新
const handleOutlineUpdate = (outline: string) => {
  formData.value.outline = outline
  handleChange()
}

// 处理剧情要点更新(由AI生成)
const handlePlotPointsUpdate = (plotPoints: PlotPoint[]) => {
  emit('update:plot-points', plotPoints)
}

// 处理AI生成完成
const handleOutlineGenerated = (data: ChapterOutlineData) => {
  emit('outline-generated', data)
}
</script>

<style scoped>
.chapter-basic-info {
  width: 100%;
}

.basic-info-form {
  padding: 0;
}

.outline-editor-wrapper {
  position: relative;
}

.outline-editor-wrapper :deep(.outline-ai-generator) {
  margin-bottom: 8px;
}
</style>
