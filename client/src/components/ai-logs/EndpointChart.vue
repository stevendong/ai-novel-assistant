<template>
  <a-card title="按接口路径统计" :loading="loading" :bordered="false">
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

  const endpoints = props.data.map(item => item.apiUrl || '未知');
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
          <strong>${item.apiUrl || '未知'}</strong><br/>
          调用次数: ${item.calls.toLocaleString()}<br/>
          总Token: ${item.totalTokens.toLocaleString()}<br/>
          总成本: $${item.totalCost.toFixed(4)}<br/>
          平均延迟: ${Math.round(item.avgLatency)}ms
        `;
      }
    },
    legend: {
      data: ['调用次数', '成本 ($)']
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
        name: '调用次数',
        position: 'left'
      },
      {
        type: 'value',
        name: '成本 ($)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '调用次数',
        type: 'bar',
        yAxisIndex: 0,
        data: calls,
        itemStyle: {
          color: '#1890ff'
        }
      },
      {
        name: '成本 ($)',
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
