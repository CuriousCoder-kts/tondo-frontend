<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getSeekingPlans,
  getMyPlans,
  createPlan,
  inviteUser,
  respondInvitation,
  getPendingInvitations,
  getMatchCandidates,
} from '@/api/companion'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import {
  CONFUSION_TAGS,
  CHECKIN_FREQUENCIES,
  COMPANION_STYLES,
  PLAN_STATUS,
  RELATION_STATUS,
  parseJsonTags,
  toJsonTags,
} from '@/utils/constants'
import CheckinPanel from '@/components/CheckinPanel.vue'
import InviteUserDialog from '@/components/InviteUserDialog.vue'
import PageShell from '@/components/PageShell.vue'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()

const activeTab = ref('seeking')
const seekingPlans = ref([])
const myPlans = ref([])
const pendingInvitations = ref([])
const matchCandidates = ref([])
const loading = ref(false)
const matchLoading = ref(false)
const createVisible = ref(false)
const inviteVisible = ref(false)
const matchVisible = ref(false)
const invitePlanId = ref(null)
const matchPlanId = ref(null)

const createForm = reactive({
  title: '',
  goalDescription: '',
  confusionTags: [],
  durationDays: 21,
  checkinFrequency: 'DAILY',
  companionStylePreferred: 'ANY',
})

async function fetchSeekingPlans() {
  loading.value = true
  try {
    seekingPlans.value = await getSeekingPlans()
  } finally {
    loading.value = false
  }
}

async function fetchMyPlans() {
  loading.value = true
  try {
    myPlans.value = await getMyPlans()
  } finally {
    loading.value = false
  }
}

async function loadPendingInvitations() {
  pendingInvitations.value = await getPendingInvitations()
}

async function handleCreatePlan() {
  if (createForm.goalDescription.length < 20) {
    ElMessage.warning('目标描述至少20字')
    return
  }
  await createPlan({
    ...createForm,
    confusionTags: toJsonTags(createForm.confusionTags),
  })
  ElMessage.success('计划创建成功')
  createVisible.value = false
  activeTab.value = 'mine'
  fetchMyPlans()
}

function openInvite(planId = null) {
  invitePlanId.value = planId
  inviteVisible.value = true
}

function openGlobalInvite() {
  openInvite(null)
}

async function openMatch(planId) {
  matchPlanId.value = planId
  matchVisible.value = true
  matchLoading.value = true
  try {
    matchCandidates.value = await getMatchCandidates(planId)
  } finally {
    matchLoading.value = false
  }
}

async function inviteFromMatch(candidate) {
  await inviteUser({ planId: matchPlanId.value, inviteeId: candidate.userId })
  ElMessage.success(`已向 ${candidate.nickname} 发送邀请`)
  matchVisible.value = false
  await chatStore.fetchRelations()
}

async function handleRespond(relationId, accept) {
  const action = accept ? '接受' : '拒绝'
  await ElMessageBox.confirm(`确定${action}此邀请？`, '提示')
  await respondInvitation(relationId, accept)
  await chatStore.fetchRelations()
  await loadPendingInvitations()
  await notificationStore.fetchSummary()
  if (accept) {
    ElMessage.success('已接受邀请，可以开始私聊了')
    router.push({ name: 'chat-room', params: { relationId: String(relationId) } })
  } else {
    ElMessage.info('已拒绝邀请')
  }
}

function goChat(relationId) {
  router.push({ name: 'chat-room', params: { relationId: String(relationId) } })
}

function handleTabChange(tab) {
  if (tab === 'seeking') fetchSeekingPlans()
  else if (tab === 'mine') fetchMyPlans()
  else if (tab === 'invitations') loadPendingInvitations()
  else if (tab === 'relations') chatStore.fetchRelations()
}

const VALID_TABS = ['seeking', 'mine', 'invitations', 'relations']

function syncTabFromRoute() {
  const tab = route.query.tab
  if (typeof tab === 'string' && VALID_TABS.includes(tab)) {
    activeTab.value = tab
    handleTabChange(tab)
    return true
  }
  return false
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRoute()
  },
)

watch(
  () => notificationStore.pendingInvitations,
  () => {
    loadPendingInvitations()
  },
)

onMounted(async () => {
  await loadPendingInvitations()
  if (!syncTabFromRoute()) {
    if (pendingInvitations.value.length > 0) {
      activeTab.value = 'invitations'
    } else {
      fetchSeekingPlans()
    }
  }
  chatStore.fetchRelations()
})
</script>

