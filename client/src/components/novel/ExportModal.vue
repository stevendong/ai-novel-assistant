<template>
  <a-modal
    v-model:open="visible"
    :title="$t('export.title')"
    :width="700"
    @ok="handleExport"
    @cancel="handleCancel"
  >
    <a-form :model="formState" layout="vertical">
      <a-form-item :label="$t('export.format')">
        <a-radio-group v-model:value="formState.format" size="large">
          <a-radio-button value="txt">TXT</a-radio-button>
          <a-radio-button value="epub">EPUB</a-radio-button>
          <a-radio-button value="mdx">MDX (Blog)</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-alert
        v-if="formState.format === 'mdx'"
        :message="$t('export.mdxTip')"
        type="info"
        show-icon
        class="mb-4"
      />

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.chapters')">
        <a-select
          v-model:value="formState.selectedChapters"
          mode="multiple"
          :placeholder="$t('export.selectChapters')"
          style="width: 100%"
          :options="chapterOptions"
          :max-tag-count="3"
        />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.author')">
        <a-input v-model:value="formState.author" :placeholder="$t('export.authorPlaceholder')" />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.category')">
        <a-input v-model:value="formState.category" :placeholder="$t('export.categoryPlaceholder')" />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.tags')">
        <a-select
          v-model:value="formState.tags"
          mode="tags"
          :placeholder="$t('export.tagsPlaceholder')"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.series')">
        <a-input v-model:value="formState.series" :placeholder="$t('export.seriesPlaceholder')" />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.seoDescription')">
        <a-textarea
          v-model:value="formState.seoDescription"
          :placeholder="$t('export.seoDescriptionPlaceholder')"
          :rows="3"
        />
      </a-form-item>

      <a-form-item v-if="formState.format === 'mdx'" :label="$t('export.coverImage')">
        <a-input v-model:value="formState.coverImage" :placeholder="$t('export.coverImagePlaceholder')" />
      </a-form-item>

      <a-form-item v-if="formState.format !== 'mdx'">
        <a-checkbox v-model:checked="formState.includeOutlines">
          {{ $t('export.includeOutlines') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item v-if="formState.format === 'txt'">
        <a-checkbox v-model:checked="formState.includeMeta">
          {{ $t('export.includeMeta') }}
        </a-checkbox>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">{{ $t('common.cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleExport">
        {{ $t('export.export') }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/utils/api'

const { t } = useI18n()

interface NovelData {
  id: string
  title: string
  description?: string
  genre?: string
  author?: string
  tags?: string[]
}

const props = withDefaults(defineProps<{
  visible: boolean
  novelId: string
  chapters: Array<{ id: string; chapterNumber: number; title: string }>
  defaultChapterId?: string
  novel?: NovelData
}>(), {
  defaultChapterId: undefined,
  novel: undefined
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)

const formState = reactive({
  format: 'txt',
  selectedChapters: [] as string[],
  author: '',
  category: 'novel',
  tags: [] as string[],
  series: '',
  seoDescription: '',
  coverImage: '',
  includeOutlines: false,
  includeMeta: true
})

const chapterOptions = computed(() => {
  return props.chapters.map(ch => ({
    label: `第${ch.chapterNumber}章: ${ch.title}`,
    value: ch.id
  }))
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.defaultChapterId) {
      formState.selectedChapters = [props.defaultChapterId]
    } else {
      formState.selectedChapters = props.chapters.map(ch => ch.id)
    }

    if (props.novel) {
      formState.author = props.novel.author || ''
      formState.category = props.novel.genre || 'novel'
      formState.tags = props.novel.tags || []
      formState.series = props.novel.title || ''
      formState.seoDescription = props.novel.description || ''
    }
  }
})

const handleExport = async () => {
  loading.value = true
  try {
    let response
    const isSingleChapter = props.defaultChapterId && formState.selectedChapters.length === 1

    if (formState.format === 'txt') {
      if (isSingleChapter) {
        response = await apiClient.post(`/api/export/chapter/txt/${formState.selectedChapters[0]}`, {
          includeOutline: formState.includeOutlines,
          includeMeta: formState.includeMeta
        })
      } else {
        response = await apiClient.post(`/api/export/txt/${props.novelId}`, {
          includeOutlines: formState.includeOutlines,
          includeMeta: formState.includeMeta
        })
      }
    } else if (formState.format === 'epub') {
      response = await apiClient.post(`/api/export/epub/${props.novelId}`, {
        includeOutlines: formState.includeOutlines
      })
    } else if (formState.format === 'mdx') {
      response = await apiClient.post(`/api/export/mdx/${props.novelId}`, {
        chapterIds: formState.selectedChapters.length > 0 ? formState.selectedChapters : undefined,
        author: formState.author || undefined,
        category: formState.category || 'novel',
        tags: formState.tags.length > 0 ? formState.tags : [],
        series: formState.series || undefined,
        seoDescription: formState.seoDescription || undefined,
        coverImage: formState.coverImage || undefined
      })
    }

    if (response?.data?.success) {
      if (formState.format === 'mdx' && response.data.files?.length > 1) {
        message.success(t('export.mdxSuccess', { count: response.data.files.length }))

        for (const file of response.data.files) {
          const link = document.createElement('a')
          link.href = apiClient.getAxiosInstance().defaults.baseURL + file.downloadUrl
          link.download = file.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        const downloadUrl = formState.format === 'mdx' && response.data.files?.length === 1
          ? response.data.files[0].downloadUrl
          : response.data.downloadUrl

        const link = document.createElement('a')
        link.href = apiClient.getAxiosInstance().defaults.baseURL + downloadUrl
        link.download = response.data.filename || response.data.files?.[0]?.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        message.success(t('export.success'))
      }

      emit('success')
      handleCancel()
    }
  } catch (error: any) {
    console.error('Export failed:', error)
    message.error(error.response?.data?.error || t('export.failed'))
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  formState.format = 'txt'
  formState.selectedChapters = []
  formState.author = ''
  formState.category = 'novel'
  formState.tags = []
  formState.series = ''
  formState.seoDescription = ''
  formState.coverImage = ''
  formState.includeOutlines = false
  formState.includeMeta = true
}
</script>
