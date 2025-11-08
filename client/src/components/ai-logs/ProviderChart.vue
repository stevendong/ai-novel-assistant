<template>
  <a-card title="按提供商统计" :loading="loading" :bordered="false">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="!data || data.length === 0" class="empty-state">
      <a-empty description="暂无数据" />
    </div>
  </a-card>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

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

  const providers = props.data.map(item => `${item.provider}\n${item.model}`);
  const calls = props.data.map(item => item.calls);
  const costs = props.data.map(item => item.totalCost);
  const tokens = props.data.map(item => item.totalTokens);

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
          <strong>${item.provider.toUpperCase()} - ${item.model}</strong><br/>
          调用次数: ${item.calls.toLocaleString()}<br/>
          总Token: ${item.totalTokens.toLocaleString()}<br/>
          总成本: $${item.totalCost.toFixed(4)}<br/>
          平均延迟: ${Math.round(item.avgLatency)}ms
        `;
      }
    },
    legend: {
      data: ['调用次数', '成本 (×0.01$)', 'Token (×1000)']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: providers,
      axisLabel: {
        interval: 0,
        rotate: 30,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '调用次数',
        type: 'bar',
        data: calls,
        itemStyle: {
          color: '#1890ff'
        }
      },
      {
        name: '成本 (×0.01$)',
        type: 'bar',
        data: costs.map(c => (c * 100).toFixed(2)),
        itemStyle: {
          color: '#ff4d4f'
        }
      },
      {
        name: 'Token (×1000)',
        type: 'bar',
        data: tokens.map(t => (t / 1000).toFixed(2)),
        itemStyle: {
          color: '#52c41a'
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
