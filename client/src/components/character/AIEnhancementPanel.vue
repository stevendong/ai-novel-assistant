<template>
  <div v-if="visible && result" class="ai-enhancement-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <BulbOutlined class="mr-2" />
        AI 完善建议
      </h3>
      <a-button
        type="text"
        size="small"
        @click="$emit('close')"
      >
        <template #icon><CloseOutlined /></template>
      </a-button>
    </div>

    <div class="panel-content">
      <!-- Suggestions -->
      <div class="suggestions-section">
        <h4 class="section-title">完善建议</h4>

        <a-collapse v-model:activeKey="activeKeys" ghost>
          <a-collapse-panel
            v-for="(value, key) in result.suggestions"
            :key="key"
            :header="getFieldLabel(key)"
          >
            <div class="suggestion-content">
              <p class="suggestion-text">{{ value }}</p>
              <a-button
                size="small"
                type="primary"
                @click="applySuggestion(key, value)"
              >
                应用建议
              </a-button>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>

      <!-- Questions -->
      <div v-if="result.questions" class="questions-section">
        <h4 class="section-title">思考问题</h4>
        <ul class="question-list">
          <li
            v-for="(question, index) in result.questions"
            :key="index"
            class="question-item"
          >
            {{ question }}
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <a-space>
          <a-button @click="$emit('close')">
            关闭
          </a-button>
          <a-button type="primary" @click="applyAll">
            应用全部建议
          </a-button>
        </a-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BulbOutlined, CloseOutlined } from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  result: any
}

interface Emits {
  (e: 'close'): void
  (e: 'apply', field: string, value: string): void
  (e: 'applyAll', suggestions: Record<string, string>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeKeys = ref<string[]>([])

const fieldLabels: Record<string, string> = {
  age: '年龄',
  identity: '身份/职业',
  description: '角色描述',
  appearance: '外貌特征',
  personality: '性格特点',
  values: '核心价值观',
  fears: '恐惧与弱点',
  background: '个人背景',
  skills: '技能与能力',
  relationships: '人际关系'
}

const getFieldLabel = (key: string): string => {
  return fieldLabels[key] || key
}

const applySuggestion = (field: string, value: string) => {
  emit('apply', field, value)
}

const applyAll = () => {
  emit('applyAll', props.result.suggestions)
}
</script>

<style scoped>
.ai-enhancement-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--theme-bg-container);
  border-left: 1px solid var(--theme-border);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-primary);
  display: flex;
  align-items: center;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.suggestions-section,
.questions-section {
  margin-bottom: 24px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text-primary);
}

.suggestion-content {
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 8px;
}

.suggestion-text {
  margin-bottom: 12px;
  line-height: 1.6;
  color: var(--theme-text-primary);
}

.question-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.question-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  background: var(--theme-bg-elevated);
  border-radius: 8px;
  border-left: 3px solid var(--theme-primary);
  color: var(--theme-text-primary);
  line-height: 1.6;
}

.panel-actions {
  padding-top: 16px;
  border-top: 1px solid var(--theme-border);
  text-align: right;
}
</style>
