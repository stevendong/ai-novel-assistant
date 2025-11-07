export interface TokenInfo {
  userId: string
  type: string
  iat: number
  exp: number
}

export class TokenValidator {
  private static parseJWT(token: string): TokenInfo | null {
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url) return null

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )

      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('[TokenValidator] Failed to parse JWT:', error)
      return null
    }
  }

  static isTokenExpired(token: string): boolean {
    const payload = this.parseJWT(token)
    if (!payload || !payload.exp) {
      return true
    }

    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime
  }

  static getTokenExpiresIn(token: string): number {
    const payload = this.parseJWT(token)
    if (!payload || !payload.exp) {
      return 0
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - currentTime

    return expiresIn > 0 ? expiresIn : 0
  }

  static validateStoredTokens(): {
    valid: boolean
    reason?: string
    sessionTokenValid: boolean
    refreshTokenValid: boolean
  } {
    const sessionToken = localStorage.getItem('sessionToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (!sessionToken && !refreshToken) {
      return {
        valid: false,
        reason: 'No tokens found',
        sessionTokenValid: false,
        refreshTokenValid: false,
      }
    }

    const sessionTokenValid = sessionToken ? !this.isTokenExpired(sessionToken) : false
    const refreshTokenValid = refreshToken ? !this.isTokenExpired(refreshToken) : false

    if (!refreshTokenValid && refreshToken) {
      return {
        valid: false,
        reason: 'Refresh token expired',
        sessionTokenValid,
        refreshTokenValid: false,
      }
    }

    return {
      valid: sessionTokenValid || refreshTokenValid,
      sessionTokenValid,
      refreshTokenValid,
    }
  }

  static clearInvalidTokens(): void {
    const validation = this.validateStoredTokens()

    if (!validation.valid) {
      console.log('[TokenValidator] Clearing invalid tokens:', validation.reason)
      localStorage.removeItem('user')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('refreshToken')
    } else {
      if (!validation.sessionTokenValid) {
        console.log('[TokenValidator] Session token expired, will refresh on next request')
      }

      if (validation.refreshTokenValid) {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const expiresIn = this.getTokenExpiresIn(refreshToken)
          const expiresInHours = Math.floor(expiresIn / 3600)
          console.log(`[TokenValidator] Refresh token valid, expires in ${expiresInHours} hours`)
        }
      }
    }
  }

  static logTokenStatus(): void {
    const sessionToken = localStorage.getItem('sessionToken')
    const refreshToken = localStorage.getItem('refreshToken')

    console.log('[TokenValidator] Token Status:')

    if (sessionToken) {
      const sessionExpired = this.isTokenExpired(sessionToken)
      const sessionExpiresIn = this.getTokenExpiresIn(sessionToken)
      console.log(
        `  Session Token: ${sessionExpired ? 'EXPIRED' : 'VALID'} (expires in ${Math.floor(sessionExpiresIn / 60)} minutes)`
      )
    } else {
      console.log('  Session Token: NOT FOUND')
    }

    if (refreshToken) {
      const refreshExpired = this.isTokenExpired(refreshToken)
      const refreshExpiresIn = this.getTokenExpiresIn(refreshToken)
      const hours = Math.floor(refreshExpiresIn / 3600)
      const minutes = Math.floor((refreshExpiresIn % 3600) / 60)
      console.log(
        `  Refresh Token: ${refreshExpired ? 'EXPIRED' : 'VALID'} (expires in ${hours}h ${minutes}m)`
      )
    } else {
      console.log('  Refresh Token: NOT FOUND')
    }
  }

  static clearAllAuth(): void {
    console.log('[TokenValidator] Manually clearing all auth data')
    localStorage.removeItem('user')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('refreshToken')
    console.log('[TokenValidator] Auth data cleared. Reloading page...')
    window.location.reload()
  }
}

if (typeof window !== 'undefined') {
  (window as any).clearAuth = () => TokenValidator.clearAllAuth();
  (window as any).checkTokens = () => TokenValidator.logTokenStatus()
}
