<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCard, thankCard, resolveCard } from '@/api/card'
import { getReplies, createReply, thankReply } from '@/api/reply'
import TagDisplay from '@/components/TagDisplay.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import InviteUserDialog from '@/components/InviteUserDialog.vue'
import PageShell from '@/components/PageShell.vue'
import { useUserStore } from '@/stores/user'
import {
  parseJsonTags,
  NEED_TYPES,
  CARD_STATUS,
} from '@/utils/constants'
import { formatDateTime } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const card = ref(null)
const replies = ref([])
const loading = ref(false)
const replyLoading = ref(false)
const resolveVisible = ref(false)
const resolveContent = ref('')
const reportVisible = ref(false)
const reportTarget = ref({ type: 'CARD', id: 0, label: '' })
const inviteVisible = ref(false)

const replyForm = reactive({
  experienceSituation: '',
  experienceAction: '',
  experienceResult: '',
  replyType: 'EXPERIENCE',
})

const cardId = computed(() => Number(route.params.id))
const isOwner = computed(() => card.value && card.value.userId === userStore.userId)
const emotionTags = computed(() => parseJsonTags(card.value?.emotionTags))
const confusionTags = computed(() => parseJsonTags(card.value?.confusionTags))
const needLabel = computed(
  () => NEED_TYPES.find((n) => n.value === card.value?.needType)?.label,
)

const cardAuthor = computed(() => {
  if (!card.value?.userId) return null
  return {
    id: card.value.userId,
    nickname: card.value.authorNickname || `用户${card.value.userId}`,
  }
})

async function fetchData() {
  loading.value = true
  try {
    card.value = await getCard(cardId.value)
    replies.value = await getReplies(cardId.value)
  } finally {
    loading.value = false
  }
}

async function handleThank() {
  await thankCard(cardId.value)
  ElMessage.success('感谢已送出')
  card.value.thanksCount = (card.value.thanksCount || 0) + 1
}

async function handleThankReply(replyId) {
  await thankReply(cardId.value, replyId)
  ElMessage.success('感谢已送出')
  const reply = replies.value.find((r) => r.id === replyId)
  if (reply) reply.thanksCount = (reply.thanksCount || 0) + 1
}

async function handleSubmitReply() {
  if (
    replyForm.experienceSituation.length < 10 ||
    replyForm.experienceAction.length < 10 ||
    replyForm.experienceResult.length < 10
  ) {
    ElMessage.warning('每项回复内容至少10字')
    return
  }
  replyLoading.value = true
  try {
    const reply = await createReply(cardId.value, { ...replyForm })
    replies.value.push(reply)
    card.value.replyCount = (card.value.replyCount || 0) + 1
    replyForm.experienceSituation = ''
    replyForm.experienceAction = ''
    replyForm.experienceResult = ''
    ElMessage.success('回复成功')
  } finally {
    replyLoading.value = false
  }
}

async function handleResolve() {
  if (resolveContent.value.length < 20) {
    ElMessage.warning('解决方案描述至少20字')
    return
  }
  await resolveCard(cardId.value, { resolutionContent: resolveContent.value })
  ElMessage.success('已标记为已解决')
  resolveVisible.value = false
  fetchData()
}

function openReport(type, id, label) {
  reportTarget.value = { type, id, label }
  reportVisible.value = true
}

onMounted(fetchData)
</script>

