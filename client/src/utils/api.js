import { useAuthStore } from '@/stores/auth'

let apiClient = null

export const getApiClient = () => {
  if (!apiClient) {
    const authStore = useAuthStore()
    apiClient = authStore.apiClient
  }
  return apiClient
}

export const api = {
  get: (url, config) => getApiClient().get(url, config),
  post: (url, data, config) => getApiClient().post(url, data, config),
  put: (url, data, config) => getApiClient().put(url, data, config),
  patch: (url, data, config) => getApiClient().patch(url, data, config),
  delete: (url, config) => getApiClient().delete(url, config)
}