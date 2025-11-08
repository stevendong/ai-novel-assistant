<template>
  <a-modal
    v-model:open="isVisible"
    title="调用日志详情"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="log" class="log-detail">
      <a-descriptions bordered :column="2" size="small">
        <a-descriptions-item label="调用时间" :span="2">
          {{ formatDate(log.createdAt) }}
        </a-descriptions-item>

        <a-descriptions-item label="提供商">
          <a-tag :color="getProviderColor(log.provider)">
            {{ log.provider.toUpperCase() }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="模型">
          <code>{{ log.model }}</code>
        </a-descriptions-item>

        <a-descriptions-item label="接口路径" :span="2">
          <code class="api-url">{{ log.apiUrl || '-' }}</code>
        </a-descriptions-item>

        <a-descriptions-item label="任务类型">
          <a-tag v-if="log.taskType" :color="getTaskTypeColor(log.taskType)">
            {{ getTaskTypeLabel(log.taskType) }}
          </a-tag>
          <span v-else>-</span>
        </a-descriptions-item>

        <a-descriptions-item label="状态">
          <a-tag :color="log.status === 'success' ? 'success' : 'error'">
            {{ log.status === 'success' ? '成功' : '失败' }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="提示词Token">
          {{ formatNumber(log.promptTokens) }}
        </a-descriptions-item>

        <a-descriptions-item label="完成Token">
          {{ formatNumber(log.completionTokens) }}
        </a-descriptions-item>

        <a-descriptions-item label="总Token">
          <strong>{{ formatNumber(log.totalTokens) }}</strong>
        </a-descriptions-item>

        <a-descriptions-item label="估算成本">
          <strong class="cost-value">${{ (log.estimatedCost || 0).toFixed(4) }}</strong>
        </a-descriptions-item>

        <a-descriptions-item label="延迟">
          <span :class="getLatencyClass(log.latencyMs)">
            {{ log.latencyMs ? `${log.latencyMs}ms` : '-' }}
          </span>
        </a-descriptions-item>

        <a-descriptions-item label="重试次数">
          {{ log.retryCount || 0 }}
        </a-descriptions-item>

        <a-descriptions-item v-if="log.novel" label="关联小说" :span="2">
          {{ log.novel.title }}
        </a-descriptions-item>

        <a-descriptions-item v-if="log.sessionId" label="会话ID" :span="2">
          <code>{{ log.sessionId }}</code>
        </a-descriptions-item>
      </a-descriptions>

      <a-divider>请求消息</a-divider>
      <div class="message-section">
        <pre class="message-content">{{ formatMessages(log.requestMessages) }}</pre>
      </div>

      <a-divider>请求参数</a-divider>
      <div class="params-section">
        <pre class="params-content">{{ formatParams(log.requestParams) }}</pre>
      </div>

      <a-divider>响应内容</a-divider>
      <div class="response-section">
        <a-alert
          v-if="log.status === 'error'"
          type="error"
          :message="log.errorMessage"
          :description="log.errorCode ? `错误代码: ${log.errorCode}` : null"
          show-icon
        />
        <pre v-else class="response-content">{{ log.responseContent || '无响应内容' }}</pre>
      </div>

      <a-divider v-if="log.responseMetadata">响应元数据</a-divider>
      <div v-if="log.responseMetadata" class="metadata-section">
        <pre class="metadata-content">{{ formatMetadata(log.responseMetadata) }}</pre>
      </div>

      <div class="actions">
        <a-space>
          <a-button @click="handleClose">关闭</a-button>
          <a-button type="primary" @click="handleCopy">复制详情</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';

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
    return paramsStr || '无参数';
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
    message.success('已复制到剪贴板');
  }).catch(() => {
    message.error('复制失败');
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
  background: #f5f5f5;
  border-radius: 3px;
  color: #1890ff;
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
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.actions {
  margin-top: 24px;
  text-align: right;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 600;
  background: #fafafa;
}
</style>
