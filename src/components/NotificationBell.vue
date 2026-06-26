<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPendingInvitations, respondInvitation } from '@/api/companion'
import { useNotificationStore } from '@/stores/notification'
import { formatRelativeTime } from '@/utils/date'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const notificationStore = useNotificationStore()
const chatStore = useChatStore()

const pendingInvites = ref([])
const loadingPending = ref(false)
const respondingId = ref(null)

const displayItems = computed(() => notificationStore.items.slice(0, 10))

async function refreshPending() {
  loadingPending.value = true
  try {
    await notificationStore.fetchSummary()
    pendingInvites.value = await getPendingInvitations()
  } finally {
    loadingPending.value = false
  }
}

async function handleOpen() {
  await refreshPending()
  await notificationStore.fetchInbox()
}

async function respondInvite(relationId, accept) {
  const action = accept ? '接受' : '拒绝'
  try {
    if (accept) {
      await ElMessageBox.confirm(`确定${action}此陪伴邀请？`, '陪伴邀请')
    } else {
      await ElMessageBox.confirm(`确定${action}此邀请？`, '提示')
    }
  } catch {
    return
  }

  respondingId.value = relationId
  try {
    await respondInvitation(relationId, accept)
    await chatStore.fetchRelations()
    await refreshPending()
    if (accept) {
      ElMessage.success('已接受邀请，即将进入私聊')
      router.push({ name: 'chat-room', params: { relationId: String(relationId) } })
    } else {
      ElMessage.info('已拒绝邀请')
    }
  } finally {
    respondingId.value = null
  }
}

function goInvitationsTab() {
  router.push({ name: 'companion', query: { tab: 'invitations' } })
}

async function handleClick(item) {
  await notificationStore.markItemRead(item.id)

  if (item.type === 'INVITE_RECEIVED') {
    goInvitationsTab()
    return
  }

  if (item.type === 'INVITE_ACCEPTED' || item.type === 'NEW_MESSAGE') {
    if (item.relationId) {
      await chatStore.fetchRelations()
      await notificationStore.fetchSummary()
      router.push({ name: 'chat-room', params: { relationId: String(item.relationId) } })
    }
  }
}
</script>

<template>
  <el-popover placement="bottom-end" :width="360" trigger="click" @show="handleOpen">
    <template #reference>
      <el-badge :value="notificationStore.unreadCount" :hidden="!notificationStore.unreadCount" :max="99">
        <el-button circle class="bell-btn">
          <el-icon :size="18"><Bell /></el-icon>
        </el-button>
      </el-badge>
    </template>

    <div v-loading="loadingPending" class="notification-panel">
      <div class="panel-header">
        <span>通知</span>
        <div class="header-actions">
          <el-button text size="small" @click="notificationStore.markAllRead">全部已读</el-button>
          <el-button text size="small" @click="refreshPending">刷新</el-button>
        </div>
      </div>

      <div v-if="pendingInvites.length" class="pending-section">
        <div class="section-title">
          待处理邀请
          <span class="section-hint">可直接在此接受或拒绝</span>
        </div>
        <div v-for="rel in pendingInvites" :key="rel.id" class="invite-card">
          <div class="invite-title">{{ rel.planTitle || '陪伴邀请' }}</div>
          <div class="invite-meta">来自 {{ rel.inviterNickname || '用户' }}</div>
          <div class="invite-actions">
            <el-button
              type="primary"
              size="small"
              :loading="respondingId === rel.id"
              @click="respondInvite(rel.id, true)"
            >
              接受
            </el-button>
            <el-button
              size="small"
              :loading="respondingId === rel.id"
              @click="respondInvite(rel.id, false)"
            >
              拒绝
            </el-button>
            <el-button size="small" text type="primary" @click="goInvitationsTab">详情</el-button>
          </div>
        </div>
      </div>

      <div v-else-if="!loadingPending" class="no-pending">
        暂无待处理邀请
      </div>

      <template v-if="displayItems.length">
        <el-divider content-position="left">最近通知</el-divider>
        <div
          v-for="item in displayItems"
          :key="item.id"
          :class="['notification-item', { unread: !item.read }]"
          @click="handleClick(item)"
        >
          <div class="item-top">
            <el-tag size="small" effect="plain">{{ notificationStore.typeLabel(item.type) }}</el-tag>
            <span class="item-time">{{ formatRelativeTime(item.createdAt) }}</span>
          </div>
          <div class="item-title">{{ item.title }}</div>
          <div class="item-content">{{ item.content }}</div>
        </div>
      </template>
    </div>
  </el-popover>
</template>

<style scoped>
.bell-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(79, 140, 255, 0.14);
  background: rgba(255, 255, 255, 0.82);
  border-radius: 9px;
  transition: background 0.2s, border-color 0.2s;
}

.bell-btn:hover {
  background: #fff;
  border-color: rgba(79, 140, 255, 0.28);
  box-shadow: none;
}

.notification-panel {
  max-height: 420px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 10px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.pending-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-hint {
  font-weight: 400;
  color: var(--tondo-text-secondary);
  font-size: 12px;
  margin-left: 6px;
}

.invite-card {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(79, 140, 255, 0.06);
  border: 1px solid rgba(79, 140, 255, 0.2);
}

.invite-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.invite-meta {
  font-size: 12px;
  color: var(--tondo-text-secondary);
  margin-bottom: 10px;
}

.invite-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.no-pending {
  text-align: center;
  color: var(--tondo-text-secondary);
  font-size: 13px;
  padding: 12px 0 8px;
}

.notification-item {
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.notification-item:hover {
  background: var(--tondo-bg);
}

.notification-item.unread {
  background: rgba(79, 140, 255, 0.05);
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.item-time {
  font-size: 11px;
  color: var(--tondo-text-secondary);
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.item-content {
  font-size: 12px;
  color: var(--tondo-text-secondary);
  line-height: 1.4;
}
</style>