<template>
  <div v-loading="loading">
    <PageShell>
      <template #header>
        <div class="detail-nav">
          <el-button text round @click="router.push('/')">
            <el-icon><ArrowLeft /></el-icon>
            返回广场
          </el-button>
        </div>
      </template>
      <template #actions>
        <div class="detail-actions">
          <el-button v-if="card && !isOwner" type="primary" plain round @click="inviteVisible = true">
            <el-icon><UserFilled /></el-icon>
            邀请陪伴
          </el-button>
          <el-button v-if="card && !isOwner" round @click="handleThank">
            <el-icon><Star /></el-icon>
            感谢 ({{ card?.thanksCount || 0 }})
          </el-button>
          <el-button v-if="isOwner && card?.status !== 'RESOLVED'" type="success" round @click="resolveVisible = true">
            标记已解决
          </el-button>
          <el-button v-if="card && !isOwner" text type="danger" round @click="openReport('CARD', card.id, card.title || '该困惑卡片')">
            <el-icon><Warning /></el-icon>
            举报
          </el-button>
        </div>
      </template>

      <article v-if="card" :class="['page-section', 'card-detail', { 'is-resolved': card.status === 'RESOLVED' }]">
        <div v-if="card.status === 'RESOLVED'" class="resolved-hero">
          <el-icon><CircleCheck /></el-icon>
          <span>TA 已走出这段困惑</span>
        </div>
        <header class="card-header">
          <h1>{{ card.title || '无标题困惑' }}</h1>
          <span :class="['status-badge', card.status === 'RESOLVED' ? 'resolved' : 'open']">
            {{ CARD_STATUS[card.status] || card.status }}
          </span>
        </header>

        <div class="detail-section">
          <h4>事件描述</h4>
          <p class="detail-text">{{ card.eventDescription }}</p>
        </div>

        <div class="detail-section">
          <h4>尝试过的方法</h4>
          <p class="detail-text">{{ card.attemptDescription }}</p>
        </div>

        <div class="detail-section">
          <h4>情绪标签</h4>
          <TagDisplay :tags="emotionTags" colored />
        </div>

        <div class="detail-section">
          <h4>困惑领域</h4>
          <TagDisplay :tags="confusionTags" />
        </div>

        <footer class="detail-meta">
          <span>{{ card.authorNickname || '匿名' }}</span>
          <span>需求：{{ needLabel }}</span>
          <span>{{ formatDateTime(card.createdAt) }}</span>
        </footer>

        <div v-if="card.status === 'RESOLVED'" class="resolution detail-section">
          <h4>解决方案</h4>
          <p class="detail-text">{{ card.resolutionContent }}</p>
          <span class="resolved-at">解决于 {{ formatDateTime(card.resolvedAt) }}</span>
        </div>
      </article>

      <section class="page-section replies-section">
        <h2 class="page-section-title">经验回复 ({{ replies.length }})</h2>

        <div v-for="reply in replies" :key="reply.id" class="reply-item">
          <div class="reply-header">
            <span class="reply-author">{{ reply.authorNickname || '匿名' }}</span>
            <span>{{ formatDateTime(reply.createdAt) }}</span>
          </div>
          <div class="reply-body">
            <p><strong>当时情况：</strong>{{ reply.experienceSituation }}</p>
            <p><strong>我的行动：</strong>{{ reply.experienceAction }}</p>
            <p><strong>结果与反思：</strong>{{ reply.experienceResult }}</p>
          </div>
          <div class="reply-actions">
            <el-button size="small" text round @click="handleThankReply(reply.id)">
              <el-icon><Star /></el-icon>
              感谢 ({{ reply.thanksCount || 0 }})
            </el-button>
            <el-button
              v-if="reply.userId !== userStore.userId"
              size="small"
              text
              type="danger"
              round
              @click="openReport('REPLY', reply.id, `${reply.authorNickname || '用户'}的回复`)"
            >
              举报
            </el-button>
          </div>
        </div>

        <div v-if="replies.length === 0" class="empty-state inline-empty">
          <p>还没有回复，分享你的经验吧</p>
        </div>

        <div class="reply-form-block">
          <h3>分享你的经验</h3>
          <el-form :model="replyForm" label-position="top">
            <el-form-item label="当时情况（至少10字）">
              <el-input v-model="replyForm.experienceSituation" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="你的行动（至少10字）">
              <el-input v-model="replyForm.experienceAction" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="结果与反思（至少10字）">
              <el-input v-model="replyForm.experienceResult" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="回复类型">
              <el-radio-group v-model="replyForm.replyType">
                <el-radio value="EXPERIENCE" label="EXPERIENCE">经验分享</el-radio>
                <el-radio value="SUPPORT" label="SUPPORT">情感支持</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-button type="primary" :loading="replyLoading" @click="handleSubmitReply">提交回复</el-button>
          </el-form>
        </div>
      </section>
    </PageShell>

    <el-dialog v-model="resolveVisible" title="标记为已解决" width="480px">
      <el-input
        v-model="resolveContent"
        type="textarea"
        :rows="5"
        placeholder="描述你是如何解决这个困惑的（至少20字）"
      />
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResolve">确认</el-button>
      </template>
    </el-dialog>

    <ReportDialog
      v-model="reportVisible"
      :target-type="reportTarget.type"
      :target-id="reportTarget.id"
      :target-label="reportTarget.label"
    />

    <InviteUserDialog v-model="inviteVisible" :invitee="cardAuthor" />
  </div>
</template>

<style scoped>
.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.resolved-hero {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #059669;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-radius: var(--tondo-radius);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.card-header h1 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.status-badge {
  flex-shrink: 0;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #edf3ff, #e0eaff);
  color: var(--tondo-primary-dark);
}

.status-badge.resolved {
  background: #f0faf5;
  color: #2d9a6f;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 13px;
  font-weight: 500;
  color: var(--tondo-text-secondary);
  margin-bottom: 8px;
}

.detail-text {
  line-height: 1.7;
  font-size: 14px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--tondo-border);
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.resolution {
  background: var(--tondo-bg);
  padding: 16px;
  border-radius: var(--tondo-radius);
}

.resolved-at {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.reply-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--tondo-border);
}

.reply-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--tondo-text-secondary);
  margin-bottom: 8px;
}

.reply-author {
  font-weight: 500;
  color: var(--tondo-text);
}

.reply-body p {
  margin-bottom: 6px;
  line-height: 1.6;
  font-size: 14px;
}

.reply-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.inline-empty {
  padding: 24px 16px;
}

.reply-form-block {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--tondo-border);
}

.reply-form-block h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}
</style>