<template>
  <PageShell
    title="陪伴计划"
    subtitle="创建计划，找到同路人"
  >
    <template #actions>
      <el-button round @click="openGlobalInvite">
        <el-icon><User /></el-icon>
        邀请陪伴
      </el-button>
      <el-button type="primary" @click="createVisible = true">
        <el-icon><Plus /></el-icon>
        创建计划
      </el-button>
    </template>

    <el-alert
      v-if="pendingInvitations.length > 0 && activeTab !== 'invitations'"
      type="warning"
      :closable="false"
      show-icon
      :title="`你有 ${pendingInvitations.length} 条待处理的陪伴邀请`"
    >
      <template #default>
        <el-button type="primary" size="small" link @click="activeTab = 'invitations'; loadPendingInvitations()">
          前往接受邀请
        </el-button>
      </template>
    </el-alert>

    <el-alert
      v-else
      type="info"
      :closable="false"
      show-icon
      title="如何邀请同路人？"
      description="先创建陪伴计划，再点击「邀请陪伴」：推荐输入对方的用户 ID（在「我的」页可查看）；也可按昵称搜索。"
    />

    <el-tabs v-model="activeTab" class="companion-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="招募中" name="seeking">
        <div v-loading="loading" class="page-stack">
          <article v-for="plan in seekingPlans" :key="plan.id" class="page-section plan-item">
            <header class="plan-header">
              <h3>{{ plan.title }}</h3>
              <span class="plan-status">{{ PLAN_STATUS[plan.status] }}</span>
            </header>
            <p class="plan-desc">{{ plan.goalDescription }}</p>
            <div class="tag-list plan-tags">
              <el-tag v-for="tag in parseJsonTags(plan.confusionTags)" :key="tag" size="small" round>
                {{ tag }}
              </el-tag>
            </div>
            <footer class="plan-meta">
              <span>周期 {{ plan.durationDays }} 天</span>
              <span>创建者 {{ plan.creatorNickname || `#${plan.creatorId}` }}</span>
            </footer>
          </article>
          <div v-if="!loading && seekingPlans.length === 0" class="empty-state">
            <p>暂无招募中的计划</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的计划" name="mine">
        <div v-loading="loading" class="page-stack">
          <article v-for="plan in myPlans" :key="plan.id" class="page-section plan-item">
            <header class="plan-header">
              <h3>{{ plan.title }}</h3>
              <span class="plan-status">{{ PLAN_STATUS[plan.status] }}</span>
            </header>
            <p class="plan-desc">{{ plan.goalDescription }}</p>
            <footer class="plan-meta">
              <span>周期 {{ plan.durationDays }} 天</span>
              <span>{{ plan.checkinFrequency === 'DAILY' ? '每日打卡' : '每周打卡' }}</span>
            </footer>
            <div class="plan-actions">
              <el-button
                v-if="plan.status === 'SEEKING' || plan.status === 'IN_PROGRESS'"
                size="small"
                round
                type="primary"
                @click="openMatch(plan.id)"
              >
                匹配推荐
              </el-button>
              <el-button
                v-if="plan.status === 'SEEKING' || plan.status === 'IN_PROGRESS'"
                size="small"
                round
                @click="openInvite(plan.id)"
              >
                邀请用户
              </el-button>
            </div>
          </article>
          <div v-if="!loading && myPlans.length === 0" class="empty-state">
            <p>你还没有创建计划</p>
            <div class="empty-actions">
              <el-button type="primary" round @click="createVisible = true">创建计划</el-button>
              <el-button round @click="openGlobalInvite">已有计划？去邀请</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="invitations">
        <template #label>
          待处理邀请
          <el-badge v-if="pendingInvitations.length" :value="pendingInvitations.length" class="badge" />
        </template>
        <div class="page-stack">
          <article v-for="rel in pendingInvitations" :key="rel.id" class="page-section plan-item">
            <header class="plan-header">
              <h3>{{ rel.planTitle || '陪伴邀请' }}</h3>
              <span class="plan-status warn">{{ RELATION_STATUS[rel.status] }}</span>
            </header>
            <footer class="plan-meta">
              <span>邀请人：{{ rel.inviterNickname }}</span>
            </footer>
            <div class="plan-actions">
              <el-button type="primary" size="small" round @click="handleRespond(rel.id, true)">接受</el-button>
              <el-button size="small" round @click="handleRespond(rel.id, false)">拒绝</el-button>
            </div>
          </article>
          <div v-if="pendingInvitations.length === 0" class="empty-state">
            <p>暂无待处理邀请</p>
            <p class="empty-hint">收到邀请时，铃铛通知里可直接「接受」或在此页查看</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的陪伴" name="relations">
        <div class="page-stack">
          <article v-for="rel in chatStore.chatableRelations" :key="rel.id" class="page-section plan-item">
            <header class="plan-header">
              <h3>{{ rel.planTitle || '陪伴关系' }}</h3>
              <span class="plan-status success">{{ RELATION_STATUS[rel.status] }}</span>
            </header>
            <footer class="plan-meta">
              <span>伙伴：{{ rel.partnerNickname }}</span>
              <span v-if="rel.daysRemaining != null">剩余 {{ rel.daysRemaining }} 天</span>
            </footer>
            <CheckinPanel
              :relation-id="rel.id"
              @checked-in="chatStore.fetchRelations()"
            />
            <div class="plan-actions">
              <el-button type="primary" size="small" round @click="goChat(rel.id)">进入私聊</el-button>
            </div>
          </article>
          <div v-if="chatStore.chatableRelations.length === 0" class="empty-state">
            <p>暂无进行中的陪伴关系</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建计划 -->
    <el-dialog v-model="createVisible" title="创建陪伴计划" width="560px">
      <el-form :model="createForm" label-position="top">
        <el-form-item label="计划标题">
          <el-input v-model="createForm.title" maxlength="100" />
        </el-form-item>
        <el-form-item label="目标描述（至少20字）">
          <el-input v-model="createForm.goalDescription" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="困惑领域">
          <el-checkbox-group v-model="createForm.confusionTags">
            <el-checkbox v-for="tag in CONFUSION_TAGS" :key="tag" :label="tag" />
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="持续天数">
          <el-input-number v-model="createForm.durationDays" :min="7" :max="90" />
        </el-form-item>
        <el-form-item label="打卡频率">
          <el-radio-group v-model="createForm.checkinFrequency">
            <el-radio v-for="item in CHECKIN_FREQUENCIES" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="偏好陪伴风格">
          <el-select v-model="createForm.companionStylePreferred">
            <el-option
              v-for="item in COMPANION_STYLES"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreatePlan">创建</el-button>
      </template>
    </el-dialog>

    <InviteUserDialog
      v-model="inviteVisible"
      :plan-id="invitePlanId"
      @success="chatStore.fetchRelations()"
    />

    <!-- 匹配推荐 -->
    <el-dialog v-model="matchVisible" title="同路人推荐" width="560px">
      <div v-loading="matchLoading">
        <div v-for="candidate in matchCandidates" :key="candidate.userId" class="match-item">
          <div class="match-info">
            <strong>{{ candidate.nickname }}</strong>
            <el-tag size="small" type="danger" style="margin-left: 8px">
              匹配度 {{ Math.round(candidate.matchScore * 100) }}%
            </el-tag>
            <p class="match-tags">
              共同标签：
              <el-tag v-for="tag in candidate.sharedTags" :key="tag" size="small" effect="plain">
                {{ tag }}
              </el-tag>
              <span v-if="!candidate.sharedTags?.length">暂无重叠</span>
            </p>
            <p class="match-meta">{{ candidate.statusLabel || '暂无状态' }}</p>
          </div>
          <el-button size="small" type="primary" @click="inviteFromMatch(candidate)">
            邀请 ID {{ candidate.userId }}
          </el-button>
        </div>
        <div v-if="!matchLoading && matchCandidates.length === 0" class="empty-state">
          <p>暂无匹配推荐，完善个人资料中的困惑标签可提高匹配效果</p>
        </div>
      </div>
    </el-dialog>
  </PageShell>
</template>

<style scoped>
.plan-item {
  position: relative;
  overflow: hidden;
}

.plan-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--tondo-primary), var(--tondo-accent-light));
  opacity: 0.6;
}

.companion-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.plan-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.plan-status {
  font-size: 12px;
  color: var(--tondo-text-secondary);
}

.plan-status.warn {
  color: #d48806;
}

.plan-status.success {
  color: #2d9a6f;
}

.plan-desc {
  color: var(--tondo-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  font-size: 14px;
}

.plan-tags {
  margin-bottom: 12px;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
  padding-top: 12px;
  border-top: 1px solid var(--tondo-border);
}

.plan-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-item :deep(.checkin-panel) {
  margin-top: 12px;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.badge {
  margin-left: 6px;
}

.match-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--tondo-border);
}

.match-tags {
  margin: 6px 0;
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.match-meta {
  font-size: 12px;
  color: var(--tondo-text-secondary);
}
</style>
