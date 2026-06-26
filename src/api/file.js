import request from './request'

export async function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/files/avatar', formData, { timeout: 60000 })
}
