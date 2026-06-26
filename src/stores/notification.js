import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getNotificationSummary,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notification'

const TYPE_LABELS = {
  INVITE_RECEIVED: '陪伴邀请',
  INVITE_ACCEPTED: '邀请已接受',
  NEW_MESSAGE: '私聊消息',
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref([])
  const pendingInvitations = ref(0)
  const unreadMessages = ref(0)
  const unreadInbox = ref(0)

  const unreadCount = computed(
    () => pendingInvitations.value + unreadMessages.value + unreadInbox.value,
  )

  async function fetchSummary() {
    try {
      const summary = await getNotificationSummary()
      pendingInvitations.value = summary.pendingInvitations || 0
      unreadMessages.value = summary.unreadMessages || 0
      unreadInbox.value = summary.unreadInbox || 0
    } catch {
      pendingInvitations.value = 0
      unreadMessages.value = 0
      unreadInbox.value = 0
    }
  }

  async function fetchInbox() {
    try {
      const list = await listNotifications({ page: 1, size: 30 })
      items.value = list.map((item) => ({
        ...item,
        read: item.read === true || item.isRead === 1 || item.isRead === true,
      }))
    } catch {
      /* keep existing items */
    }
  }

  function handleIncoming(notification, { suppressUnread = false } = {}) {
    const id = notification.id ?? `${notification.type}-${notification.relationId}-${Date.now()}`
    const existing = items.value.findIndex((item) => item.id === id)
    const entry = {
      ...notification,
      id,
      read: false,
    }
    if (existing >= 0) {
      items.value.splice(existing, 1, entry)
    } else {
      items.value.unshift(entry)
    }
    if (items.value.length > 30) {
      items.value.length = 30
    }

    if (suppressUnread) return

    if (notification.type === 'INVITE_RECEIVED') {
      pendingInvitations.value += 1
    } else if (notification.type === 'NEW_MESSAGE') {
      unreadMessages.value += 1
    } else {
      unreadInbox.value += 1
    }
  }

  async function markItemRead(id) {
    const item = items.value.find((i) => i.id === id)
    if (item && !item.read) {
      item.read = true
      if (typeof id === 'number' || /^\d+$/.test(String(id))) {
        try {
          await markNotificationRead(id)
          await fetchSummary()
        } catch {
          /* local state already updated */
        }
      }
    }
  }

  async function markAllRead() {
    items.value.forEach((item) => {
      item.read = true
    })
    try {
      await markAllNotificationsRead()
      await fetchSummary()
    } catch {
      /* ignore */
    }
  }

  function clearUnreadCounts() {
    pendingInvitations.value = 0
    unreadMessages.value = 0
    unreadInbox.value = 0
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || '通知'
  }

  function resetState() {
    items.value = []
    pendingInvitations.value = 0
    unreadMessages.value = 0
    unreadInbox.value = 0
  }

  return {
    items,
    pendingInvitations,
    unreadMessages,
    unreadInbox,
    unreadCount,
    fetchSummary,
    fetchInbox,
    handleIncoming,
    markItemRead,
    markAllRead,
    clearUnreadCounts,
    typeLabel,
    resetState,
  }
})
