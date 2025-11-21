<template>
  <div
      class="status-bar"
      :class="{ 'draggable-header': isFloating }"
      @mousedown="isFloating ? startDragOrRestore($event) : null"
  >
    <div class="status-info">
      <a-badge :status="aiStatus === 'online' ? 'success' : 'error'"/>
      <span class="status-text">{{ t('aiChat.panel.title') }}</span>
      <span v-if="isFloating" class="floating-indicator">
        {{ isMinimized ? t('aiChat.panel.indicators.minimized') : t('aiChat.panel.indicators.floating') }}
      </span>
    </div>
    <div class="status-actions">
      <!-- 控制按钮区域 -->
      <div class="control-section">
        <!-- 浮动模式切换按钮 -->
        <div class="float-mode-toggle">
          <a-tooltip
              :title="isFloating ? t('aiChat.panel.tooltips.pinToDock') : t('aiChat.panel.tooltips.floatWindow')"
              placement="bottom"
          >
            <div
                class="float-toggle-container"
                :class="{ 'floating-active': isFloating }"
                @click="handleToggleFloating"
            >
              <div class="toggle-icon-wrapper">
                <transition name="icon-flip" mode="out-in">
                  <component
                      :is="isFloating ? PushpinFilled : DragOutlined"
                      :key="isFloating ? 'pin' : 'drag'"
                      class="toggle-icon"
                  />
                </transition>
              </div>
              <div class="toggle-indicator">
                <div class="indicator-dot" :class="{ 'active': isFloating }"></div>
              </div>
            </div>
          </a-tooltip>
        </div>

        <!-- 通用关闭按钮 -->
        <div v-if="!isFloating" class="general-controls">
          <a-tooltip :title="t('aiChat.panel.tooltips.close')">
            <div class="control-btn close-btn" @click="handleClose">
              <component :is="CloseOutlined"/>
            </div>
          </a-tooltip>
        </div>

        <!-- 浮动模式窗口控制按钮 -->
        <div v-if="isFloating" class="floating-controls">
          <a-tooltip :title="t('aiChat.panel.tooltips.minimize')">
            <div class="control-btn minimize-btn" @click="handleMinimize">
              <div class="minimize-icon"></div>
            </div>
          </a-tooltip>

          <a-tooltip :title="maximizeTooltip">
            <div
                class="control-btn maximize-btn"
                @click="handleToggleMaximize"
            >
              <component :is="isMaximized ? CompressOutlined : ExpandOutlined"/>
            </div>
          </a-tooltip>

          <a-tooltip :title="t('aiChat.panel.tooltips.close')">
            <div class="control-btn close-btn" @click="handleClose">
              <component :is="CloseOutlined"/>
            </div>
          </a-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DragOutlined,
  PushpinFilled,
  ExpandOutlined,
  CompressOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  aiStatus: 'online' | 'offline'
  isFloating: boolean
  isMinimized: boolean
  isMaximized: boolean
}

interface Emits {
  (e: 'toggle-floating'): void
  (e: 'minimize'): void
  (e: 'toggle-maximize'): void
  (e: 'close'): void
  (e: 'start-drag', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  aiStatus: 'online',
  isFloating: false,
  isMinimized: false,
  isMaximized: false
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const handleToggleFloating = () => {
  emit('toggle-floating')
}

const handleMinimize = () => {
  emit('minimize')
}

const handleToggleMaximize = () => {
  emit('toggle-maximize')
}

const handleClose = () => {
  emit('close')
}

const startDragOrRestore = (event: MouseEvent) => {
  emit('start-drag', event)
}

const maximizeTooltip = computed(() =>
  props.isMaximized
    ? t('aiChat.panel.tooltips.restore')
    : t('aiChat.panel.tooltips.maximize')
)
</script>

<style scoped>
/* Status Bar */
.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
  transition: all 0.3s ease;
}

/* 浮动模式下的拖拽头部 */
.status-bar.draggable-header {
  cursor: move;
  user-select: none;
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(24, 144, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(24, 144, 255, 0.1);
}

.status-bar.draggable-header:hover {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(24, 144, 255, 0.08) 100%);
  border-bottom-color: rgba(24, 144, 255, 0.2);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
  font-weight: 500;
}

.floating-indicator {
  font-size: 10px;
  color: var(--theme-text-tertiary);
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 状态栏操作按钮区域 */
.status-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 控制按钮区域 */
.control-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 浮动模式切换按钮 */
.float-mode-toggle {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.float-toggle-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.float-toggle-container:hover {
  background: var(--theme-bg-elevated);
  border-color: rgba(24, 144, 255, 0.3);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.float-toggle-container.floating-active {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%);
  border-color: rgba(24, 144, 255, 0.3);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.toggle-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.toggle-icon {
  font-size: 12px;
  color: var(--theme-text-secondary);
  transition: all 0.3s ease;
}

.float-toggle-container:hover .toggle-icon {
  color: #1488CC;
  transform: scale(1.1);
}

.toggle-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-text-tertiary);
  transition: all 0.3s ease;
}

.indicator-dot.active {
  background: #1488CC;
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.5);
}

/* 通用控制按钮 */
.general-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 浮动控制按钮 */
.floating-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;
  background: transparent;
}

.control-btn:hover {
  background: var(--theme-bg-container);
  border-color: var(--theme-border);
  transform: scale(1.05);
}

.minimize-btn:hover {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  border-color: #faad14;
}

.maximize-btn:hover {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  border-color: #52c41a;
}

.close-btn:hover {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  border-color: #ff4d4f;
}

.control-btn:hover .anticon {
  color: white;
}

/* 最小化图标 */
.minimize-icon {
  width: 8px;
  height: 1px;
  background: var(--theme-text-secondary);
  transition: all 0.3s ease;
}

.minimize-btn:hover .minimize-icon {
  background: white;
}

/* 图标翻转动画 */
.icon-flip-enter-active,
.icon-flip-leave-active {
  transition: all 0.3s ease;
}

.icon-flip-enter-from {
  opacity: 0;
  transform: rotateY(90deg);
}

.icon-flip-leave-to {
  opacity: 0;
  transform: rotateY(-90deg);
}

/* 浮动模式指示器 */
.floating-indicator {
  font-size: 11px;
  color: #8a2be2;
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.1) 0%,
    rgba(106, 13, 173, 0.15) 100%);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 500;
  animation: float-pulse 3s ease-in-out infinite;
}

@keyframes float-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

/* 暗色模式适配 */
.dark .status-bar.draggable-header {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(96, 165, 250, 0.05) 100%);
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
}

.dark .status-bar.draggable-header:hover {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(96, 165, 250, 0.08) 100%);
  border-bottom-color: rgba(96, 165, 250, 0.2);
}

.dark .float-toggle-container:hover .toggle-icon {
  color: #60a5fa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-actions {
    gap: 8px;
  }

  .control-section {
    gap: 4px;
  }

  .float-toggle-container {
    padding: 4px 8px;
  }
}
</style>
