<template>
  <div class="ai-logs-viewer">
    <div class="header">
      <h1 class="title">AI调用日志</h1>
      <a-space>
        <a-range-picker
          v-model:value="dateRange"
          :placeholder="['开始日期', '结束日期']"
          @change="handleDateRangeChange"
        />
        <a-button type="primary" @click="refreshData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="logs" tab="调用日志">
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

      <a-tab-pane key="stats" tab="统计数据">
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

      <a-tab-pane key="analytics" tab="性能分析">
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
import axios from 'axios';
import LogsFilter from './LogsFilter.vue';
import LogsTable from './LogsTable.vue';
import LogDetail from './LogDetail.vue';
import StatsOverview from './StatsOverview.vue';
import ProviderChart from './ProviderChart.vue';
import EndpointChart from './EndpointChart.vue';
import CostTrendChart from './CostTrendChart.vue';
import PerformanceMetrics from './PerformanceMetrics.vue';

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

    const response = await axios.get(`${API_BASE_URL}/api/ai-logs`, { params });

    logs.value = response.data.data;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    message.error('加载日志失败: ' + (error.response?.data?.error || error.message));
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
      axios.get(`${API_BASE_URL}/api/ai-logs/stats/summary`, { params }),
      axios.get(`${API_BASE_URL}/api/ai-logs/stats/by-provider`, { params }),
      axios.get(`${API_BASE_URL}/api/ai-logs/stats/by-endpoint`, { params }),
      axios.get(`${API_BASE_URL}/api/ai-logs/stats/costs`, { params: { period: 'month' } }),
      axios.get(`${API_BASE_URL}/api/ai-logs/stats/performance`, { params })
    ]);

    summaryStats.value = summary.data;
    providerStats.value = providers.data;
    endpointStats.value = endpoints.data;
    costTrends.value = costs.data;
    performanceData.value = performance.data;
  } catch (error) {
    message.error('加载统计数据失败: ' + (error.response?.data?.error || error.message));
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

function showDetail(log) {
  selectedLog.value = log;
  detailVisible.value = true;
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
  background: #fff;
  min-height: calc(100vh - 64px);
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
}

.logs-section {
  display: flex;
  gap: 16px;
}

.charts-row {
  margin-top: 16px;
}
</style>
