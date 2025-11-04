<template>
  <a-modal
    :visible="visible"
    :title="t(isEdit ? 'admin.userManagement.form.title.edit' : 'admin.userManagement.form.title.create')"
    :width="600"
    :confirmLoading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :maskClosable="false"
  >
    <a-form
      :model="formData"
      :rules="rules"
      ref="formRef"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item :label="t('admin.userManagement.form.labels.username')" name="username">
        <a-input
          v-model:value="formData.username"
          :placeholder="t('admin.userManagement.form.placeholders.username')"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.email')" name="email">
        <a-input
          v-model:value="formData.email"
          type="email"
          :placeholder="t('admin.userManagement.form.placeholders.email')"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.nickname')" name="nickname">
        <a-input
          v-model:value="formData.nickname"
          :placeholder="t('admin.userManagement.form.placeholders.nickname')"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.password')" name="password">
        <a-input-password
          v-model:value="formData.password"
          :placeholder="isEdit ? t('admin.userManagement.form.placeholders.passwordEdit') : t('admin.userManagement.form.placeholders.password')"
          :disabled="loading"
          autocomplete="new-password"
        />
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.confirmPassword')" name="confirmPassword" v-if="formData.password">
        <a-input-password
          v-model:value="formData.confirmPassword"
          :placeholder="t('admin.userManagement.form.placeholders.confirmPassword')"
          :disabled="loading"
          autocomplete="new-password"
        />
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.role')" name="role">
        <a-select
          v-model:value="formData.role"
          :placeholder="t('admin.userManagement.form.placeholders.role')"
          :disabled="loading"
        >
          <a-select-option value="user">{{ t('admin.userManagement.form.options.role.user') }}</a-select-option>
          <a-select-option value="admin">{{ t('admin.userManagement.form.options.role.admin') }}</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item :label="t('admin.userManagement.form.labels.status')" name="isActive" v-if="isEdit">
        <a-switch
          v-model:checked="formData.isActive"
          :disabled="loading"
          :checked-children="t('admin.userManagement.form.switch.enabled')"
          :un-checked-children="t('admin.userManagement.form.switch.disabled')"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel" :disabled="loading">
        {{ t('admin.userManagement.form.buttons.cancel') }}
      </a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEdit ? t('admin.userManagement.form.buttons.update') : t('admin.userManagement.form.buttons.create') }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { api } from '@/utils/api'
import { useI18n } from 'vue-i18n'

interface User {
  id?: string
  username: string
  email: string
  nickname?: string
  role: 'admin' | 'user'
  isActive?: boolean
}

interface Props {
  visible: boolean
  user?: User | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const { t } = useI18n()

const isEdit = computed(() => !!(props.user && props.user.id))

const formData = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  role: 'user' as 'admin' | 'user',
  isActive: true
})

