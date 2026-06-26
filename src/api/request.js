import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import { getToken, getRefreshToken, setTokens } from '@/utils/authStorage'
import { refreshToken as refreshTokenApi } from '@/api/user'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

const PUBLIC_URLS = ['/user/login', '/user/register', '/user/refresh', '/user/community-rule']
const SKIP_UNAUTHORIZED_URLS = [...PUBLIC_URLS, '/user/logout']

function isPublicRequest(url) {
  if (!url) return false
  return PUBLIC_URLS.some((path) => url.startsWith(path))
}

function shouldSkipUnauthorizedHandling(url) {
  if (!url) return false
  return SKIP_UNAUTHORIZED_URLS.some((path) => url.startsWith(path))
}

function isStaleAuthResponse(config) {
  const epoch = config?._authEpoch
  if (epoch == null) return false
  try {
    return epoch !== useUserStore().sessionEpoch
  } catch {
    return false
  }
}

let refreshPromise = null

async function tryRefreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshPromise) {
    refreshPromise = refreshTokenApi({ refreshToken })
      .then((data) => {
        const accessToken = data?.accessToken
        if (!accessToken) return false
        setTokens(accessToken, data.refreshToken || refreshToken)
        try {
          useUserStore().token = accessToken
        } catch {
          /* store may be unavailable */
        }
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

request.interceptors.request.use((config) => {
  try {
    config._authEpoch = useUserStore().sessionEpoch
  } catch {
    /* store may be unavailable */
  }

  if (isPublicRequest(config.url)) {
    return config
  }
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let unauthorizedHandling = null

async function handleUnauthorized() {
  if (unauthorizedHandling) return unauthorizedHandling

  unauthorizedHandling = (async () => {
    const redirect = router.currentRoute.value.fullPath
    try {
      await useUserStore().logout()
    } catch {
      /* store may be unavailable */
    }
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login', query: redirect && redirect !== '/login' ? { redirect } : {} })
    }
  })().finally(() => {
    unauthorizedHandling = null
  })

  return unauthorizedHandling
}

function shouldForceLogout(message) {
  return /冻结|登录|token/i.test(message || '')
}

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      const stale = isStaleAuthResponse(response.config)
      if (res.code === 401 && stale) {
        return Promise.reject(new Error(res.message || '请求失败'))
      }
      if (!response.config?.silent && !stale) {
        ElMessage.error(res.message || '请求失败')
      }
      if (res.code === 401 && !shouldSkipUnauthorizedHandling(response.config?.url)) {
        handleUnauthorized()
      } else if (res.code === 403 && shouldForceLogout(res.message)) {
        handleUnauthorized()
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data
  },
  async (error) => {
    const status = error.response?.status
    const config = error.config || {}
    const stale = isStaleAuthResponse(config)
    let msg = error.response?.data?.message || error.message || '网络错误'

    if (status === 401 && !config._retry && !isPublicRequest(config.url) && !stale) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        config._retry = true
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${getToken()}`
        return request(config)
      }
    }

    if (status === 403) {
      const hasToken = !!getToken()
      const msgText = error.response?.data?.message || ''
      if (hasToken && shouldForceLogout(msgText) && !stale) {
        handleUnauthorized()
      }
      msg = msgText || '权限不足，无法访问该功能'
    }

    if (!config.silent && !(status === 401 && (stale || unauthorizedHandling))) {
      ElMessage.error(msg)
    }

    if (status === 401 && !shouldSkipUnauthorizedHandling(config.url) && !stale) {
      handleUnauthorized()
    }
    return Promise.reject(error)
  },
)

export default request
