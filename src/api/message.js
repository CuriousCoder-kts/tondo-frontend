import request from './request'

export async function getMessages(relationId, params = {}) {
  const data = await request.get(`/messages/${relationId}`, { params })
  if (Array.isArray(data)) {
    return data
  }
  return data?.records ?? []
}
