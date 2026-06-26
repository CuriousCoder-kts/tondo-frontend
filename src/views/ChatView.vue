<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { getMessages } from '@/api/message'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import CheckinPanel from '@/components/CheckinPanel.vue'
import PageShell from '@/components/PageShell.vue'
import { formatTime, formatDateLabel, dateKey } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()
const { chatableRelations } = storeToRefs(chatStore)

const inputContent = ref('')
const sending = ref(false)
const loadingHistory = ref(false)
const messagesEl = ref(null)
const checkinPanelRef = ref(null)

const currentRelationId = computed(() => {
  const param = route.params.relationId
  if (param) return Number(param)
  return chatStore.activeRelationId
})

const currentRelation = computed(() =>
  chatStore.relations.find((r) => r.id === currentRelationId.value),
)

const messages = computed(() => {
  const id = currentRelationId.value
  if (!id) return []
  return chatStore.messagesByRelation[id] || []
})

async function loadHistory(relationId, force = false) {
  const id = Number(relationId)
  if (!force && chatStore.isHistoryLoaded(id)) return

  loadingHistory.value = true
  try {
    const list = await getMessages(id)
    chatStore.setMessages(id, list)
    await notificationStore.fetchSummary()
    await nextTick()
    scrollToBottom()
  } finally {
    loadingHistory.value = false
  }
}

function selectRelation(relationId) {
  const id = Number(relationId)
  chatStore.setActiveRelation(id)
  if (Number(route.params.relationId) !== id) {
    router.replace({ name: 'chat-room', params: { relationId: String(id) } })
  }
  loadHistory(id)
}

async function handleSend() {
  const content = inputContent.value.trim()
  if (!content) return
  if (!currentRelationId.value) {
    ElMessage.warning('请先选择陪伴关系')
    return
  }

  if (!chatStore.connected) {
    chatStore.connect()
    ElMessage.warning('正在连接，请稍后再试')
    return
  }

  sending.value = true
  try {
    chatStore.sendMessage(currentRelationId.value, content)
    inputContent.value = ''
    await nextTick()
    scrollToBottom()
  } catch (e) {
    ElMessage.error(e.message || '发送失败')
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function isSelf(msg) {
  return msg.senderId == userStore.userId
}

const messageGroups = computed(() => {
  const groups = []
  let lastKey = null
  for (const msg of messages.value) {
    const key = dateKey(msg.createdAt)
    if (key !== lastKey) {
      groups.push({ type: 'date', label: formatDateLabel(msg.createdAt), key: `d-${key}` })
      lastKey = key
    }
    groups.push({ type: 'msg', data: msg, key: msg.id || `local-${msg.createdAt}-${msg.content}` })
  }
  return groups
})

function unreadInRelation(relationId) {
  const list = chatStore.messagesByRelation[relationId] || []
  return list.filter(
    (m) => !m._local && m.isRead === 0 && m.receiverId == userStore.userId,
  ).length
}

watch(
  () => chatStore.connected,
  (isConnected) => {
    if (isConnected && currentRelationId.value) {
      loadHistory(currentRelationId.value, true)
    }
  },
)

watch(
  () => route.params.relationId,
  async (id) => {
    if (id) {
      const relId = Number(id)
      await chatStore.fetchRelations()
      const rel = chatStore.relations.find((r) => r.id === relId)
      if (!rel || rel.status !== 'ACCEPTED') {
        ElMessage.warning('该陪伴关系不存在或尚未开始')
        router.replace({ name: 'chat' })
        return
      }
      chatStore.setActiveRelation(relId)
      loadHistory(relId)
    }
  },
)

watch(
  messages,
  () => nextTick(scrollToBottom),
  { deep: true },
)

onMounted(async () => {
  await chatStore.fetchRelations()
  if (route.params.relationId) {
    const id = Number(route.params.relationId)
    const rel = chatStore.relations.find((r) => r.id === id)
    if (!rel || rel.status !== 'ACCEPTED') {
      ElMessage.warning('该陪伴关系不存在或尚未开始')
      router.replace({ name: 'chat' })
      return
    }
    chatStore.setActiveRelation(id)
    await loadHistory(id)
  } else if (chatableRelations.value.length) {
    selectRelation(chatableRelations.value[0].id)
  }
})
</script>

<template>
  <PageShell full title="私聊" subtitle="与陪伴伙伴保持连接">
    <template #actions>
      <el-tag :type="chatStore.connected ? 'success' : 'danger'" size="small" round>
        {{ chatStore.connected ? '已连接' : '未连接' }}
      </el-tag>
    </template>

    <div class="chat-layout">
      <aside class="relation-list page-section">
        <h3 class="panel-title">陪伴关系</h3>
        <div
          v-for="rel in chatableRelations"
          :key="rel.id"
          :class="['relation-item', { active: rel.id === currentRelationId }]"
          @click="selectRelation(rel.id)"
        >
          <div class="rel-row">
            <div class="rel-title">{{ rel.planTitle || '陪伴' }}</div>
            <span v-if="unreadInRelation(rel.id)" class="unread-dot">{{ unreadInRelation(rel.id) }}</span>
          </div>
          <div class="rel-meta">{{ rel.partnerNickname }}</div>
        </div>
        <div v-if="chatableRelations.length === 0" class="empty-hint">
          暂无进行中的关系，去「陪伴计划」接受邀请吧
        </div>
      </aside>

      <main class="chat-main page-section">
        <template v-if="currentRelationId">
          <div class="chat-header">
            <div class="chat-header-info">
              <span>{{ currentRelation?.planTitle || '私聊' }}</span>
              <span v-if="currentRelation" class="partner-name">{{ currentRelation.partnerNickname }}</span>
            </div>
            <span v-if="currentRelation?.daysRemaining != null" class="days-badge">
              剩余 {{ currentRelation.daysRemaining }} 天
            </span>
          </div>

          <CheckinPanel
            ref="checkinPanelRef"
            :relation-id="currentRelationId"
            compact
            @checked-in="chatStore.fetchRelations()"
          />

          <div ref="messagesEl" v-loading="loadingHistory" class="messages">
            <template v-for="item in messageGroups" :key="item.key">
              <div v-if="item.type === 'date'" class="date-separator">
                <span>{{ item.label }}</span>
              </div>
              <div
                v-else
                :class="['message', isSelf(item.data) ? 'self' : 'other']"
              >
                <div class="bubble">
                  <div class="bubble-content">{{ item.data.content }}</div>
                  <div class="bubble-time">{{ formatTime(item.data.createdAt) }}</div>
                </div>
              </div>
            </template>
            <div v-if="!loadingHistory && messages.length === 0" class="empty-state">
              <p>还没有消息，发送第一条吧</p>
            </div>
          </div>

          <div class="input-area">
            <el-input
              v-model="inputContent"
              placeholder="输入消息..."
              @keyup.enter="handleSend"
            />
            <el-button type="primary" :loading="sending" @click="handleSend">发送</el-button>
          </div>
        </template>

        <div v-else class="empty-state">
          <el-icon><ChatDotRound /></el-icon>
          <p>选择一个陪伴关系开始聊天</p>
        </div>
      </main>
    </div>
  </PageShell>
</template>

<style scoped>
.chat-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 210px);
  min-height: 480px;
}

