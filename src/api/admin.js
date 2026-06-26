import request from './request'

function unwrapPage(data) {
  if (Array.isArray(data)) {
    return data
  }
  return data?.records ?? []
}

export async function getPendingReports(params = {}) {
  const data = await request.get('/admin/reports', { params })
  return unwrapPage(data)
}

export function handleReport(reportId, data) {
  return request.put(`/admin/reports/${reportId}`, data)
}

export function updateUserStatus(userId, frozen) {
  return request.put(`/admin/users/${userId}/status`, { frozen })
}

export function updateUserRole(userId, role) {
  return request.put(`/admin/users/${userId}/role`, { role })
}

export async function getOperationLogs(params = {}) {
  const data = await request.get('/admin/operation-logs', { params })
  return unwrapPage(data)
}
