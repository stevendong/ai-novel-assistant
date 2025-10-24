/**
 * 前端请求去重工具
 * 防止在短时间内发送重复的请求
 */

interface PendingRequest {
  timestamp: number
  controller: AbortController
  promise: Promise<any>
}

interface DeduplicatorOptions {
  timeout?: number // 请求超时时间（毫秒）
  windowMs?: number // 去重时间窗口（毫秒）
  includeBody?: boolean // 是否包含请求体进行比较
  debug?: boolean // 是否开启调试日志
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private options: Required<DeduplicatorOptions>
  private cleanupTimer: number | null = null

  constructor(options: DeduplicatorOptions = {}) {
    this.options = {
      timeout: options.timeout || 30000, // 默认30秒超时
      windowMs: options.windowMs || 100, // 默认100ms去重窗口
      includeBody: options.includeBody !== false,
      debug: options.debug || false
    }

    // 定期清理过期的请求
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup()
    }, 5000)
  }

  /**
   * 调试日志
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[RequestDeduplicator]', ...args)
    }
  }

  /**
   * 生成请求的唯一键
   */
  private generateKey(method: string, url: string, body?: any): string {
    const parts = [method.toUpperCase(), url]

    if (this.options.includeBody && body) {
      try {
        parts.push(JSON.stringify(body))
      } catch (error) {
        console.warn('Failed to stringify request body for deduplication')
      }
    }

    return parts.join('::')
  }

  /**
   * 清理过期的请求
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.options.timeout) {
        request.controller.abort()
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.pendingRequests.delete(key))
  }

  /**
   * 执行去重的请求
   */
  async deduplicate<T>(
    method: string,
    url: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    body?: any
  ): Promise<T> {
    const key = this.generateKey(method, url, body)
    const now = Date.now()
    const existing = this.pendingRequests.get(key)

    // 检查是否有相同的请求正在进行
    if (existing) {
      const timeSinceRequest = now - existing.timestamp

      // 如果在时间窗口内，返回现有的请求（请求合并）
      if (timeSinceRequest < this.options.windowMs) {
        this.log(
          `🔄 请求合并: ${method} ${url}`,
          `(${timeSinceRequest}ms内的重复请求)`
        )
        return existing.promise as Promise<T>
      }

      // 超过时间窗口，取消旧请求
      this.log(`⏱️ 时间窗口已过，取消旧请求: ${method} ${url}`)
      existing.controller.abort()
      this.pendingRequests.delete(key)
    }

    // 创建新的请求
    this.log(`🚀 发起新请求: ${method} ${url}`)
    const controller = new AbortController()

    const promise = (async () => {
      try {
        const result = await requestFn(controller.signal)
        this.log(`✅ 请求成功: ${method} ${url}`)
        this.pendingRequests.delete(key)
        return result
      } catch (error: any) {
        // 如果是手动取消，不删除缓存（可能被新请求替代）
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          this.log(`❌ 请求失败: ${method} ${url}`, error.message)
          this.pendingRequests.delete(key)
        } else {
          this.log(`🚫 请求取消: ${method} ${url}`)
        }
        throw error
      }
    })()

    this.pendingRequests.set(key, {
      timestamp: now,
      controller,
      promise
    })

    return promise
  }

  /**
   * 取消指定的请求
   */
  cancel(method: string, url: string, body?: any): void {
    const key = this.generateKey(method, url, body)
    const request = this.pendingRequests.get(key)

    if (request) {
      request.controller.abort()
      this.pendingRequests.delete(key)
    }
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAll(): void {
    for (const request of this.pendingRequests.values()) {
      request.controller.abort()
    }
    this.pendingRequests.clear()
  }

  /**
   * 获取统计信息
   */
  getStats(): { pendingCount: number; oldestRequest: number | null } {
    const now = Date.now()
    let oldestRequest: number | null = null

    for (const request of this.pendingRequests.values()) {
      const age = now - request.timestamp
      if (oldestRequest === null || age > oldestRequest) {
        oldestRequest = age
      }
    }

    return {
      pendingCount: this.pendingRequests.size,
      oldestRequest
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cancelAll()
  }

  /**
   * 销毁去重器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cancelAll()
  }
}

// 创建全局去重实例 - 100ms内合并相同请求
export const requestDeduplicator = new RequestDeduplicator({
  windowMs: 100, // 100ms内的相同请求将被合并
  includeBody: true,
  debug: import.meta.env.DEV // 开发环境开启调试日志
})

// 导出类以便创建自定义实例
export { RequestDeduplicator }
export type { DeduplicatorOptions }
