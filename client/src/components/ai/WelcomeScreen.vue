<template>
  <div class="welcome-screen">
    <!-- No Session State -->
    <div v-if="showNoSession" class="no-session-state">
      <div class="no-session-content">
        <div class="no-session-icon">
          <RobotOutlined />
        </div>
        <div class="no-session-text">
          <h3>{{ t('aiChat.welcome.noSession.title') }}</h3>
          <p>{{ t('aiChat.welcome.noSession.subtitle') }}</p>
        </div>
        <div class="no-session-actions">
          <a-button type="primary" size="large" @click="handleCreateSession" class="start-chat-btn">
            <PlusOutlined />
            {{ t('aiChat.welcome.noSession.action') }}
          </a-button>
        </div>
      </div>
    </div>

    <!-- Welcome Message (when has session but first message) -->
    <div v-else-if="showWelcomeMessage" class="welcome-message">
      <div class="welcome-icon">
        <RobotOutlined />
      </div>
      <div class="welcome-content">
        <h3>{{ t('aiChat.panel.title') }}</h3>
        <p>{{ modeDescription }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RobotOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

interface Props {
  hasActiveSession: boolean
  messageCount: number
  currentMode: string
  modeDescription: string
}

interface Emits {
  (e: 'create-session'): void
}

const props = withDefaults(defineProps<Props>(), {
  hasActiveSession: false,
  messageCount: 0,
  currentMode: 'chat',
  modeDescription: ''
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// 计算显示状态
const showNoSession = computed(() => !props.hasActiveSession)
const showWelcomeMessage = computed(() => props.hasActiveSession && props.messageCount === 1)

// 处理创建会话
const handleCreateSession = () => {
  emit('create-session')
}
</script>

<style scoped>
/* No Session State */
.no-session-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.no-session-content {
  text-align: center;
  max-width: 300px;
}

.no-session-icon {
  margin-bottom: 24px;
}

.no-session-icon .anticon {
  font-size: 64px;
  color: var(--theme-text-secondary);
  opacity: 0.6;
}

.no-session-text h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0 0 8px 0;
}

.no-session-text p {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.start-chat-btn {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.start-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

/* Welcome Message */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
  margin-bottom: 24px;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.welcome-icon .anticon {
  font-size: 32px;
  color: white;
}

.welcome-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0 0 8px 0;
}

.welcome-content p {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .welcome-message {
    padding: 24px 12px;
  }

  .no-session-state {
    padding: 24px 16px;
  }

  .start-chat-btn {
    width: 100%;
  }
}
</style>
