import request from './request'

export function getCards(params) {
  return request.get('/cards', { params })
}

export function getCard(id) {
  return request.get(`/cards/${id}`)
}

export function createCard(data) {
  return request.post('/cards', data)
}

export function resolveCard(id, data) {
  return request.put(`/cards/${id}/resolve`, data)
}

export function thankCard(id) {
  return request.post(`/cards/${id}/thanks`)
}
