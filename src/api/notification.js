import request from './request'

function unwrapPage(data) {
  if (Array.isArray(data)) return data
  return data?.records ?? []
}

export function getNotificationSummary() {
  return request.get('/notifications/summary')
}

export async function listNotifications(params = {}) {
  const data = await request.get('/notifications', { params })
  return unwrapPage(data)
}

export function markNotificationRead(id) {
  return request.put(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return request.put('/notifications/read-all')
}
