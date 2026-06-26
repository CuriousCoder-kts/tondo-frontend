import request from './request'

export function getReplies(cardId) {
  return request.get(`/cards/${cardId}/replies`)
}

export function createReply(cardId, data) {
  return request.post(`/cards/${cardId}/replies`, data)
}

export function thankReply(cardId, replyId) {
  return request.post(`/cards/${cardId}/replies/${replyId}/thanks`)
}
