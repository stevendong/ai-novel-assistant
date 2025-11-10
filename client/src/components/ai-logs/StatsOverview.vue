<template>
  <div class="stats-overview">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card :loading="loading" :bordered="false">
          <a-statistic
            :title="t('aiLogs.stats.totalCallsLabel')"
            :value="stats.totalCalls || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <ApiOutlined />
            </template>
          </a-statistic>
          <div class="stat-footer">
            {{ t('aiLogs.stats.successRateLabel') }}: <strong>{{ (stats.successRate || 0).toFixed(2) }}%</strong>
          </div>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card :loading="loading" :bordered="false">
          <a-statistic
            :title="t('aiLogs.stats.totalTokensLabel')"
            :value="stats.totalTokens || 0"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <NumberOutlined />
            </template>
          </a-statistic>
          <div class="stat-footer">
            {{ t('aiLogs.stats.promptLabel') }}: {{ formatNumber(stats.promptTokens || 0) }} /
            {{ t('aiLogs.stats.completionLabel') }}: {{ formatNumber(stats.completionTokens || 0) }}
          </div>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card :loading="loading" :bordered="false">
          <a-statistic
            :title="t('aiLogs.stats.totalCostLabel')"
            :value="(stats.totalCost || 0).toFixed(4)"
            prefix="$"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix>
              <DollarOutlined />
            </template>
          </a-statistic>
          <div class="stat-footer">
            {{ t('aiLogs.stats.avgPerCallLabel') }}: <strong>${{ (stats.costPerCall || 0).toFixed(4) }}</strong>
          </div>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card :loading="loading" :bordered="false">
          <a-statistic
            :title="t('aiLogs.stats.avgLatencyLabel')"
            :value="Math.round(stats.avgLatency || 0)"
            suffix="ms"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix>
              <ClockCircleOutlined />
            </template>
          </a-statistic>
          <div class="stat-footer">
            {{ t('aiLogs.stats.costPerThousandTokensLabel') }}: <strong>${{ (stats.costPer1kTokens || 0).toFixed(4) }}</strong>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row v-if="stats.mostUsedModel" :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card :title="t('aiLogs.stats.mostUsedModelLabel')" :loading="loading" :bordered="false" size="small">
          <div class="most-used-model">
            <a-tag :color="getProviderColor(stats.mostUsedModel.provider)" style="font-size: 14px">
              {{ stats.mostUsedModel.provider.toUpperCase() }}
            </a-tag>
            <span class="model-name">{{ stats.mostUsedModel.model }}</span>
          </div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card :title="t('aiLogs.stats.callStatusLabel')" :loading="loading" :bordered="false" size="small">
          <div class="call-status">
            <div class="status-item">
              <span class="status-label">{{ t('aiLogs.stats.successLabel') }}:</span>
              <a-tag color="success">{{ formatNumber(stats.successfulCalls || 0) }}</a-tag>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('aiLogs.stats.failedLabel') }}:</span>
              <a-tag color="error">{{ formatNumber(stats.failedCalls || 0) }}</a-tag>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('aiLogs.stats.totalLabel') }}:</span>
              <a-tag color="default">{{ formatNumber(stats.totalCalls || 0) }}</a-tag>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import {
  ApiOutlined,
  NumberOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
  stats: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

function getProviderColor(provider) {
  const colors = {
    openai: 'green',
    claude: 'purple',
    gemini: 'blue'
  };
  return colors[provider] || 'default';
}

function formatNumber(num) {
  return num?.toLocaleString() || '0';
}
</script>

<style scoped>
.stats-overview {
  margin-bottom: 24px;
}

.stat-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #8c8c8c;
}

.most-used-model {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-name {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  font-weight: 600;
}

.call-status {
  display: flex;
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #595959;
}

:deep(.ant-card-body) {
  padding: 20px;
}

:deep(.ant-statistic-title) {
  font-size: 14px;
  color: #8c8c8c;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
}
</style>
