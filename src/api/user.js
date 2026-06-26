import request from './request'

export function register(data) {
  return request.post('/user/register', data)
}

export function getCommunityRule() {
  return request.get('/user/community-rule', { silent: true })
}

export function login(data) {
  return request.post('/user/login', data)
}

export function refreshToken(data) {
  return request.post('/user/refresh', data)
}

export function logoutApi(accessToken) {
  const config = { silent: true }
  if (accessToken) {
    config.headers = { Authorization: `Bearer ${accessToken}` }
  }
  return request.post('/user/logout', null, config)
}

export function getCurrentUser() {
  return request.get('/user/me')
}

export function updateProfile(data) {
  return request.put('/user/me', data)
}

export function lookupUser(userId) {
  return request.get(`/user/${userId}/brief`)
}

export function searchUsers(keyword) {
  return request.get('/user/search', { params: { keyword } })
}
