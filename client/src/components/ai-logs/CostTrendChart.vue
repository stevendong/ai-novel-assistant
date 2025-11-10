<template>
  <a-card :title="t('aiLogs.charts.costTrend.title')" :loading="loading" :bordered="false">
    <template #extra>
      <a-radio-group v-model:value="period" button-style="solid" size="small" @change="handlePeriodChange">
        <a-radio-button value="day">{{ t('aiLogs.charts.costTrend.day') }}</a-radio-button>
        <a-radio-button value="week">{{ t('aiLogs.charts.costTrend.week') }}</a-radio-button>
        <a-radio-button value="month">{{ t('aiLogs.charts.costTrend.month') }}</a-radio-button>
      </a-radio-group>
    </template>
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="!data || !data.trends || data.trends.length === 0" class="empty-state">
      <a-empty :description="t('aiLogs.charts.costTrend.noData')" />
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
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['period-change']);

const chartRef = ref(null);
const period = ref('month');
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
  if (!chartInstance || !props.data || !props.data.trends || props.data.trends.length === 0) return;

  const dates = props.data.trends.map(item => item.date);
  const costs = props.data.trends.map(item => item.cost);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const param = params[0];
        return `${param.name}<br/>${t('aiLogs.charts.costTrend.cost')}: $${param.value.toFixed(4)}`;
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
      data: dates,
      boundaryGap: false,
      axisLabel: {
        rotate: 30,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: t('aiLogs.charts.costTrend.costLabel'),
      axisLabel: {
        formatter: '${value}'
      }
    },
    series: [
      {
        name: t('aiLogs.charts.costTrend.cost'),
        type: 'line',
        data: costs,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
            { offset: 1, color: 'rgba(255, 77, 79, 0.05)' }
          ])
        },
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

function handlePeriodChange() {
  emit('period-change', period.value);
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
