<template>
  <Transition name="scroll-button-fade" appear>
    <div
      v-show="visible"
      class="scroll-to-bottom-button"
      :class="{
        'has-unread': unreadCount > 0,
        'pulsing': isPulsing
      }"
      @click="handleClick"
    >
      <!-- 主按钮 -->
      <div class="button-container">
        <!-- 背景层 -->
        <div class="button-background"></div>

        <!-- 内容层 -->
        <div class="button-content">
          <!-- 图标 -->
          <div class="icon-wrapper">
            <DownOutlined class="scroll-icon" />
            <div class="icon-ripple"></div>
          </div>

          <!-- 文本和计数 -->
          <div class="text-content">
            <span class="button-text">
              {{ unreadCount > 0 ? `${unreadCount} 条新消息` : '回到底部' }}
            </span>
            <div v-if="showProgress" class="progress-bar">
              <div class="progress-fill" :style="{ width: `${scrollProgress}%` }"></div>
            </div>
          </div>
        </div>

        <!-- 未读角标 -->
        <Transition name="badge-bounce">
          <div v-if="unreadCount > 0" class="unread-badge">
            <span class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            <div class="badge-glow"></div>
          </div>
        </Transition>

        <!-- 点击波纹效果 -->
        <div class="click-ripple" ref="rippleRef"></div>
      </div>

      <!-- 悬浮装饰 -->
      <div class="floating-particles">
        <div class="particle" v-for="i in 3" :key="i"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { DownOutlined } from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  unreadCount: number
  scrollProgress?: number
  showProgress?: boolean
  autoHide?: boolean
  autoHideDelay?: number
}

interface Emits {
  (e: 'click'): void
  (e: 'visibility-change', visible: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  unreadCount: 0,
  scrollProgress: 0,
  showProgress: false,
  autoHide: false,
  autoHideDelay: 3000
})

const emit = defineEmits<Emits>()

// 响应式状态
const isPulsing = ref(false)
const rippleRef = ref<HTMLElement>()
const autoHideTimer = ref<NodeJS.Timeout>()

// 计算属性
const shouldShowProgress = computed(() => props.showProgress && props.scrollProgress > 0)

// 处理点击事件
const handleClick = () => {
  // 触发点击波纹效果
  triggerRipple()

  // 触发脉冲效果
  isPulsing.value = true
  setTimeout(() => {
    isPulsing.value = false
  }, 600)

  // 发射点击事件
  emit('click')

  // 如果启用自动隐藏，重置定时器
  if (props.autoHide) {
    resetAutoHideTimer()
  }
}

// 触发波纹效果
const triggerRipple = () => {
  if (!rippleRef.value) return

  rippleRef.value.classList.remove('ripple-active')
  void rippleRef.value.offsetWidth // 强制重绘
  rippleRef.value.classList.add('ripple-active')
}

// 重置自动隐藏定时器
const resetAutoHideTimer = () => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }

  if (props.autoHide && props.visible) {
    autoHideTimer.value = setTimeout(() => {
      emit('visibility-change', false)
    }, props.autoHideDelay)
  }
}

// 监听可见性变化
const handleVisibilityChange = () => {
  if (props.visible && props.autoHide) {
    resetAutoHideTimer()
  }
}

// 生命周期
onMounted(() => {
  handleVisibilityChange()
})

onUnmounted(() => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }
})

// 暴露方法
defineExpose({
  triggerPulse: () => {
    isPulsing.value = true
    setTimeout(() => {
      isPulsing.value = false
    }, 600)
  }
})
</script>

<style scoped>
.scroll-to-bottom-button {
  position: fixed;
  bottom: 200px;
  right: 24px;
  z-index: 1000;
  cursor: pointer;
  user-select: none;
}

.button-container {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 28px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

.button-container:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.15);
}

.button-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.9) 0%,
    rgba(64, 169, 255, 0.9) 50%,
    rgba(24, 144, 255, 0.9) 100%);
  transition: all 0.3s ease;
}

