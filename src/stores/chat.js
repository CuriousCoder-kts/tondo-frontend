import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Client } from '@stomp/stompjs'
import { getMyRelations } from '@/api/companion'
import { useUserStore } from './user'
import { useNotificationStore } from './notification'

function normalizeRelationId(relationId) {
  return Number(relationId)
}

export const useChatStore = defineStore('chat', () => {
  const client = ref(null)
  const connected = ref(false)
  const relations = ref([])
  const messagesByRelation = ref({})
  const activeRelationId = ref(null)
  const historyLoaded = ref({})
  const sessionUserId = ref(null)

  const activeMessages = computed(() => {
    if (!activeRelationId.value) return []
    const id = normalizeRelationId(activeRelationId.value)
    return messagesByRelation.value[id] || []
  })

  const chatableRelations = computed(() =>
    relations.value.filter((r) => r.status === 'ACCEPTED'),
  )

  const pendingInvitations = computed(() =>
    relations.value.filter((r) => r.status === 'PENDING'),
  )

  function getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  function connect() {
    const userStore = useUserStore()
    const uid = userStore.userId
    if (!userStore.token || !uid) return

    if (client.value?.active && sessionUserId.value === uid) return

    const userChanged = sessionUserId.value != null && sessionUserId.value !== uid
    disconnect()
    if (userChanged) {
      resetState()
    }

    sessionUserId.value = uid

    const stompClient = new Client({
      brokerURL: getWsUrl(),
      connectHeaders: {
        Authorization: `Bearer ${userStore.token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        connected.value = true
        const userStore = useUserStore()
        const notificationStore = useNotificationStore()
        const userId = userStore.userId
        if (userId) {
          stompClient.subscribe(`/user/${userId}/queue/private`, (message) => {
            const msg = JSON.parse(message.body)
            appendMessage(msg.relationId, msg)
          })
          stompClient.subscribe(`/user/${userId}/queue/notifications`, (message) => {
            const notification = JSON.parse(message.body)
            const suppressUnread =
              notification.type === 'NEW_MESSAGE' &&
              activeRelationId.value === normalizeRelationId(notification.relationId)
            notificationStore.handleIncoming(notification, { suppressUnread })
            if (!suppressUnread || notification.type !== 'NEW_MESSAGE') {
              if (notification.type === 'INVITE_RECEIVED') {
                ElMessage({
                  message: '收到陪伴邀请，点击右上角铃铛可直接接受',
                  type: 'info',
                  duration: 5000,
                })
              } else {
                ElMessage.info(notification.title || '你有新通知')
              }
            }
          })
        }
        fetchRelations()
        notificationStore.fetchSummary()
        if (activeRelationId.value) {
          const id = normalizeRelationId(activeRelationId.value)
          historyLoaded.value = { ...historyLoaded.value, [id]: false }
        }
      },
      onDisconnect: () => {
        connected.value = false
      },
      onStompError: () => {
        connected.value = false
      },
      onWebSocketClose: () => {
        connected.value = false
      },
    })

    stompClient.activate()
    client.value = stompClient
  }

  function disconnect() {
    if (client.value) {
      client.value.deactivate()
      client.value = null
    }
    connected.value = false
  }

  function resetState() {
    relations.value = []
    messagesByRelation.value = {}
    activeRelationId.value = null
    historyLoaded.value = {}
    sessionUserId.value = null
  }

  function sendMessage(relationId, content) {
    const userStore = useUserStore()
    const id = normalizeRelationId(relationId)

    if (!client.value?.connected) {
      throw new Error('WebSocket 未连接')
    }

    const added = appendMessage(id, {
      relationId: id,
      senderId: userStore.userId,
      content,
      createdAt: new Date().toISOString(),
      _local: true,
    })
    if (!added) {
      return false
    }

    try {
      client.value.publish({
        destination: '/app/chat.private',
        body: JSON.stringify({ relationId: id, content }),
      })
      return true
    } catch (e) {
      removeLocalMessage(id, content, userStore.userId)
      throw e
    }
  }

  function removeLocalMessage(relationId, content, senderId) {
    const id = normalizeRelationId(relationId)
    const list = messagesByRelation.value[id] || []
    const idx = list.findLastIndex(
      (m) => m._local && m.content === content && m.senderId == senderId,
    )
    if (idx === -1) return
    const next = [...list]
    next.splice(idx, 1)
    messagesByRelation.value = { ...messagesByRelation.value, [id]: next }
  }

  function appendMessage(relationId, msg) {
    const id = normalizeRelationId(relationId)
    const list = [...(messagesByRelation.value[id] || [])]

    if (msg.id && list.some((m) => m.id === msg.id)) return false
    if (msg._local && list.some((m) => m._local && m.content === msg.content && m.senderId == msg.senderId)) {
      return false
    }

    list.push(msg)
    messagesByRelation.value = {
      ...messagesByRelation.value,
      [id]: list,
    }
    return true
  }

  function setMessages(relationId, messages) {
    const id = normalizeRelationId(relationId)
    const serverMessages = [...messages].reverse()
    const existing = messagesByRelation.value[id] || []
    const pendingLocal = existing.filter(
      (m) => m._local && !serverMessages.some((s) => s.id && s.content === m.content),
    )

    messagesByRelation.value = {
      ...messagesByRelation.value,
      [id]: [...serverMessages, ...pendingLocal],
    }
    historyLoaded.value = { ...historyLoaded.value, [id]: true }
  }

  function setActiveRelation(relationId) {
    activeRelationId.value = relationId ? normalizeRelationId(relationId) : null
  }

  function isHistoryLoaded(relationId) {
    return !!historyLoaded.value[normalizeRelationId(relationId)]
  }

  async function fetchRelations() {
    try {
      relations.value = await getMyRelations()
    } catch {
      relations.value = []
    }
    return relations.value
  }

  return {
    connected,
    relations,
    chatableRelations,
    pendingInvitations,
    activeRelationId,
    activeMessages,
    messagesByRelation,
    connect,
    disconnect,
    sendMessage,
    appendMessage,
    setMessages,
    setActiveRelation,
    isHistoryLoaded,
    fetchRelations,
    resetState,
  }
})
