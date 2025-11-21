<template>
  <div class="logs-table">
    <a-table
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :pagination="paginationConfig"
      :scroll="{ x: 'max-content' }"
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
          <a-tooltip v-if="record.apiUrl" :title="record.apiUrl">
            <code class="api-url">{{ truncateUrl(record.apiUrl) }}</code>
          </a-tooltip>
          <span v-else class="text-gray">-</span>
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
              <span class="token-label">{{ t('aiLogs.table.promptTokens').slice(0, 2) }}:</span>
              <span class="token-value">{{ formatNumber(record.promptTokens) }}</span>
            </div>
            <div class="token-row">
              <span class="token-label">{{ t('aiLogs.table.completionTokens').slice(0, 2) }}:</span>
              <span class="token-value">{{ formatNumber(record.completionTokens) }}</span>
            </div>
            <div class="token-row total">
              <span class="token-label">{{ t('aiLogs.table.totalTokens').slice(0, 2) }}:</span>
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
            {{ t(`aiLogs.status.${record.status}`) }}
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
            {{ t('aiLogs.table.viewDetail') }}
          </a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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

const columns = computed(() => [
  {
    title: t('aiLogs.table.createdAt'),
    key: 'createdAt',
    width: 150
  },
  {
    title: t('aiLogs.table.provider'),
    key: 'provider',
    width: 90
  },
  {
    title: t('aiLogs.table.model'),
    key: 'model',
    ellipsis: true,
    width: 150
  },
  {
    title: t('aiLogs.table.apiUrl'),
    key: 'apiUrl',
    ellipsis: true,
    width: 200
  },
  {
    title: t('aiLogs.table.taskType'),
    key: 'taskType',
    width: 100
  },
  {
    title: t('aiLogs.table.tokens'),
    key: 'tokens',
    width: 130
  },
  {
    title: t('aiLogs.table.latency'),
    key: 'latency',
    width: 90
  },
  {
    title: t('aiLogs.table.cost'),
    key: 'cost',
    width: 95
  },
  {
    title: t('aiLogs.table.status'),
    key: 'status',
    width: 70
  },
  {
    title: t('aiLogs.table.actions'),
    key: 'action',
    width: 80
  }
]);

const paginationConfig = computed(() => ({
  current: props.pagination.current,
  pageSize: props.pagination.pageSize,
  total: props.pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => {
    const locale = t('locale');
    return locale === 'zh' ? `共 ${total} 条记录` : `Total ${total} records`;
  },
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

function truncateUrl(url) {
  if (!url) return '';
  if (url.length <= 40) return url;
  return url.substring(0, 37) + '...';
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
  overflow: hidden;
}

.logs-table :deep(.ant-table-wrapper) {
  overflow-x: auto;
}

.logs-table :deep(.ant-table) {
  min-width: 100%;
}

.model-name {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: var(--theme-text, #262626);
  transition: color 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.api-url {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: var(--theme-bg-elevated, #f5f5f5);
  border-radius: 3px;
  color: #1488CC;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.api-url:hover {
  background: #e6f7ff;
  color: #0050b3;
}

.tokens-cell {
  font-size: 11px;
  min-width: 110px;
}

.token-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  line-height: 1.3;
  white-space: nowrap;
}

.token-row.total {
  font-weight: 600;
  border-top: 1px solid var(--theme-border, #f0f0f0);
  padding-top: 2px;
  margin-top: 2px;
  transition: border-color 0.3s ease;
}

.token-label {
  color: var(--theme-text-secondary, #8c8c8c);
  transition: color 0.3s ease;
}

.token-value {
  color: var(--theme-text, #262626);
  transition: color 0.3s ease;
}

.latency-fast {
  color: #52c41a;
}

.latency-normal {
  color: #1488CC;
}

.latency-slow {
  color: #ff4d4f;
}

.cost-value {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-weight: 500;
  color: var(--theme-text, #262626);
  transition: color 0.3s ease;
}

.text-gray {
  color: var(--theme-text-secondary, #8c8c8c);
  transition: color 0.3s ease;
}

:deep(.ant-table-cell) {
  padding: 12px 8px;
}
</style>
