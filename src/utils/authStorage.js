const TOKEN_KEY = 'tondo_token'
const REFRESH_TOKEN_KEY = 'tondo_refresh_token'

/**
 * 使用 sessionStorage：每个浏览器标签页/窗口独立，避免多账号互相覆盖 token。
 */
export function migrateLegacyToken() {
  if (sessionStorage.getItem(TOKEN_KEY)) {
    return
  }
  const legacy =
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem('token')
  if (legacy) {
    sessionStorage.setItem(TOKEN_KEY, legacy)
    localStorage.removeItem('token')
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export function setTokens(accessToken, refreshToken) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
  localStorage.removeItem('token')
  localStorage.removeItem(TOKEN_KEY)
}

export function setToken(token) {
  setTokens(token, getRefreshToken())
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('token')
  localStorage.removeItem(TOKEN_KEY)
}
