<template>
  <div class="logs-table">
    <a-table
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :pagination="paginationConfig"
      :scroll="{ x: 1400 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'provider'">
          <a-tag :color="getProviderColor(record.provider)">
            {{ record.provider.toUpperCase() }}
          </a-tag>
        </template>

        <template v-if="column.key === 'model'">
          <span class="model-name">{{ record.model }}</span>
        </template>

        <template v-if="column.key === 'apiUrl'">
          <a-tooltip :title="record.apiUrl">
            <code class="api-url">{{ record.apiUrl }}</code>
          </a-tooltip>
        </template>

        <template v-if="column.key === 'taskType'">
          <a-tag v-if="record.taskType" :color="getTaskTypeColor(record.taskType)">
            {{ getTaskTypeLabel(record.taskType) }}
          </a-tag>
          <span v-else class="text-gray">-</span>
        </template>

        <template v-if="column.key === 'tokens'">
          <div class="tokens-cell">
            <div class="token-row">
              <span class="token-label">提示:</span>
              <span class="token-value">{{ formatNumber(record.promptTokens) }}</span>
            </div>
            <div class="token-row">
              <span class="token-label">完成:</span>
              <span class="token-value">{{ formatNumber(record.completionTokens) }}</span>
            </div>
            <div class="token-row total">
              <span class="token-label">总计:</span>
              <span class="token-value">{{ formatNumber(record.totalTokens) }}</span>
            </div>
          </div>
        </template>

        <template v-if="column.key === 'latency'">
          <span :class="getLatencyClass(record.latencyMs)">
            {{ record.latencyMs ? `${record.latencyMs}ms` : '-' }}
          </span>
        </template>

        <template v-if="column.key === 'cost'">
          <span class="cost-value">
            ${{ (record.estimatedCost || 0).toFixed(4) }}
          </span>
        </template>

        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'success' ? 'success' : 'error'">
            {{ record.status === 'success' ? '成功' : '失败' }}
          </a-tag>
        </template>

        <template v-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>

        <template v-if="column.key === 'novel'">
          <span v-if="record.novel">{{ record.novel.title }}</span>
          <span v-else class="text-gray">-</span>
        </template>

        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleDetail(record)">
            详情
          </a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['detail', 'page-change']);

const columns = [
  {
    title: '时间',
    key: 'createdAt',
    width: 160,
    fixed: 'left'
  },
  {
    title: '提供商',
    key: 'provider',
    width: 100
  },
  {
    title: '模型',
    key: 'model',
    width: 180
  },
  {
    title: '接口路径',
    key: 'apiUrl',
    width: 200,
    ellipsis: true
  },
  {
    title: '任务类型',
    key: 'taskType',
    width: 120
  },
  {
    title: 'Token使用',
    key: 'tokens',
    width: 140
  },
  {
    title: '延迟',
    key: 'latency',
    width: 100
  },
  {
    title: '成本',
    key: 'cost',
    width: 100
  },
  {
    title: '状态',
    key: 'status',
    width: 80
  },
  {
    title: '小说',
    key: 'novel',
    width: 150,
    ellipsis: true
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    fixed: 'right'
  }
];

const paginationConfig = computed(() => ({
  current: props.pagination.current,
  pageSize: props.pagination.pageSize,
  total: props.pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100']
}));

function getProviderColor(provider) {
  const colors = {
    openai: 'green',
    claude: 'purple',
    gemini: 'blue'
  };
  return colors[provider] || 'default';
}

function getTaskTypeColor(taskType) {
  const colors = {
    creative: 'orange',
    outline: 'cyan',
    consistency: 'magenta',
    enhancement: 'geekblue',
    chat: 'lime'
  };
  return colors[taskType] || 'default';
}

function getTaskTypeLabel(taskType) {
  const labels = {
    creative: '创作',
    outline: '大纲',
    consistency: '一致性',
    enhancement: '增强',
    chat: '对话'
  };
  return labels[taskType] || taskType;
}

function getLatencyClass(latency) {
  if (!latency) return '';
  if (latency < 1000) return 'latency-fast';
  if (latency < 3000) return 'latency-normal';
  return 'latency-slow';
}

function formatNumber(num) {
  return num?.toLocaleString() || '0';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function handleTableChange(pagination) {
  emit('page-change', pagination.current, pagination.pageSize);
}

function handleDetail(record) {
  emit('detail', record);
}
</script>

<style scoped>
.logs-table {
  flex: 1;
}

.model-name {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}

.api-url {
  font-size: 12px;
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 3px;
  color: #1890ff;
  cursor: pointer;
}

.tokens-cell {
  font-size: 12px;
}

.token-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  line-height: 1.4;
}

.token-row.total {
  font-weight: 600;
  border-top: 1px solid #f0f0f0;
  padding-top: 2px;
  margin-top: 2px;
}

.token-label {
  color: #8c8c8c;
}

.token-value {
  color: #262626;
}

.latency-fast {
  color: #52c41a;
}

.latency-normal {
  color: #1890ff;
}

.latency-slow {
  color: #ff4d4f;
}

.cost-value {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-weight: 500;
}

.text-gray {
  color: #8c8c8c;
}

:deep(.ant-table-cell) {
  padding: 12px 8px;
}
</style>
