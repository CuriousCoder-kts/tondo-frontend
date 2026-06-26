import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'

/** 切换/退出账号时清空 WebSocket 与各模块内存状态，避免串数据 */
export function resetAppSession() {
  const chatStore = useChatStore()
  const notificationStore = useNotificationStore()

  chatStore.disconnect()
  chatStore.resetState()
  notificationStore.resetState()
}
