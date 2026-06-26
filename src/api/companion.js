import request from './request'

export function getSeekingPlans(confusionTag) {
  return request.get('/companion/plans', {
    params: confusionTag ? { confusionTag } : {},
  })
}

export function getMyPlans() {
  return request.get('/companion/my-plans')
}

export function createPlan(data) {
  return request.post('/companion/plans', data)
}

export function inviteUser(data) {
  return request.post('/companion/invite', data)
}

export function respondInvitation(relationId, accept) {
  return request.put(`/companion/invitations/${relationId}`, null, {
    params: { accept },
  })
}

export function getMyRelations() {
  return request.get('/companion/relations')
}

export function getPendingInvitations() {
  return request.get('/companion/invitations/pending')
}

export function getMatchCandidates(planId) {
  return request.get('/companion/match', { params: { planId } })
}

export function checkin(relationId, note) {
  return request.post(`/companion/relations/${relationId}/checkin`, note ? { note } : {})
}

export function getCheckinStatus(relationId) {
  return request.get(`/companion/relations/${relationId}/checkin-status`)
}
