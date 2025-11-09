<template>
  <div class="ai-logs-viewer">
    <div class="header">
      <h1 class="title">{{ t('aiLogs.title') }}</h1>
      <a-space>
        <a-range-picker
          v-model:value="dateRange"
          :placeholder="[t('aiLogs.filter.startDate'), t('aiLogs.filter.endDate')]"
          @change="handleDateRangeChange"
        />
        <a-button type="primary" @click="refreshData">
          <template #icon><ReloadOutlined /></template>
          {{ t('common.refresh') }}
        </a-button>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="logs" :tab="t('aiLogs.tabs.logs')">
        <div class="logs-section">
          <LogsFilter v-model:filters="filters" @change="loadLogs" />
          <LogsTable
            :data="logs"
            :loading="loading"
            :pagination="pagination"
            @detail="showDetail"
            @page-change="handlePageChange"
          />
        </div>
      </a-tab-pane>

      <a-tab-pane key="stats" :tab="t('aiLogs.tabs.stats')">
        <StatsOverview :stats="summaryStats" :loading="statsLoading" />
        <a-row :gutter="16" class="charts-row">
          <a-col :span="12">
            <ProviderChart :data="providerStats" :loading="statsLoading" />
          </a-col>
          <a-col :span="12">
            <EndpointChart :data="endpointStats" :loading="statsLoading" />
          </a-col>
        </a-row>
        <a-row :gutter="16" class="charts-row">
          <a-col :span="24">
            <CostTrendChart :data="costTrends" :loading="statsLoading" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="analytics" :tab="t('aiLogs.tabs.analytics')">
        <PerformanceMetrics :data="performanceData" :loading="statsLoading" />
      </a-tab-pane>
    </a-tabs>

    <LogDetail v-model:visible="detailVisible" :log="selectedLog" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/utils/api';
import LogsFilter from './LogsFilter.vue';
import LogsTable from './LogsTable.vue';
import LogDetail from './LogDetail.vue';
import StatsOverview from './StatsOverview.vue';
import ProviderChart from './ProviderChart.vue';
import EndpointChart from './EndpointChart.vue';
import CostTrendChart from './CostTrendChart.vue';
import PerformanceMetrics from './PerformanceMetrics.vue';

const { t } = useI18n();

const activeTab = ref('logs');
const loading = ref(false);
const statsLoading = ref(false);
const dateRange = ref([]);

const filters = reactive({
  provider: null,
  model: null,
  taskType: null,
  status: null,
  apiUrl: null,
  novelId: null
});

const logs = ref([]);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
});

const summaryStats = ref({});
const providerStats = ref([]);
const endpointStats = ref([]);
const costTrends = ref({ trends: [] });
const performanceData = ref({});

const detailVisible = ref(false);
const selectedLog = ref(null);

onMounted(() => {
  loadLogs();
});

async function loadLogs() {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      ...filters
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString();
      params.endDate = dateRange.value[1].toISOString();
    }

    const response = await api.get('/api/ai-logs', { params });

    logs.value = response.data.data;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    message.error(t('aiLogs.messages.loadFailed') + ': ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  statsLoading.value = true;
  try {
    const params = {};
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString();
      params.endDate = dateRange.value[1].toISOString();
    }

    const [summary, providers, endpoints, costs, performance] = await Promise.all([
      api.get('/api/ai-logs/stats/summary', { params }),
      api.get('/api/ai-logs/stats/by-provider', { params }),
      api.get('/api/ai-logs/stats/by-endpoint', { params }),
      api.get('/api/ai-logs/stats/costs', { params: { period: 'month' } }),
      api.get('/api/ai-logs/stats/performance', { params })
    ]);

    summaryStats.value = summary.data;
    providerStats.value = providers.data;
    endpointStats.value = endpoints.data;
    costTrends.value = costs.data;
    performanceData.value = performance.data;
  } catch (error) {
    message.error(t('aiLogs.messages.loadStatsFailed') + ': ' + (error.response?.data?.error || error.message));
  } finally {
    statsLoading.value = false;
  }
}

function handleTabChange(key) {
  if (key === 'stats' || key === 'analytics') {
    loadStats();
  }
}

function handlePageChange(page, pageSize) {
  pagination.current = page;
  pagination.pageSize = pageSize;
  loadLogs();
}

function handleDateRangeChange() {
  if (activeTab.value === 'logs') {
    loadLogs();
  } else {
    loadStats();
  }
}

async function showDetail(log) {
  try {
    loading.value = true;
    const response = await api.get(`/api/ai-logs/${log.id}`);
    selectedLog.value = response.data;
    detailVisible.value = true;
  } catch (error) {
    message.error(t('aiLogs.messages.loadDetailFailed') + ': ' + (error.response?.data?.error || error.message));
  } finally {
    loading.value = false;
  }
}

function refreshData() {
  if (activeTab.value === 'logs') {
    loadLogs();
  } else {
    loadStats();
  }
}
</script>

<style scoped>
.ai-logs-viewer {
  padding: 24px;
  background: var(--theme-bg-container, #fff);
  min-height: calc(100vh - 64px);
  transition: background-color 0.3s ease;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s ease;
}

.logs-section {
  display: flex;
  gap: 16px;
  overflow: hidden;
}

.logs-section > * {
  flex-shrink: 0;
}

.logs-section :deep(.logs-table) {
  flex: 1;
  min-width: 0;
}

.charts-row {
  margin-top: 16px;
}
</style>
