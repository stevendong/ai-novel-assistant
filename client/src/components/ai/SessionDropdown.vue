<template>
  <div class="history-dropdown">
    <!-- 头部区域 -->
    <div class="dropdown-header">
      <div class="header-left">
        <span class="header-icon">💬</span>
        <div class="header-info">
          <h3 class="header-title">会话历史</h3>
          <p class="header-subtitle">{{ sessions.length }} 个会话</p>
        </div>
      </div>
      <a-button
        type="primary"
        size="small"
        @click="handleCreateSession"
        class="new-session-btn"
      >
        <PlusOutlined />
        新建会话
      </a-button>
    </div>

    <!-- 会话列表 -->
    <div class="session-list-wrapper">
      <!-- 空状态 -->
      <div v-if="sessions.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p class="empty-text">暂无历史会话</p>
        <p class="empty-hint">创建一个新会话开始对话</p>
      </div>

      <!-- 会话列表 -->
      <div v-else class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ 'is-active': session.id === currentSessionId }"
          @click="handleSwitchSession(session.id)"
        >
          <!-- 会话卡片 -->
          <div class="session-card">
            <!-- 左侧指示器 -->
            <div class="session-indicator"></div>

            <!-- 会话内容 -->
            <div class="session-main">
              <!-- 头部：标题和操作 -->
              <div class="session-header">
                <h4 class="session-title">{{ session.title || '新对话' }}</h4>
                <a-button
                  type="text"
                  size="small"
                  danger
                  class="delete-btn"
                  @click.stop="handleDeleteSession(session.id)"
                >
                  <DeleteOutlined />
                </a-button>
              </div>

              <!-- 元数据区域 -->
              <div class="session-metadata">
                <!-- 模式标签 -->
                <div class="mode-badge" :style="{ backgroundColor: getModeColor(session.mode) + '15', color: getModeColor(session.mode) }">
                  <span class="mode-icon">{{ getModeIcon(session.mode) }}</span>
                  <span class="mode-label">{{ getModeLabel(session.mode) }}</span>
                </div>

                <!-- 统计信息 -->
                <div class="session-stats">
                  <span class="stat-item">
                    <MessageOutlined class="stat-icon" />
                    {{ session.messages.length }}
                  </span>
                  <span class="stat-divider">·</span>
                  <span class="stat-item time-stat">
                    <ClockCircleOutlined class="stat-icon" />
                    {{ formatTime(session.updatedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleFilled
} from '@ant-design/icons-vue'
import type { ConversationSession } from '@/stores/aiChat'

// Props
defineProps<{
  sessions: ConversationSession[]
  currentSessionId?: string
}>()

// Emits
const emit = defineEmits<{
  'switch-session': [sessionId: string]
  'create-session': []
  'delete-session': [sessionId: string]
}>()

// 格式化时间
const formatTime = (timestamp: Date) => {
  // 确保 timestamp 是 Date 对象
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    // 今天，显示时间
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (days === 1) {
    // 昨天
    return '昨天'
  } else if (days < 7) {
    // 一周内，显示几天前
    return `${days}天前`
  } else {
    // 超过一周，显示日期
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }
}

// 获取模式标签
const getModeLabel = (mode: string) => {
  const labels: Record<string, string> = {
    chat: '对话',
    enhance: '完善',
    check: '检查',
    outline: '大纲'
  }
  return labels[mode] || mode
}

// 获取模式图标
const getModeIcon = (mode: string) => {
  const icons: Record<string, string> = {
    chat: '💬',
    enhance: '✨',
    check: '🔍',
    outline: '📝'
  }
  return icons[mode] || '💬'
}

// 获取模式颜色
const getModeColor = (mode: string) => {
  const colors: Record<string, string> = {
    chat: '#1890ff',
    enhance: '#52c41a',
    check: '#faad14',
    outline: '#722ed1'
  }
  return colors[mode] || '#1890ff'
}

// 处理切换会话
const handleSwitchSession = (sessionId: string) => {
  emit('switch-session', sessionId)
}

// 处理创建会话
const handleCreateSession = () => {
  emit('create-session')
}

// 处理删除会话
const handleDeleteSession = (sessionId: string) => {
  Modal.confirm({
    title: '确认删除会话',
    content: '确定要删除这个会话吗？此操作不可撤销。',
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => {
      emit('delete-session', sessionId)
      message.success('会话删除成功')
    }
  })
}
</script>


<style scoped>
/* ==================== 下拉菜单容器 ==================== */
.history-dropdown {
  width: 360px;
  max-height: 500px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

/* ==================== 头部区域 ==================== */
.dropdown-header {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.dropdown-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(24, 144, 255, 0.3) 25%,
    rgba(24, 144, 255, 0.5) 50%,
    rgba(24, 144, 255, 0.3) 75%,
    transparent 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
  line-height: 1;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 12px;
  color: #888;
  margin: 0;
  font-weight: 500;
}

.new-session-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.new-session-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.35);
}

.new-session-btn:active {
  transform: translateY(0);
}

/* ==================== 列表包装器 ==================== */
.session-list-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ==================== 空状态 ==================== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #666;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

/* ==================== 会话列表 ==================== */
.session-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  background: linear-gradient(to bottom,
    rgba(0, 0, 0, 0.01) 0%,
    rgba(0, 0, 0, 0.02) 100%);
}

