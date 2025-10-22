<template>
  <a-modal
    :open="visible"
    title="新建角色"
    width="800px"
    :maskClosable="false"
    @cancel="handleCancel"
  >
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button
          v-if="hasAIGeneration"
          @click="handleClearAI"
        >
          清除AI内容
        </a-button>
        <a-button
          type="primary"
          :loading="creating"
          @click="handleCreate"
          :disabled="!formData.name"
        >
          创建角色
        </a-button>
      </a-space>
    </template>

    <div class="character-form">
      <a-tabs v-model:activeKey="activeTab">
        <!-- Manual Input Tab -->
        <a-tab-pane key="manual" tab="手动输入">
          <a-form :model="formData" layout="vertical">
            <a-form-item label="角色姓名" required>
              <a-input
                v-model:value="formData.name"
                placeholder="输入角色姓名"
              />
            </a-form-item>

            <a-form-item label="角色描述">
              <a-textarea
                v-model:value="formData.description"
                :rows="3"
                placeholder="简要描述角色..."
              />
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- AI Generate Tab -->
        <a-tab-pane key="ai" tab="AI生成">
          <a-alert
            message="提示"
            description="描述你想要的角色，AI会自动生成完整的角色设定。"
            type="info"
            show-icon
            closable
            class="mb-4"
          />

          <a-form :model="aiForm" layout="vertical">
            <a-form-item label="角色描述提示词">
              <a-textarea
                v-model:value="aiForm.prompt"
                :rows="4"
                placeholder="例如：一个30岁的私人侦探，冷静睿智，有着不为人知的过去..."
              />
            </a-form-item>

            <a-form-item>
              <a-button
                type="primary"
                block
                :loading="generating"
                @click="handleGenerate"
                :disabled="!aiForm.prompt"
              >
                <template #icon><RobotOutlined /></template>
                生成角色
              </a-button>
            </a-form-item>
          </a-form>

          <!-- AI Generated Result -->
          <div v-if="aiResult" class="ai-result">
            <a-divider>AI生成结果</a-divider>

            <a-descriptions bordered :column="1" size="small">
              <a-descriptions-item label="姓名">
                {{ aiResult.name }}
              </a-descriptions-item>
              <a-descriptions-item v-if="aiResult.gender" label="性别">
                {{ aiResult.gender }}
              </a-descriptions-item>
              <a-descriptions-item label="年龄">
                {{ aiResult.age }}
              </a-descriptions-item>
              <a-descriptions-item label="身份">
                {{ aiResult.identity }}
              </a-descriptions-item>
              <a-descriptions-item label="描述">
                {{ aiResult.description }}
              </a-descriptions-item>
              <a-descriptions-item label="性格">
                {{ aiResult.personality }}
              </a-descriptions-item>
              <a-descriptions-item label="外貌">
                {{ aiResult.appearance }}
              </a-descriptions-item>
            </a-descriptions>

            <a-alert
              v-if="aiResult.reasoning"
              :message="aiResult.reasoning"
              type="success"
              show-icon
              class="mt-4"
            />
          </div>
        </a-tab-pane>

        <!-- Import Tab -->
        <a-tab-pane key="import" tab="导入角色卡">
          <a-alert
            message="支持SillyTavern角色卡"
            description="从文件库选择PNG格式的角色卡进行导入"
            type="info"
            show-icon
            closable
            class="mb-4"
          />

          <a-button
            type="primary"
            block
            @click="$emit('selectCard')"
          >
            <template #icon><UploadOutlined /></template>
            从文件库选择
          </a-button>
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RobotOutlined, UploadOutlined } from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  creating?: boolean
  generating?: boolean
  aiResult?: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'create', data: any): void
  (e: 'generate', prompt: string): void
  (e: 'clearAI'): void
  (e: 'selectCard'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref('manual')
const formData = ref({
  name: '',
  description: ''
})
const aiForm = ref({
  prompt: ''
})

const hasAIGeneration = computed(() => !!props.aiResult)

// Watch AI result and populate form
watch(() => props.aiResult, (result) => {
  if (result) {
    formData.value.name = result.name || ''
    formData.value.description = result.description || ''
  }
})

const handleCancel = () => {
  emit('update:visible', false)
  // Reset form
  formData.value = { name: '', description: '' }
  aiForm.value = { prompt: '' }
  activeTab.value = 'manual'
}

const handleCreate = () => {
  const data = hasAIGeneration.value
    ? props.aiResult
    : formData.value

  emit('create', data)
}

const handleGenerate = () => {
  emit('generate', aiForm.value.prompt)
}

const handleClearAI = () => {
  emit('clearAI')
  formData.value = { name: '', description: '' }
}
</script>

<style scoped>
.character-form {
  min-height: 300px;
}

.ai-result {
  margin-top: 20px;
}
</style>
