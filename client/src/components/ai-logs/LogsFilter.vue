<template>
  <div class="logs-filter">
    <a-card :title="t('aiLogs.filter.title')" :bordered="false" size="small">
      <a-form layout="vertical" :model="localFilters">
        <a-form-item :label="t('aiLogs.filter.provider')">
          <a-select
            v-model:value="localFilters.provider"
            :placeholder="t('aiLogs.filter.all')"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="openai">OpenAI</a-select-option>
            <a-select-option value="claude">Claude</a-select-option>
            <a-select-option value="gemini">Gemini</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('aiLogs.filter.model')">
          <a-input
            v-model:value="localFilters.model"
            :placeholder="t('aiLogs.filter.model')"
            allow-clear
            @change="handleChange"
          />
        </a-form-item>

        <a-form-item :label="t('aiLogs.filter.taskType')">
          <a-select
            v-model:value="localFilters.taskType"
            :placeholder="t('aiLogs.filter.all')"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="creative">{{ t('taskTypes.creative') }}</a-select-option>
            <a-select-option value="outline">{{ t('taskTypes.outline') }}</a-select-option>
            <a-select-option value="consistency">{{ t('taskTypes.consistency') }}</a-select-option>
            <a-select-option value="enhancement">{{ t('taskTypes.enhancement') }}</a-select-option>
            <a-select-option value="chat">{{ t('taskTypes.chat') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('aiLogs.filter.status')">
          <a-select
            v-model:value="localFilters.status"
            :placeholder="t('aiLogs.filter.all')"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="success">{{ t('aiLogs.status.success') }}</a-select-option>
            <a-select-option value="error">{{ t('aiLogs.status.error') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('aiLogs.filter.apiUrl')">
          <a-input
            v-model:value="localFilters.apiUrl"
            placeholder="/api/ai/chat"
            allow-clear
            @change="handleChange"
          />
        </a-form-item>

        <a-form-item :label="t('aiLogs.filter.novel')">
          <a-select
            v-model:value="localFilters.novelId"
            :placeholder="t('aiLogs.filter.all')"
            allow-clear
            show-search
            :filter-option="filterNovelOption"
            @change="handleChange"
          >
            <a-select-option
              v-for="novel in novels"
              :key="novel.id"
              :value="novel.id"
            >
              {{ novel.title }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleApply">{{ t('common.apply') }}</a-button>
            <a-button @click="handleReset">{{ t('common.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/utils/api';

const { t } = useI18n();

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:filters', 'change']);

const localFilters = reactive({ ...props.filters });
const novels = ref([]);

onMounted(async () => {
  try {
    const response = await api.get('/api/novels');
    novels.value = response.data;
  } catch (error) {
    console.error('Failed to load novels:', error);
  }
});

watch(() => props.filters, (newFilters) => {
  Object.assign(localFilters, newFilters);
}, { deep: true });

function handleChange() {
  emit('update:filters', { ...localFilters });
}

function handleApply() {
  emit('update:filters', { ...localFilters });
  emit('change');
}

function handleReset() {
  Object.keys(localFilters).forEach(key => {
    localFilters[key] = null;
  });
  emit('update:filters', { ...localFilters });
  emit('change');
}

function filterNovelOption(input, option) {
  return option.children[0].children.toLowerCase().includes(input.toLowerCase());
}
</script>

<style scoped>
.logs-filter {
  width: 280px;
  flex-shrink: 0;
}

.logs-filter :deep(.ant-card) {
  background: var(--theme-bg-container, #fff);
  transition: background-color 0.3s ease;
}

.logs-filter :deep(.ant-card-head-title) {
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s ease;
}

.logs-filter :deep(.ant-card-body) {
  padding: 16px;
}

.logs-filter :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.logs-filter :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.logs-filter :deep(.ant-form-item-label > label) {
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s ease;
}
</style>