// 表单验证规则
const rules = computed<Record<string, Rule[]>>(() => ({
  username: [
    { required: true, message: t('admin.userManagement.form.validation.usernameRequired'), trigger: 'blur' },
    { min: 3, max: 20, message: t('admin.userManagement.form.validation.usernameLength'), trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: t('admin.userManagement.form.validation.usernamePattern'), trigger: 'blur' },
    {
      validator: async (_rule: any, value: string) => {
        if (!value || value.length < 3) return Promise.resolve()

        // 检查用户名是否已存在（仅在新建或修改用户名时检查）
        if (!isEdit.value || (props.user && value.toLowerCase() !== props.user.username.toLowerCase())) {
          try {
            const response = await api.get('/api/admin/users/search/suggestions', {
              params: { q: value }
            })
            const existingUser = response.data.find((u: any) =>
              u.username.toLowerCase() === value.toLowerCase()
            )
            if (existingUser) {
              return Promise.reject(new Error(t('admin.userManagement.form.validation.usernameExists')))
            }
          } catch (error) {
            // 网络错误时不阻塞验证
          }
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  email: [
    { required: true, message: t('admin.userManagement.form.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('admin.userManagement.form.validation.emailInvalid'), trigger: 'blur' },
    {
      validator: async (_rule: any, value: string) => {
        if (!value) return Promise.resolve()

        // 检查邮箱是否已存在（仅在新建或修改邮箱时检查）
        if (!isEdit.value || (props.user && value.toLowerCase() !== props.user.email.toLowerCase())) {
          try {
            const response = await api.get('/api/admin/users/search/suggestions', {
              params: { q: value }
            })
            const existingUser = response.data.find((u: any) =>
              u.email.toLowerCase() === value.toLowerCase()
            )
            if (existingUser) {
              return Promise.reject(new Error(t('admin.userManagement.form.validation.emailExists')))
            }
          } catch (error) {
            // 网络错误时不阻塞验证
          }
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  nickname: [
    { max: 50, message: t('admin.userManagement.form.validation.nicknameMax'), trigger: 'blur' },
    { pattern: /^[^<>'"&]*$/, message: t('admin.userManagement.form.validation.nicknameInvalid'), trigger: 'blur' }
  ],
  password: [
    ...(isEdit.value ? [] : [{ required: true, message: t('admin.userManagement.form.validation.passwordRequired'), trigger: 'blur' }]),
    { min: 6, message: t('admin.userManagement.form.validation.passwordMin'), trigger: 'blur' },
    { max: 128, message: t('admin.userManagement.form.validation.passwordMax'), trigger: 'blur' },
    {
      validator: async (_rule: any, value: string) => {
        if (!value) return Promise.resolve()

        // 密码强度检查
        const hasLower = /[a-z]/.test(value)
        const hasUpper = /[A-Z]/.test(value)
        const hasNumber = /\d/.test(value)
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value)

        const strength = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length

        if (value.length >= 8 && strength >= 3) {
          return Promise.resolve() // 强密码
        } else if (value.length >= 6 && strength >= 2) {
          return Promise.resolve() // 中等密码
        } else if (value.length >= 6) {
          return Promise.resolve() // 弱密码但可接受
        } else {
          return Promise.reject(new Error(t('admin.userManagement.form.validation.passwordStrength')))
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: async (_rule: any, value: string) => {
        if (formData.password && value !== formData.password) {
          return Promise.reject(new Error(t('admin.userManagement.form.validation.confirmPasswordMismatch')))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: t('admin.userManagement.form.validation.roleRequired'), trigger: 'change' }
  ]
}))

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    username: '',
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    isActive: true
  })
  formRef.value?.resetFields()
}

// 监听用户数据变化，填充表单
watch(() => props.user, (user) => {
  if (user) {
    Object.assign(formData, {
      username: user.username || '',
      email: user.email || '',
      nickname: user.nickname || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'user',
      isActive: user.isActive ?? true
    })
    formRef.value?.clearValidate()
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听模态框显示状态
watch(() => props.visible, (visible) => {
  if (!visible) {
    resetForm()
  }
})

// 处理取消
const handleCancel = () => {
  emit('update:visible', false)
}

// 处理提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    const submitData = {
      username: formData.username,
      email: formData.email,
      nickname: formData.nickname || formData.username,
      role: formData.role,
      ...(formData.password ? { password: formData.password } : {})
    }

    if (isEdit.value && props.user?.id) {
      // 更新用户
      await api.put(`/api/admin/users/${props.user.id}`, submitData)

      // 如果状态有变化，单独更新状态
      if (formData.isActive !== props.user.isActive) {
        await api.patch(`/api/admin/users/${props.user.id}/status`, {
          isActive: formData.isActive
        })
      }

      message.success(t('admin.userManagement.form.messages.updateSuccess'))
    } else {
      // 创建用户
      await api.post('/api/admin/users', submitData)
      message.success(t('admin.userManagement.form.messages.createSuccess'))
    }

    emit('success')
    emit('update:visible', false)
  } catch (error: any) {
    console.error(t('admin.userManagement.form.messages.submissionFailed'), error)
    const errorMessage = error?.response?.data?.message
    message.error(errorMessage || t('admin.userManagement.form.messages.operationFailed'))
  } finally {
    loading.value = false
  }
}

watch(isEdit, () => {
  // 编辑状态切换时刷新校验规则以确保必填项更新
  formRef.value?.clearValidate(['password'])
})
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 16px;
}
</style>
