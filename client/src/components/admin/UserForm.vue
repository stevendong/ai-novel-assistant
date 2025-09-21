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
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和短横线', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  nickname: [
    { max: 50, message: '昵称不能超过50个字符', trigger: 'blur' }
  ],
  password: [
    ...(isEdit.value ? [] : [{ required: true, message: '请输入密码', trigger: 'blur' }]),
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
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
      await api.put(`/admin/users/${props.user.id}`, submitData)
      
      // 如果状态有变化，单独更新状态
      if (formData.isActive !== props.user.isActive) {
        await api.patch(`/admin/users/${props.user.id}/status`, {
          isActive: formData.isActive
        })
      }
      
      message.success('用户信息更新成功')
    } else {
      // 创建用户
      await api.post('/admin/users', submitData)
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

