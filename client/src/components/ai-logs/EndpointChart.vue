<template>
  <a-card :title="t('aiLogs.charts.endpoint.title')" :loading="loading" :bordered="false">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="!data || data.length === 0" class="empty-state">
      <a-empty :description="t('aiLogs.charts.endpoint.noData')" />
    </div>
  </a-card>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts';

const { t } = useI18n();

const props = defineProps({
  data: {
    type: Array,
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
  if (!chartInstance || !props.data || props.data.length === 0) return;

  const endpoints = props.data.map(item => item.apiUrl || t('aiLogs.charts.endpoint.unknown'));
  const calls = props.data.map(item => item.calls);
  const costs = props.data.map(item => item.totalCost);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const index = params[0].dataIndex;
        const item = props.data[index];
        return `
          <strong>${item.apiUrl || t('aiLogs.charts.endpoint.unknown')}</strong><br/>
          ${t('aiLogs.charts.endpoint.calls')}: ${item.calls.toLocaleString()}<br/>
          ${t('aiLogs.charts.endpoint.totalTokens')}: ${item.totalTokens.toLocaleString()}<br/>
          ${t('aiLogs.charts.endpoint.totalCost')}: $${item.totalCost.toFixed(4)}<br/>
          ${t('aiLogs.charts.endpoint.avgLatency')}: ${Math.round(item.avgLatency)}ms
        `;
      }
    },
    legend: {
      data: [t('aiLogs.charts.endpoint.callsCount'), t('aiLogs.charts.endpoint.costLabel')]
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: endpoints,
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 11,
        formatter: (value) => {
          if (value.length > 25) {
            return value.substring(0, 25) + '...';
          }
          return value;
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: t('aiLogs.charts.endpoint.callsCount'),
        position: 'left'
      },
      {
        type: 'value',
        name: t('aiLogs.charts.endpoint.costLabel'),
        position: 'right'
      }
    ],
    series: [
      {
        name: t('aiLogs.charts.endpoint.callsCount'),
        type: 'bar',
        yAxisIndex: 0,
        data: calls,
        itemStyle: {
          color: '#1890ff'
        }
      },
      {
        name: t('aiLogs.charts.endpoint.costLabel'),
        type: 'line',
        yAxisIndex: 1,
        data: costs,
        smooth: true,
        itemStyle: {
          color: '#ff4d4f'
        },
        lineStyle: {
          width: 3
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
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
}

.empty-state {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