.relation-list {
  width: 280px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 18px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--tondo-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.relation-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: background 0.15s;
}

.relation-item:hover {
  background: var(--tondo-bg);
}

.relation-item.active {
  background: linear-gradient(90deg, rgba(79, 140, 255, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%);
  border: 1px solid rgba(79, 140, 255, 0.25);
}

.rel-title {
  font-weight: 500;
  font-size: 14px;
}

.rel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.unread-dot {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--tondo-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rel-meta {
  font-size: 12px;
  color: var(--tondo-text-secondary);
  margin-top: 4px;
}

.empty-hint {
  font-size: 13px;
  color: var(--tondo-text-secondary);
  padding: 8px 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  min-width: 0;
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--tondo-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.chat-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.partner-name {
  font-size: 12px;
  font-weight: 400;
  color: var(--tondo-text-secondary);
}

.days-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--tondo-primary-dark);
  background: linear-gradient(135deg, #edf3ff, #e0eaff);
  padding: 4px 12px;
  border-radius: 20px;
}

.chat-main :deep(.checkin-panel.compact) {
  margin: 0 16px 12px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: linear-gradient(180deg, #f8faff 0%, var(--tondo-bg) 100%);
}

.date-separator {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.date-separator span {
  font-size: 12px;
  color: var(--tondo-text-secondary);
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--tondo-border);
}

.message {
  display: flex;
  margin-bottom: 12px;
}

.message.self {
  justify-content: flex-end;
}

.message.other {
  justify-content: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.self .bubble {
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-primary-dark) 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.other .bubble {
  background: #fff;
  border: 1px solid var(--tondo-border);
  border-bottom-left-radius: 4px;
}

.bubble-time {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--tondo-border);
  background: var(--tondo-surface);
}

@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 180px);
  }

  .relation-list {
    width: 100%;
    max-height: 140px;
  }

  .chat-main {
    min-height: 420px;
  }
}
</style>