/* 优化滚动条 */
.session-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* ==================== 会话项 ==================== */
.session-item {
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.session-item:last-child {
  margin-bottom: 0;
}

.session-item:hover {
  transform: translateY(-2px);
}

.session-item.is-active {
  transform: scale(1.02);
}

/* ==================== 会话卡片 ==================== */
.session-card {
  position: relative;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.session-item:hover .session-card {
  border-color: rgba(24, 144, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.session-item.is-active .session-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

/* ==================== 左侧指示器 ==================== */
.session-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  transition: width 0.3s ease;
}

.session-item:hover .session-indicator {
  width: 4px;
}

.session-item.is-active .session-indicator {
  width: 4px;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 100%);
}

/* ==================== 会话主体 ==================== */
.session-main {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-item.is-active .session-main {
  padding-left: 12px;
}

/* ==================== 会话头部 ==================== */
.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.session-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item.is-active .session-title {
  color: white;
}

.delete-btn {
  opacity: 0;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.1);
  transform: scale(1.1);
}

.session-item.is-active .delete-btn {
  opacity: 1;
}

.session-item.is-active .delete-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ==================== 会话元数据 ==================== */
.session-metadata {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* ==================== 模式标签 ==================== */
.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid currentColor;
  transition: all 0.2s ease;
}

.mode-icon {
  font-size: 14px;
  line-height: 1;
}

.mode-label {
  line-height: 1;
}

.session-item.is-active .mode-badge {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

/* ==================== 统计信息 ==================== */
.session-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
  font-weight: 500;
}

.session-item.is-active .session-stats {
  color: rgba(255, 255, 255, 0.85);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.stat-icon {
  font-size: 13px;
}

.stat-divider {
  opacity: 0.5;
}

.time-stat {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 激活指示器 ==================== */
.active-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  color: white;
  animation: checkBounce 0.5s ease;
}

@keyframes checkBounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ==================== 暗色模式 ==================== */
.dark .history-dropdown {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}

.dark .dropdown-header {
  background: linear-gradient(135deg, #252525 0%, #1f1f1f 100%);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.dark .dropdown-header::after {
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(96, 165, 250, 0.4) 25%,
    rgba(168, 85, 247, 0.6) 50%,
    rgba(96, 165, 250, 0.4) 75%,
    transparent 100%);
}

.dark .header-title {
  color: #e5e5e5;
}

.dark .header-subtitle {
  color: #888;
}

.dark .new-session-btn {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.3);
}

.dark .new-session-btn:hover {
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
}

.dark .session-list {
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0.01) 100%);
}

.dark .session-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

.dark .session-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.dark .session-card {
  background: #242424;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.dark .session-item:hover .session-card {
  border-color: rgba(96, 165, 250, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dark .session-item.is-active .session-card {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  box-shadow: 0 8px 24px rgba(96, 165, 250, 0.5);
}

.dark .session-indicator {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
}

.dark .session-title {
  color: #e5e5e5;
}

.dark .delete-btn:hover {
  background: rgba(255, 107, 107, 0.15);
}

.dark .session-stats {
  color: #888;
}

.dark .empty-text {
  color: #888;
}

.dark .empty-hint {
  color: #666;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .history-dropdown {
    width: 320px;
    max-height: 450px;
  }

  .dropdown-header {
    padding: 16px;
  }

  .header-icon {
    font-size: 24px;
  }

  .header-title {
    font-size: 15px;
  }

  .new-session-btn {
    padding: 0 12px;
    height: 32px;
    font-size: 12px;
  }

  .session-main {
    padding: 12px 14px;
  }

  .session-title {
    font-size: 14px;
  }

  .mode-badge {
    padding: 3px 8px;
    font-size: 11px;
  }

  .session-stats {
    font-size: 11px;
  }
}
</style>
