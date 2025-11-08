<template>
  <div class="logs-filter">
    <a-card title="筛选条件" :bordered="false" size="small">
      <a-form layout="vertical" :model="localFilters">
        <a-form-item label="提供商">
          <a-select
            v-model:value="localFilters.provider"
            placeholder="全部提供商"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="openai">OpenAI</a-select-option>
            <a-select-option value="claude">Claude</a-select-option>
            <a-select-option value="gemini">Gemini</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="模型">
          <a-input
            v-model:value="localFilters.model"
            placeholder="输入模型名称"
            allow-clear
            @change="handleChange"
          />
        </a-form-item>

        <a-form-item label="任务类型">
          <a-select
            v-model:value="localFilters.taskType"
            placeholder="全部任务"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="creative">创作内容</a-select-option>
            <a-select-option value="outline">大纲生成</a-select-option>
            <a-select-option value="consistency">一致性检查</a-select-option>
            <a-select-option value="enhancement">内容增强</a-select-option>
            <a-select-option value="chat">对话咨询</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="状态">
          <a-select
            v-model:value="localFilters.status"
            placeholder="全部状态"
            allow-clear
            @change="handleChange"
          >
            <a-select-option value="success">成功</a-select-option>
            <a-select-option value="error">失败</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="接口路径">
          <a-input
            v-model:value="localFilters.apiUrl"
            placeholder="如: /api/ai/chat"
            allow-clear
            @change="handleChange"
          />
        </a-form-item>

        <a-form-item label="小说">
          <a-select
            v-model:value="localFilters.novelId"
            placeholder="全部小说"
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
            <a-button type="primary" @click="handleApply">应用</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:filters', 'change']);

const localFilters = reactive({ ...props.filters });
const novels = ref([]);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

onMounted(async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/novels`);
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

.logs-filter :deep(.ant-card-body) {
  padding: 16px;
}

.logs-filter :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.logs-filter :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}
</style>
