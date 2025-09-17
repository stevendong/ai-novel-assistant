<template>
  <div class="auth-dev-tools" v-if="isDev">
    <a-card title="认证系统开发工具" class="dev-card">
      <a-alert
        type="info"
        message="开发工具"
        description="此页面仅在开发环境可见，用于测试和调试认证系统"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 当前状态 -->
      <a-card size="small" title="当前状态" style="margin-bottom: 16px">
        <a-descriptions :column="2" size="small">
          <a-descriptions-item label="认证模式">
            <a-tag :color="getModeColor(authStore.currentAuthMode)">
              {{ authConfig.getAuthModeDisplayName(authStore.currentAuthMode) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="认证状态">
            <a-tag :color="authStore.isAuthenticated ? 'green' : 'red'">
              {{ authStore.isAuthenticated ? '已登录' : '未登录' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="初始化状态">
            <a-tag :color="authStore.isInitialized ? 'green' : 'orange'">
              {{ authStore.isInitialized ? '已初始化' : '初始化中' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="加载状态">
            <a-tag :color="authStore.isLoading ? 'blue' : 'default'">
              {{ authStore.isLoading ? '加载中' : '空闲' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="用户ID">
            {{ authStore.user?.id || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item label="用户邮箱">
            {{ authStore.user?.email || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item label="显示名称">
            {{ authStore.user?.displayName || 'N/A' }}
          </a-descriptions-item>
          <a-descriptions-item label="社交登录">
            <a-tag :color="authStore.supportsSocialLogin ? 'green' : 'default'">
              {{ authStore.supportsSocialLogin ? '支持' : '不支持' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 模式切换 -->
      <a-card size="small" title="模式切换" style="margin-bottom: 16px">
        <div class="mode-switch-container">
          <div class="current-mode">
            <h4>当前模式</h4>
            <div class="mode-card">
              <SafetyCertificateOutlined v-if="authStore.currentAuthMode === 'clerk'" />
              <UserOutlined v-else />
              <span>{{ authConfig.getAuthModeDisplayName(authStore.currentAuthMode) }}</span>
            </div>
            <p>{{ authConfig.getAuthModeDescription(authStore.currentAuthMode) }}</p>
          </div>

          <div class="switch-actions">
            <a-space direction="vertical" style="width: 100%">
              <a-button
                v-for="mode in authStore.availableModes"
                :key="mode"
                :type="mode === authStore.currentAuthMode ? 'primary' : 'default'"
                :disabled="mode === authStore.currentAuthMode || authStore.switchingMode"
                @click="switchMode(mode)"
                block
              >
                <SafetyCertificateOutlined v-if="mode === 'clerk'" />
                <UserOutlined v-else />
                切换到{{ authConfig.getAuthModeDisplayName(mode) }}
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>

      <!-- 环境配置 -->
      <a-card size="small" title="环境配置" style="margin-bottom: 16px">
        <a-descriptions :column="1" size="small">
          <a-descriptions-item label="Clerk Publishable Key">
            <a-tag :color="config.clerkPublishableKey ? 'green' : 'red'">
              {{ config.clerkPublishableKey ? '已配置' : '未配置' }}
            </a-tag>
            <code v-if="config.clerkPublishableKey" style="margin-left: 8px">
              {{ config.clerkPublishableKey.substring(0, 20) }}...
            </code>
          </a-descriptions-item>
          <a-descriptions-item label="允许模式切换">
            <a-tag :color="config.allowModeSwitch ? 'green' : 'default'">
              {{ config.allowModeSwitch ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="社交登录">
            <a-tag :color="config.enableSocialLogin ? 'green' : 'default'">
              {{ config.enableSocialLogin ? '启用' : '禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="邮箱验证">
            <a-tag :color="config.enableEmailVerification ? 'green' : 'default'">
              {{ config.enableEmailVerification ? '启用' : '禁用' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 快捷操作 -->
      <a-card size="small" title="快捷操作">
        <a-space wrap>
          <a-button @click="clearAuthData" type="dashed" danger>
            清除认证数据
          </a-button>
          <a-button @click="refreshAuthState" type="dashed">
            刷新认证状态
          </a-button>
          <a-button @click="showConfigModal = true" type="dashed">
            查看完整配置
          </a-button>
          <a-button @click="exportLogs" type="dashed">
            导出调试日志
          </a-button>
          <a-button @click="runDiagnostics" type="dashed">
            运行诊断
          </a-button>
        </a-space>
      </a-card>

      <!-- 诊断信息 -->
      <a-card size="small" title="诊断信息" v-if="diagnostics.length > 0">
        <a-timeline>
          <a-timeline-item
            v-for="item in diagnostics"
            :key="item.id"
            :color="item.type === 'error' ? 'red' : item.type === 'warning' ? 'orange' : 'blue'"
          >
            <strong>{{ item.title }}</strong>
            <div>{{ item.message }}</div>
            <small>{{ item.timestamp }}</small>
          </a-timeline-item>
        </a-timeline>
      </a-card>
    </a-card>

    <!-- 配置详情模态框 -->
    <a-modal
      v-model:open="showConfigModal"
      title="完整配置信息"
      :width="600"
      footer=""
    >
      <pre><code>{{ JSON.stringify(config, null, 2) }}</code></pre>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  SafetyCertificateOutlined,
  UserOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useUnifiedAuthStore } from '@/stores/unifiedAuth'
import { authConfig, type AuthMode } from '@/config/authConfig'

const authStore = useUnifiedAuthStore()
const showConfigModal = ref(false)
const diagnostics = ref<any[]>([])

const isDev = computed(() => import.meta.env.DEV)
const config = computed(() => authConfig.getConfig())

function getModeColor(mode: AuthMode): string {
  switch (mode) {
    case 'clerk': return 'green'
    case 'legacy': return 'blue'
    default: return 'default'
  }
}

async function switchMode(mode: AuthMode) {
  try {
    const success = await authStore.switchAuthMode(mode)
    if (success) {
      message.success(`已切换到 ${authConfig.getAuthModeDisplayName(mode)}`)
      addDiagnostic('success', '模式切换', `成功切换到 ${authConfig.getAuthModeDisplayName(mode)}`)
    } else {
      message.error('切换失败')
      addDiagnostic('error', '模式切换', '切换失败')
    }
  } catch (error: any) {
    message.error(error.message || '切换失败')
    addDiagnostic('error', '模式切换', error.message || '切换失败')
  }
}

function clearAuthData() {
  authConfig.clearAuthData()
  message.success('认证数据已清除')
  addDiagnostic('info', '数据清除', '所有认证数据已清除')

  // 刷新页面
  setTimeout(() => {
    window.location.reload()
  }, 1000)
}

async function refreshAuthState() {
  try {
    await authStore.init()
    message.success('认证状态已刷新')
    addDiagnostic('info', '状态刷新', '认证状态已刷新')
  } catch (error: any) {
    message.error('刷新失败')
    addDiagnostic('error', '状态刷新', error.message || '刷新失败')
  }
}

function exportLogs() {
  const logs = {
    timestamp: new Date().toISOString(),
    authState: authStore.authState,
    config: config.value,
    diagnostics: diagnostics.value,
    environment: {
      dev: isDev.value,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  }

  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `auth-logs-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  message.success('调试日志已导出')
  addDiagnostic('info', '日志导出', '调试日志已导出到文件')
}

function runDiagnostics() {
  diagnostics.value = []

  addDiagnostic('info', '诊断开始', '开始运行系统诊断')

  // 检查环境配置
  if (!config.value.clerkPublishableKey) {
    addDiagnostic('warning', '配置检查', 'Clerk Publishable Key 未配置')
  } else {
    addDiagnostic('success', '配置检查', 'Clerk Publishable Key 已配置')
  }

  // 检查认证状态
  if (authStore.isInitialized) {
    addDiagnostic('success', '初始化检查', '认证系统已正常初始化')
  } else {
    addDiagnostic('error', '初始化检查', '认证系统未正确初始化')
  }

  // 检查可用模式
  const availableModes = authStore.availableModes
  addDiagnostic('info', '模式检查', `可用认证模式: ${availableModes.join(', ')}`)

  // 检查功能支持
  if (authStore.supportsSocialLogin) {
    addDiagnostic('info', '功能检查', '社交登录功能可用')
  }

  if (authStore.supportsEmailVerification) {
    addDiagnostic('info', '功能检查', '邮箱验证功能可用')
  }

  addDiagnostic('info', '诊断完成', '系统诊断已完成')
  message.success('诊断完成')
}

function addDiagnostic(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) {
  diagnostics.value.unshift({
    id: Date.now(),
    type,
    title,
    message,
    timestamp: new Date().toLocaleString()
  })
}

onMounted(() => {
  if (isDev.value) {
    addDiagnostic('info', '页面加载', '认证开发工具页面已加载')

    // 自动运行诊断
    setTimeout(() => {
      runDiagnostics()
    }, 1000)
  }
})
</script>

<style scoped>
.auth-dev-tools {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dev-card {
  border: 2px dashed #1890ff;
}

.mode-switch-container {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 16px;
  align-items: start;
}

.current-mode .mode-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  margin: 8px 0;
}

.current-mode h4 {
  margin: 0 0 8px 0;
  color: #262626;
}

.current-mode p {
  margin: 0;
  color: #8c8c8c;
  font-size: 12px;
}

.switch-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

pre {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
}

code {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

@media (max-width: 768px) {
  .mode-switch-container {
    grid-template-columns: 1fr;
  }

  .auth-dev-tools {
    padding: 12px;
  }
}
</style>