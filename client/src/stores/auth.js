import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { message } from 'ant-design-vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true
})

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const sessionToken = ref(null)
  const refreshToken = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!sessionToken.value)

  const init = () => {
    if (isInitialized.value) return

    const storedUser = localStorage.getItem('user')
    const storedSessionToken = localStorage.getItem('sessionToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (storedUser && storedSessionToken && storedRefreshToken) {
      try {
        user.value = JSON.parse(storedUser)
        sessionToken.value = storedSessionToken
        refreshToken.value = storedRefreshToken

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedSessionToken}`
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        clearAuth()
      }
    }

    isInitialized.value = true
  }

  const setAuthData = (authData) => {
    user.value = authData.user
    sessionToken.value = authData.session.sessionToken
    refreshToken.value = authData.session.refreshToken

    localStorage.setItem('user', JSON.stringify(authData.user))
    localStorage.setItem('sessionToken', authData.session.sessionToken)
    localStorage.setItem('refreshToken', authData.session.refreshToken)

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.session.sessionToken}`
  }

  const clearAuth = () => {
    user.value = null
    sessionToken.value = null
    refreshToken.value = null

    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')

    delete apiClient.defaults.headers.common['Authorization']
  }

  const register = async (userData) => {
    isLoading.value = true
    try {
      const response = await apiClient.post('/api/auth/register', userData)
      setAuthData(response.data)
      message.success(response.data.message || 'Account created successfully!')
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const login = async (credentials) => {
    isLoading.value = true
    try {
      const response = await apiClient.post('/api/auth/login', credentials)
      setAuthData(response.data)
      message.success(response.data.message || 'Login successful!')
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      if (sessionToken.value) {
        await apiClient.post('/api/auth/logout')
      }
      clearAuth()
      message.success('Logged out successfully')
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      clearAuth()
      return { success: true }
    } finally {
      isLoading.value = false
    }
  }

  const refreshSession = async () => {
    if (!refreshToken.value) {
      clearAuth()
      return { success: false, error: 'No refresh token' }
    }

    try {
      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken: refreshToken.value
      })
      setAuthData(response.data)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearAuth()
      return { success: false, error: error.response?.data?.message || 'Token refresh failed' }
    }
  }

  const updateProfile = async (profileData) => {
    isLoading.value = true
    try {
      const response = await apiClient.put('/api/auth/profile', profileData)
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(response.data.user))
      message.success(response.data.message || 'Profile updated successfully!')
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!sessionToken.value) return { success: false, error: 'Not authenticated' }

    try {
      const response = await apiClient.get('/api/auth/me')
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(response.data.user))
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Fetch profile error:', error)
      if (error.response?.status === 401) {
        const refreshResult = await refreshSession()
        if (refreshResult.success) {
          return fetchProfile()
        } else {
          clearAuth()
        }
      }
      return { success: false, error: error.response?.data?.message || 'Failed to fetch profile' }
    }
  }

  const deleteAccount = async (password) => {
    isLoading.value = true
    try {
      const response = await apiClient.delete('/api/auth/account', {
        data: { password }
      })
      clearAuth()
      message.success(response.data.message || 'Account deleted successfully')
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Account deletion failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const logoutAllSessions = async () => {
    isLoading.value = true
    try {
      const response = await apiClient.post('/api/auth/logout-all')
      clearAuth()
      message.success(response.data.message || 'All sessions logged out successfully')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Logout all sessions error:', error)
      clearAuth()
      const errorMessage = error.response?.data?.message || 'Logout all sessions failed'
      message.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Setup axios interceptors for automatic token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        const refreshResult = await refreshSession()
        if (refreshResult.success) {
          originalRequest.headers['Authorization'] = `Bearer ${sessionToken.value}`
          return apiClient(originalRequest)
        } else {
          clearAuth()
          window.location.href = '/login'
        }
      }

      return Promise.reject(error)
    }
  )

  return {
    user,
    sessionToken,
    refreshToken,
    isLoading,
    isInitialized,
    isAuthenticated,
    apiClient,
    init,
    register,
    login,
    logout,
    refreshSession,
    updateProfile,
    fetchProfile,
    deleteAccount,
    logoutAllSessions,
    clearAuth
  }
})