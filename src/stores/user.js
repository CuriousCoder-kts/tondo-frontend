import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, getCurrentUser, logoutApi } from '@/api/user'
import { getUserIdFromToken } from '@/utils/jwt'
import { getToken, setTokens, removeToken, migrateLegacyToken } from '@/utils/authStorage'
import { resetAppSession } from '@/utils/sessionReset'

migrateLegacyToken()

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const user = ref(null)
  /** 每次登录/登出递增，用于忽略旧会话的 401 响应 */
  const sessionEpoch = ref(0)

  const isLoggedIn = computed(() => !!token.value)
  const userId = computed(() => getUserIdFromToken(token.value))

  async function fetchUser() {
    if (!token.value) return null
    const data = await getCurrentUser()
    const tokenUid = getUserIdFromToken(token.value)
    if (tokenUid && data?.id && Number(tokenUid) !== Number(data.id)) {
      await logout()
      throw new Error('登录状态异常，请重新登录')
    }
    user.value = data
    return user.value
  }

  async function login(credentials) {
    sessionEpoch.value += 1
    resetAppSession()
    token.value = ''
    user.value = null
    removeToken()
    const tokenPair = await loginApi(credentials)
    const accessToken = typeof tokenPair === 'string' ? tokenPair : tokenPair?.accessToken
    if (!accessToken) {
      throw new Error('登录响应无效')
    }
    token.value = accessToken
    setTokens(accessToken, tokenPair?.refreshToken)
    await fetchUser()
    return accessToken
  }

  async function register(data) {
    const newUser = await registerApi(data)
    return newUser
  }

  let logoutPromise = null

  async function logout() {
    if (logoutPromise) return logoutPromise
    sessionEpoch.value += 1
    const accessToken = token.value || getToken()

    resetAppSession()
    token.value = ''
    user.value = null
    removeToken()

    logoutPromise = (async () => {
      try {
        if (accessToken) {
          await logoutApi(accessToken)
        }
      } catch {
        /* ignore network errors on logout */
      }
    })().finally(() => {
      logoutPromise = null
    })
    return logoutPromise
  }

  function init() {
    migrateLegacyToken()
    token.value = getToken()
    if (token.value) {
      fetchUser().catch((e) => {
        const status = e?.response?.status
        if (status === 401 || status === 403 || e?.message?.includes('登录状态')) {
          logout()
        }
      })
    }
  }

  return {
    token,
    user,
    userId,
    sessionEpoch,
    isLoggedIn,
    fetchUser,
    login,
    register,
    logout,
    init,
  }
})