.has-unread .button-background {
  background: linear-gradient(135deg,
    rgba(255, 77, 79, 0.9) 0%,
    rgba(255, 120, 117, 0.9) 50%,
    rgba(255, 77, 79, 0.9) 100%);
}

.pulsing .button-background {
  animation: pulse-glow 0.6s ease-out;
}

.button-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 2;
}

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.scroll-icon {
  font-size: 16px;
  transition: all 0.3s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.button-container:hover .scroll-icon {
  transform: translateY(2px) scale(1.1);
  animation: bounce-down 0.8s ease infinite;
}

.icon-ripple {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.4s ease;
}

.button-container:hover .icon-ripple {
  opacity: 1;
  transform: scale(1);
  animation: ripple-pulse 1.5s ease infinite;
}

.text-content {
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}

.button-container:hover .text-content {
  opacity: 1;
  bottom: -28px;
}

.button-text {
  font-size: 12px;
  font-weight: 500;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.has-unread .button-text {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.progress-bar {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  margin-top: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  border-radius: 1px;
  transition: width 0.3s ease;
}

.unread-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  z-index: 3;
  overflow: hidden;
}

.badge-text {
  font-size: 10px;
  font-weight: 600;
  color: white;
  line-height: 1;
  position: relative;
  z-index: 2;
}

.badge-glow {
  position: absolute;
  inset: -2px;
  background: radial-gradient(circle,
    rgba(255, 77, 79, 0.6) 0%,
    transparent 70%);
  border-radius: 50%;
  animation: badge-glow 2s ease infinite;
}

.click-ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 255, 255, 0.4) 0%,
    transparent 70%);
  transform: scale(0);
  opacity: 0;
}

.click-ripple.ripple-active {
  animation: click-ripple 0.6s ease-out;
}

.floating-particles {
  position: absolute;
  inset: -20px;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(24, 144, 255, 0.6);
  border-radius: 50%;
  opacity: 0;
}

.has-unread .particle {
  background: rgba(255, 77, 79, 0.6);
}

.particle:nth-child(1) {
  top: 10%;
  left: 20%;
  animation: float-particle 3s ease infinite;
}

.particle:nth-child(2) {
  top: 60%;
  right: 15%;
  animation: float-particle 3s ease infinite 1s;
}

.particle:nth-child(3) {
  bottom: 20%;
  left: 70%;
  animation: float-particle 3s ease infinite 2s;
}

/* 动画定义 */
@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

@keyframes bounce-down {
  0%, 100% {
    transform: translateY(2px) scale(1.1);
  }
  50% {
    transform: translateY(4px) scale(1.1);
  }
}

@keyframes ripple-pulse {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}

@keyframes badge-glow {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@keyframes click-ripple {
  0% {
    transform: scale(0);
    opacity: 0.4;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes float-particle {
  0%, 100% {
    opacity: 0;
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    opacity: 1;
    transform: translateY(-10px) rotate(90deg);
  }
  50% {
    opacity: 0.8;
    transform: translateY(-20px) rotate(180deg);
  }
  75% {
    opacity: 0.6;
    transform: translateY(-10px) rotate(270deg);
  }
}

/* 过渡动画 */
.scroll-button-fade-enter-active,
.scroll-button-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-button-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.scroll-button-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.badge-bounce-enter-active {
  animation: badge-entrance 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.badge-bounce-leave-active {
  animation: badge-exit 0.3s ease-in;
}

@keyframes badge-entrance {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.2) rotate(-90deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes badge-exit {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .scroll-to-bottom-button {
    right: 16px;
    bottom: 70px;
  }

  .button-container {
    width: 48px;
    height: 48px;
    border-radius: 24px;
  }

  .scroll-icon {
    font-size: 14px;
  }

  .button-text {
    font-size: 11px;
  }

  .unread-badge {
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
  }

  .badge-text {
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .text-content {
    display: none;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .button-container {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .button-container:hover {
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .unread-badge {
    border-color: #1f1f1f;
  }
}
</style>
