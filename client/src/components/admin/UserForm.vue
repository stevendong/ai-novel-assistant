<template>
  <a-modal
    :visible="visible"
    :title="isEdit ? '编辑用户' : '创建用户'"
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
      <a-form-item label="用户名" name="username">
        <a-input
          v-model:value="formData.username"
          placeholder="请输入用户名"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item label="邮箱" name="email">
        <a-input
          v-model:value="formData.email"
          type="email"
          placeholder="请输入邮箱地址"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item label="昵称" name="nickname">
        <a-input
          v-model:value="formData.nickname"
          placeholder="请输入昵称"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item label="密码" name="password">
        <a-input-password
          v-model:value="formData.password"
          :placeholder="isEdit ? '留空表示不修改密码' : '请输入密码'"
          :disabled="loading"
          autocomplete="new-password"
        />
      </a-form-item>

      <a-form-item label="确认密码" name="confirmPassword" v-if="formData.password">
        <a-input-password
          v-model:value="formData.confirmPassword"
          placeholder="请再次输入密码"
          :disabled="loading"
          autocomplete="new-password"
        />
      </a-form-item>

      <a-form-item label="角色" name="role">
        <a-select
          v-model:value="formData.role"
          placeholder="请选择用户角色"
          :disabled="loading"
        >
          <a-select-option value="user">普通用户</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="状态" name="isActive" v-if="isEdit">
        <a-switch
          v-model:checked="formData.isActive"
          :disabled="loading"
          checked-children="启用"
          un-checked-children="禁用"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel" :disabled="loading">
        取消
      </a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEdit ? '更新' : '创建' }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { api } from '@/utils/api'

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
const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和短横线', trigger: 'blur' },
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
              return Promise.reject(new Error('用户名已存在'))
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
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
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
              return Promise.reject(new Error('邮箱已存在'))
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
    { max: 50, message: '昵称不能超过50个字符', trigger: 'blur' },
    { pattern: /^[^<>'"&]*$/, message: '昵称不能包含特殊字符', trigger: 'blur' }
  ],
  password: [
    ...(isEdit.value ? [] : [{ required: true, message: '请输入密码', trigger: 'blur' }]),
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
    { max: 128, message: '密码不能超过128个字符', trigger: 'blur' },
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
          return Promise.reject(new Error('密码强度不足，建议包含大小写字母、数字和特殊字符'))
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: async (_rule: any, value: string) => {
        if (formData.password && value !== formData.password) {
          return Promise.reject(new Error('两次输入的密码不一致'))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: '请选择用户角色', trigger: 'change' }
  ]
}

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

      message.success('用户信息更新成功')
    } else {
      // 创建用户
      await api.post('/api/admin/users', submitData)
      message.success('用户创建成功')
    }

    emit('success')
    emit('update:visible', false)
  } catch (error: any) {
    console.error('用户操作失败:', error)
    const errorMessage = error.response?.data?.message || '操作失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 16px;
}
</style>

