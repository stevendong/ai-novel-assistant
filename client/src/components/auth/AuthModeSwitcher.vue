<template>
  <div class="auth-mode-switcher">
    <a-dropdown v-if="showSwitcher" :trigger="['click']" placement="bottomRight">
      <a-button
        type="text"
        size="small"
        class="auth-mode-btn"
        :loading="authStore.switchingMode"
      >
        <template #icon>
          <SafetyCertificateOutlined />
        </template>
        {{ currentModeDisplayName }}
        <DownOutlined />
      </a-button>

      <template #overlay>
        <a-menu @click="handleModeSwitch" class="auth-mode-menu">
          <a-menu-item-group title="认证方式">
            <a-menu-item
              v-for="mode in availableModes"
              :key="mode"
              :disabled="mode === currentMode"
              class="auth-mode-item"
            >
              <div class="mode-option">
                <div class="mode-info">
                  <span class="mode-name">
                    {{ getModeDisplayName(mode) }}
                  </span>
                  <small class="mode-description">
                    {{ getModeDescription(mode) }}
                  </small>
                </div>
                <div class="mode-status">
                  <a-tag
                    v-if="mode === currentMode"
                    color="green"
                    size="small"
                  >
                    当前
                  </a-tag>
                  <SafetyCertificateOutlined
                    v-if="mode === 'clerk'"
                    style="color: #52c41a;"
                  />
                  <UserOutlined
                    v-else
                    style="color: #1890ff;"
                  />
                </div>
              </div>
            </a-menu-item>
          </a-menu-item-group>

          <a-menu-divider />

          <a-menu-item key="info" disabled class="auth-info-item">
            <div class="auth-info">
              <div class="info-row">
                <span class="info-label">社交登录:</span>
                <span class="info-value">
                  {{ authStore.supportsSocialLogin ? '支持' : '不支持' }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">邮箱验证:</span>
                <span class="info-value">
                  {{ authStore.supportsEmailVerification ? '支持' : '不支持' }}
                </span>
              </div>
            </div>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <!-- 开发环境调试信息 -->
    <div v-if="showDebugInfo" class="debug-info">
      <a-alert
        type="info"
        size="small"
        :message="`当前模式: ${currentModeDisplayName}`"
        :description="debugDescription"
        show-icon
        closable
        @close="hideDebugInfo"
      />
    </div>

    <!-- 切换确认对话框 -->
    <a-modal
      v-model:open="showSwitchConfirm"
      title="切换认证方式"
      @ok="confirmModeSwitch"
      @cancel="cancelModeSwitch"
      :confirmLoading="authStore.switchingMode"
      ok-text="确认切换"
      cancel-text="取消"
    >
      <div class="switch-confirm-content">
        <a-alert
          type="warning"
          message="注意"
          :description="switchWarningMessage"
          show-icon
          style="margin-bottom: 16px"
        />

        <div class="mode-comparison">
          <div class="current-mode">
            <h4>当前方式: {{ getModeDisplayName(currentMode) }}</h4>
            <p>{{ getModeDescription(currentMode) }}</p>
          </div>

          <div class="arrow">
            <ArrowRightOutlined />
          </div>

          <div class="target-mode">
            <h4>切换至: {{ getModeDisplayName(pendingMode) }}</h4>
            <p>{{ getModeDescription(pendingMode) }}</p>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  SafetyCertificateOutlined,
  DownOutlined,
  UserOutlined,
  ArrowRightOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useUnifiedAuthStore } from '@/stores/unifiedAuth'
import { authConfig, type AuthMode } from '@/config/authConfig'

interface Props {
  size?: 'small' | 'middle' | 'large'
  showDebug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  showDebug: false
})

const authStore = useUnifiedAuthStore()

// 状态
const showSwitchConfirm = ref(false)
const pendingMode = ref<AuthMode>('legacy')
const showDebugInfo = ref(props.showDebug && import.meta.env.DEV)

// 计算属性
const currentMode = computed(() => authStore.currentAuthMode)
const availableModes = computed(() => authStore.availableModes)
const showSwitcher = computed(() => authStore.allowsModeSwitch && availableModes.value.length > 1)

