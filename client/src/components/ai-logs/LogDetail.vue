<template>
  <a-modal
    v-model:open="isVisible"
    :title="t('aiLogs.detail.modalTitle')"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="log" class="log-detail">
      <a-descriptions bordered :column="2" size="small">
        <a-descriptions-item :label="t('aiLogs.detail.callTime')" :span="2">
          {{ formatDate(log.createdAt) }}
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.provider')">
          <a-tag :color="getProviderColor(log.provider)">
            {{ log.provider.toUpperCase() }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.model')">
          <code>{{ log.model }}</code>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.endpoint')" :span="2">
          <code class="api-url">{{ log.apiUrl || '-' }}</code>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.taskType')">
          <a-tag v-if="log.taskType" :color="getTaskTypeColor(log.taskType)">
            {{ t(`taskTypes.${log.taskType}`) }}
          </a-tag>
          <span v-else>-</span>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.status')">
          <a-tag :color="log.status === 'success' ? 'success' : 'error'">
            {{ log.status === 'success' ? t('aiLogs.detail.statusSuccess') : t('aiLogs.detail.statusFailed') }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.promptTokens')">
          {{ formatNumber(log.promptTokens) }}
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.completionTokens')">
          {{ formatNumber(log.completionTokens) }}
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.totalTokens')">
          <strong>{{ formatNumber(log.totalTokens) }}</strong>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.estimatedCost')">
          <strong class="cost-value">${{ (log.estimatedCost || 0).toFixed(4) }}</strong>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.latency')">
          <span :class="getLatencyClass(log.latencyMs)">
            {{ log.latencyMs ? `${log.latencyMs}ms` : '-' }}
          </span>
        </a-descriptions-item>

        <a-descriptions-item :label="t('aiLogs.detail.retryCount')">
          {{ log.retryCount || 0 }}
        </a-descriptions-item>

        <a-descriptions-item v-if="log.novel" :label="t('aiLogs.detail.relatedNovel')" :span="2">
          {{ log.novel.title }}
        </a-descriptions-item>

        <a-descriptions-item v-if="log.sessionId" :label="t('aiLogs.detail.sessionId')" :span="2">
          <code>{{ log.sessionId }}</code>
        </a-descriptions-item>
      </a-descriptions>

      <a-divider>{{ t('aiLogs.detail.requestMessages') }}</a-divider>
      <div class="message-section">
        <pre class="message-content">{{ formatMessages(log.requestMessages) }}</pre>
      </div>

      <a-divider>{{ t('aiLogs.detail.requestParams') }}</a-divider>
      <div class="params-section">
        <pre class="params-content">{{ formatParams(log.requestParams) }}</pre>
      </div>

      <a-divider>{{ t('aiLogs.detail.responseContent') }}</a-divider>
      <div class="response-section">
        <a-alert
          v-if="log.status === 'error'"
          type="error"
          :message="log.errorMessage"
          :description="log.errorCode ? `${t('aiLogs.detail.errorCode')}: ${log.errorCode}` : null"
          show-icon
        />
        <pre v-else class="response-content">{{ log.responseContent || t('aiLogs.detail.noResponseContent') }}</pre>
      </div>

      <a-divider v-if="log.responseMetadata">{{ t('aiLogs.detail.responseMetadata') }}</a-divider>
      <div v-if="log.responseMetadata" class="metadata-section">
        <pre class="metadata-content">{{ formatMetadata(log.responseMetadata) }}</pre>
      </div>

      <div class="actions">
        <a-space>
          <a-button @click="handleClose">{{ t('aiLogs.detail.close') }}</a-button>
          <a-button type="primary" @click="handleCopy">{{ t('aiLogs.detail.copyDetails') }}</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  log: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible']);

const isVisible = ref(props.visible);

watch(() => props.visible, (newVal) => {
  isVisible.value = newVal;
});

watch(isVisible, (newVal) => {
  emit('update:visible', newVal);
});

function handleClose() {
  isVisible.value = false;
}

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
  return t(`taskTypes.${taskType}`, taskType);
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
  const locale = t('locale');
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatMessages(messagesStr) {
  try {
    const messages = JSON.parse(messagesStr);
    return JSON.stringify(messages, null, 2);
  } catch {
    return messagesStr;
  }
}

function formatParams(paramsStr) {
  try {
    const params = JSON.parse(paramsStr);
    return JSON.stringify(params, null, 2);
  } catch {
    return paramsStr || '';
  }
}

function formatMetadata(metadataStr) {
  try {
    const metadata = JSON.parse(metadataStr);
    return JSON.stringify(metadata, null, 2);
  } catch {
    return metadataStr;
  }
}

function handleCopy() {
  const content = JSON.stringify(props.log, null, 2);
  navigator.clipboard.writeText(content).then(() => {
    message.success(t('aiLogs.detail.copySuccess'));
  }).catch(() => {
    message.error(t('aiLogs.detail.copyFailed'));
  });
}
</script>

<style scoped>
.log-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.api-url {
  font-size: 13px;
  padding: 2px 8px;
  background: var(--theme-bg-elevated, #fafafa);
  border-radius: 3px;
  color: #1890ff;
  transition: background-color 0.3s ease;
}

.api-url:hover {
  opacity: 0.8;
}

.cost-value {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: #ff4d4f;
}

.latency-fast {
  color: #52c41a;
  font-weight: 600;
}

.latency-normal {
  color: #1890ff;
  font-weight: 600;
}

.latency-slow {
  color: #ff4d4f;
  font-weight: 600;
}

.message-section,
.params-section,
.response-section,
.metadata-section {
  margin-top: 12px;
}

.message-content,
.params-content,
.response-content,
.metadata-content {
  background: var(--theme-bg-elevated, #fafafa);
  border: 1px solid var(--theme-border, #f0f0f0);
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.actions {
  margin-top: 24px;
  text-align: right;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 600;
  background: var(--theme-bg-elevated, #fafafa);
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: background-color 0.3s ease, color 0.3s ease;
}

:deep(.ant-descriptions-item-content) {
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s ease;
}

:deep(.ant-modal-content) {
  background: var(--theme-bg-container, #ffffff);
  transition: background-color 0.3s ease;
}

:deep(.ant-modal-header) {
  background: var(--theme-bg-container, #ffffff);
  border-bottom-color: var(--theme-border, #f0f0f0);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.ant-modal-title) {
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s ease;
}

:deep(.ant-divider) {
  border-color: var(--theme-border, #f0f0f0);
  transition: border-color 0.3s ease;
}

:deep(.ant-divider-inner-text) {
  color: var(--theme-text-secondary, rgba(0, 0, 0, 0.65));
  transition: color 0.3s ease;
}
</style>
