<template>
  <div class="user-button-wrapper">
    <div v-if="isLoaded">
      <div v-if="isSignedIn" class="user-info">
        <UserButton
          :afterSignOutUrl="'/login'"
          :userProfileMode="'navigation'"
          :appearance="{
            elements: {
              avatarBox: 'w-8 h-8',
              userButtonTrigger: 'focus:shadow-none'
            }
          }"
        />
        <span v-if="showUserName" class="user-name">
          {{ displayName }}
        </span>
      </div>
      <div v-else class="auth-buttons">
        <a-button @click="signIn" type="primary">
          登录
        </a-button>
        <a-button @click="signUp" type="default">
          注册
        </a-button>
      </div>
    </div>
    <div v-else class="loading">
      <a-spin size="small" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserButton } from '@clerk/vue'
import { useClerkAuthStore } from '@/stores/clerkAuth'

interface Props {
  showUserName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showUserName: true
})

const authStore = useClerkAuthStore()

// 计算属性
const isLoaded = computed(() => authStore.isLoaded)
const isSignedIn = computed(() => authStore.isSignedIn)
const displayName = computed(() => authStore.getDisplayName())

// 方法
const signIn = () => {
  authStore.signIn()
}

const signUp = () => {
  authStore.signUp()
}
</script>

<style scoped>
.user-button-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-buttons {
  display: flex;
  gap: 8px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
}

/* 自定义 Clerk UserButton 样式 */
:deep(.cl-userButtonTrigger) {
  border-radius: 50%;
  outline: none;
}

:deep(.cl-userButtonTrigger:focus) {
  box-shadow: 0 0 0 2px #667eea40;
}

:deep(.cl-avatarBox) {
  width: 32px;
  height: 32px;
}
</style>