import request from './request'

export function createReport(data) {
  return request.post('/reports', data)
}
