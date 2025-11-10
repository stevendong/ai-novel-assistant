<template>
  <div class="performance-metrics">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-card :title="t('aiLogs.performance.latencyDistribution')" :loading="loading" :bordered="false">
          <div class="metric-item">
            <div class="metric-label">{{ t('aiLogs.performance.avgLatency') }}</div>
            <div class="metric-value" :class="getLatencyClass(data.avgLatency)">
              {{ Math.round(data.avgLatency || 0) }}ms
            </div>
          </div>
          <a-divider />
          <div class="percentile-metrics">
            <div class="percentile-item">
              <span class="percentile-label">P50:</span>
              <span class="percentile-value">{{ Math.round(data.p50Latency || 0) }}ms</span>
            </div>
            <div class="percentile-item">
              <span class="percentile-label">P95:</span>
              <span class="percentile-value">{{ Math.round(data.p95Latency || 0) }}ms</span>
            </div>
            <div class="percentile-item">
              <span class="percentile-label">P99:</span>
              <span class="percentile-value">{{ Math.round(data.p99Latency || 0) }}ms</span>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :span="8">
        <a-card :title="t('aiLogs.performance.errorRate')" :loading="loading" :bordered="false">
          <div class="metric-item">
            <div class="metric-label">{{ t('aiLogs.performance.errorRate') }}</div>
            <div class="metric-value" :class="getErrorRateClass(data.errorRate)">
              {{ (data.errorRate || 0).toFixed(2) }}%
            </div>
          </div>
          <a-divider />
          <div class="error-details">
            <div class="detail-row">
              <span class="detail-label">{{ t('aiLogs.performance.totalCalls') }}:</span>
              <span class="detail-value">{{ formatNumber(data.totalCalls || 0) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t('aiLogs.performance.errorCount') }}:</span>
              <span class="detail-value error-count">{{ formatNumber(data.errorCount || 0) }}</span>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :span="8">
        <a-card :title="t('aiLogs.performance.performanceRating')" :loading="loading" :bordered="false">
          <div class="performance-rating">
            <div class="rating-badge" :class="getRatingClass()">
              {{ getPerformanceRating() }}
            </div>
            <div class="rating-description">
              {{ getRatingDescription() }}
            </div>
          </div>
          <a-divider />
          <div class="rating-metrics">
            <div class="rating-item">
              <CheckCircleOutlined v-if="(data.errorRate || 0) < 1" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
              <span>{{ (data.errorRate || 0) < 1 ? t('aiLogs.performance.errorRateGood') : t('aiLogs.performance.errorRateNeedsImprovement') }}</span>
            </div>
            <div class="rating-item">
              <CheckCircleOutlined v-if="(data.avgLatency || 0) < 2000" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
              <span>{{ (data.avgLatency || 0) < 2000 ? t('aiLogs.performance.responseSpeedGood') : t('aiLogs.performance.responseSpeedNeedsOptimization') }}</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card :title="t('aiLogs.performance.latencyChart')" :loading="loading" :bordered="false">
          <div ref="chartRef" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts';

const { t } = useI18n();

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const chartRef = ref(null);
let chartInstance = null;

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  window.removeEventListener('resize', handleResize);
});

watch(() => props.data, () => {
  updateChart();
}, { deep: true });

function initChart() {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  updateChart();
}

function updateChart() {
  if (!chartInstance) return;

  const data = props.data;
  const latencies = [
    { name: 'P50', value: data.p50Latency || 0 },
    { name: 'P95', value: data.p95Latency || 0 },
    { name: 'P99', value: data.p99Latency || 0 },
    { name: t('aiLogs.performance.average'), value: data.avgLatency || 0 }
  ];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        return `${params[0].name}: ${params[0].value}ms`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: latencies.map(l => l.name)
    },
    yAxis: {
      type: 'value',
      name: t('aiLogs.performance.latencyMs')
    },
    series: [
      {
        name: t('aiLogs.performance.latencyLabel'),
        type: 'bar',
        data: latencies.map(l => l.value),
        itemStyle: {
          color: (params) => {
            const value = params.value;
            if (value < 1000) return '#52c41a';
            if (value < 3000) return '#1890ff';
            return '#ff4d4f';
          }
        }
      }
    ]
  };

  chartInstance.setOption(option);
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize();
  }
}

function getLatencyClass(latency) {
  if (!latency) return '';
  if (latency < 1000) return 'latency-fast';
  if (latency < 3000) return 'latency-normal';
  return 'latency-slow';
}

function getErrorRateClass(errorRate) {
  if (!errorRate) return 'error-rate-good';
  if (errorRate < 1) return 'error-rate-good';
  if (errorRate < 5) return 'error-rate-warning';
  return 'error-rate-bad';
}

function getPerformanceRating() {
  const avgLatency = props.data.avgLatency || 0;
  const errorRate = props.data.errorRate || 0;

  if (avgLatency < 1000 && errorRate < 1) return 'A';
  if (avgLatency < 2000 && errorRate < 2) return 'B';
  if (avgLatency < 3000 && errorRate < 5) return 'C';
  return 'D';
}

function getRatingClass() {
  const rating = getPerformanceRating();
  return `rating-${rating.toLowerCase()}`;
}

function getRatingDescription() {
  const rating = getPerformanceRating();
  return t(`aiLogs.performance.ratings.${rating.toLowerCase()}`, '');
}

function formatNumber(num) {
  return num?.toLocaleString() || '0';
}
</script>

<style scoped>
.performance-metrics {
  padding: 16px 0;
}

.metric-item {
  text-align: center;
  padding: 16px 0;
}

.metric-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 32px;
  font-weight: 600;
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

.error-rate-good {
  color: #52c41a;
}

.error-rate-warning {
  color: #faad14;
}

.error-rate-bad {
  color: #ff4d4f;
}

.percentile-metrics,
.error-details,
.rating-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.percentile-item,
.detail-row,
.rating-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.percentile-label,
.detail-label {
  color: #8c8c8c;
  font-size: 13px;
}

.percentile-value,
.detail-value {
  font-weight: 600;
  font-size: 14px;
}

.error-count {
  color: #ff4d4f;
}

.performance-rating {
  text-align: center;
  padding: 16px 0;
}

.rating-badge {
  display: inline-block;
  width: 80px;
  height: 80px;
  line-height: 80px;
  border-radius: 50%;
  font-size: 36px;
  font-weight: bold;
  color: white;
  margin-bottom: 12px;
}

.rating-a {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.rating-b {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
}

.rating-c {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
}

.rating-d {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
}

.rating-description {
  font-size: 14px;
  color: #595959;
}

.rating-item {
  justify-content: flex-start;
  gap: 8px;
}

.chart-container {
  width: 100%;
  height: 300px;
}
</style>