const currentModeDisplayName = computed(() =>
  authConfig.getAuthModeDisplayName(currentMode.value)
)

const switchWarningMessage = computed(() => {
  if (authStore.isAuthenticated) {
    return '切换认证方式将会登出当前账户，您需要重新登录。请确保您记住了登录凭据。'
  } else {
    return '切换认证方式将会改变登录界面和功能。您可以随时切换回来。'
  }
})

const debugDescription = computed(() => {
  const features = []
  if (authStore.supportsSocialLogin) features.push('社交登录')
  if (authStore.supportsEmailVerification) features.push('邮箱验证')
  return `功能: ${features.join(', ') || '基础认证'}`
})

// 方法
function getModeDisplayName(mode: AuthMode): string {
  return authConfig.getAuthModeDisplayName(mode)
}

function getModeDescription(mode: AuthMode): string {
  return authConfig.getAuthModeDescription(mode)
}

function handleModeSwitch({ key }: { key: string }) {
  if (key === 'info') return

  const targetMode = key as AuthMode
  if (targetMode === currentMode.value) return

  pendingMode.value = targetMode
  showSwitchConfirm.value = true
}

async function confirmModeSwitch() {
  try {
    const success = await authStore.switchAuthMode(pendingMode.value)

    if (success) {
      message.success(`已切换到${getModeDisplayName(pendingMode.value)}`)
      showSwitchConfirm.value = false

      // 刷新页面以确保所有组件重新加载
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      message.error('切换失败，请稍后重试')
    }
  } catch (error: any) {
    console.error('Failed to switch auth mode:', error)
    message.error(error.message || '切换失败')
  }
}

function cancelModeSwitch() {
  showSwitchConfirm.value = false
  pendingMode.value = currentMode.value
}

function hideDebugInfo() {
  showDebugInfo.value = false
}

// 生命周期
onMounted(() => {
  // 确保统一认证 store 已初始化
  if (!authStore.isInitialized) {
    authStore.init()
  }
})
</script>

<style scoped>
.auth-mode-switcher {
  position: relative;
}

.auth-mode-btn {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  height: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.auth-mode-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.auth-mode-menu {
  min-width: 280px;
}

.auth-mode-item {
  padding: 8px 12px !important;
  height: auto !important;
  line-height: normal !important;
}

.mode-option {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.mode-info {
  flex: 1;
}

.mode-name {
  font-weight: 500;
  color: #262626;
  display: block;
  margin-bottom: 2px;
}

.mode-description {
  color: #8c8c8c;
  font-size: 11px;
  line-height: 1.3;
  display: block;
}

.mode-status {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.auth-info-item {
  cursor: default !important;
  opacity: 1 !important;
}

.auth-info {
  padding: 4px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-bottom: 2px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #8c8c8c;
}

.info-value {
  color: #262626;
  font-weight: 500;
}

.debug-info {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  z-index: 1000;
  max-width: 300px;
}

.switch-confirm-content {
  padding: 8px 0;
}

.mode-comparison {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.current-mode,
.target-mode {
  flex: 1;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
}

.current-mode h4,
.target-mode h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #262626;
}

.current-mode p,
.target-mode p {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}

.target-mode {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.arrow {
  color: #52c41a;
  font-size: 16px;
}

/* 深色主题适配 */
.dark .auth-mode-btn {
  border-color: #434343;
  background: #1f1f1f;
  color: #fff;
}

.dark .auth-mode-btn:hover {
  border-color: #177ddc;
  color: #177ddc;
}

.dark .mode-name {
  color: #fff;
}

.dark .mode-description {
  color: #bfbfbf;
}

.dark .info-label {
  color: #bfbfbf;
}

.dark .info-value {
  color: #fff;
}

.dark .current-mode,
.dark .target-mode {
  background: #262626;
  border-color: #434343;
}

.dark .current-mode h4,
.dark .target-mode h4 {
  color: #fff;
}

.dark .current-mode p,
.dark .target-mode p {
  color: #bfbfbf;
}

.dark .target-mode {
  background: #162312;
  border-color: #389e0d;
}
</style>