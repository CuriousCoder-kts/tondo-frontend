<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyPlans, inviteUser } from '@/api/companion'
import { lookupUser, searchUsers } from '@/api/user'
import { useChatStore } from '@/stores/chat'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  invitee: {
    type: Object,
    default: null,
  },
  planId: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'success'])

const chatStore = useChatStore()
const loading = ref(false)
const submitting = ref(false)
const lookupLoading = ref(false)
const searchLoading = ref(false)
const inviteMode = ref('id')

const plans = ref([])
const selectedPlanId = ref(null)
const inviteeUserId = ref('')
const nicknameKeyword = ref('')
const resolvedUser = ref(null)
const searchResults = ref([])
const selectedSearchUserId = ref(null)

const visible = ref(false)

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      initDialog()
    }
  },
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

async function initDialog() {
  loading.value = true
  resolvedUser.value = null
  inviteeUserId.value = ''
  nicknameKeyword.value = ''
  searchResults.value = []
  selectedSearchUserId.value = null
  selectedPlanId.value = props.planId || null
  inviteMode.value = props.invitee?.id ? 'id' : 'id'

  try {
    const allPlans = await getMyPlans()
    plans.value = allPlans.filter((p) => p.status === 'SEEKING' || p.status === 'IN_PROGRESS')
    if (!selectedPlanId.value && plans.value.length === 1) {
      selectedPlanId.value = plans.value[0].id
    }
    if (props.invitee?.id) {
      inviteeUserId.value = String(props.invitee.id)
      await lookupById()
    }
  } finally {
    loading.value = false
  }
}

async function lookupById() {
  const id = Number(inviteeUserId.value)
  if (!id || id <= 0) {
    ElMessage.warning('请输入有效的用户 ID')
    return
  }
  lookupLoading.value = true
  resolvedUser.value = null
  try {
    resolvedUser.value = await lookupUser(id)
  } catch {
    resolvedUser.value = null
  } finally {
    lookupLoading.value = false
  }
}

async function handleNicknameSearch() {
  const keyword = nicknameKeyword.value.trim()
  if (!keyword) {
    ElMessage.warning('请输入昵称关键词')
    return
  }
  searchLoading.value = true
  selectedSearchUserId.value = null
  try {
    searchResults.value = await searchUsers(keyword)
    if (searchResults.value.length === 0) {
      ElMessage.info('未找到匹配用户，建议让对方在「我的」页查看用户 ID 后按 ID 邀请')
    }
  } finally {
    searchLoading.value = false
  }
}

function selectSearchUser(user) {
  selectedSearchUserId.value = user.id
  resolvedUser.value = user
  inviteeUserId.value = String(user.id)
}

function getInviteeId() {
  if (inviteMode.value === 'id') {
    return resolvedUser.value?.id || null
  }
  return selectedSearchUserId.value || resolvedUser.value?.id || null
}

async function handleSubmit() {
  if (!selectedPlanId.value) {
    ElMessage.warning('请选择要关联的陪伴计划')
    return
  }
  const inviteeId = getInviteeId()
  if (!inviteeId) {
    ElMessage.warning(inviteMode.value === 'id' ? '请先查找并确认用户' : '请选择一位用户')
    return
  }
  submitting.value = true
  try {
    await inviteUser({
      planId: selectedPlanId.value,
      inviteeId,
    })
    const name = resolvedUser.value?.nickname || `用户${inviteeId}`
    ElMessage.success(`已向 ${name}（ID: ${inviteeId}）发送陪伴邀请`)
    await chatStore.fetchRelations()
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="邀请用户陪伴"
    width="520px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading">
      <el-alert
        v-if="!loading && plans.length === 0"
        type="info"
        :closable="false"
        show-icon
        title="还没有可邀请的计划"
        description="请先创建一个陪伴计划，再发出邀请。"
        style="margin-bottom: 16px"
      />

      <el-form label-position="top">
        <el-form-item label="选择计划" required>
          <el-select
            v-model="selectedPlanId"
            placeholder="选择你的陪伴计划"
            style="width: 100%"
            :disabled="plans.length === 0"
          >
            <el-option
              v-for="plan in plans"
              :key="plan.id"
              :label="plan.title"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="邀请方式" required>
          <el-radio-group v-model="inviteMode" :disabled="plans.length === 0">
            <el-radio value="id">按用户 ID（推荐）</el-radio>
            <el-radio value="nickname">按昵称搜索</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="inviteMode === 'id'">
          <el-form-item label="用户 ID" required>
            <div class="id-row">
              <el-input
                v-model="inviteeUserId"
                placeholder="输入对方的用户 ID，如 2"
                :disabled="plans.length === 0"
                @keyup.enter="lookupById"
              />
              <el-button
                type="primary"
                :loading="lookupLoading"
                :disabled="plans.length === 0"
                @click="lookupById"
              >
                查找
              </el-button>
            </div>
            <p class="field-hint">对方可在「我的」页面查看自己的用户 ID</p>
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="昵称关键词">
            <div class="id-row">
              <el-input
                v-model="nicknameKeyword"
                placeholder="输入昵称的一部分"
                :disabled="plans.length === 0"
                @keyup.enter="handleNicknameSearch"
              />
              <el-button
                :loading="searchLoading"
                :disabled="plans.length === 0"
                @click="handleNicknameSearch"
              >
                搜索
              </el-button>
            </div>
          </el-form-item>
          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="user in searchResults"
              :key="user.id"
              :class="['search-item', { active: selectedSearchUserId === user.id }]"
              @click="selectSearchUser(user)"
            >
              <strong>{{ user.nickname }}</strong>
              <span class="user-id">ID: {{ user.id }}</span>
              <span class="user-meta">{{ user.statusLabel || '暂无状态' }}</span>
            </div>
          </div>
        </template>

        <div v-if="resolvedUser" class="user-preview">
          <div class="preview-title">邀请对象</div>
          <div><strong>{{ resolvedUser.nickname }}</strong>（ID: {{ resolvedUser.id }}）</div>
          <div class="user-meta">{{ resolvedUser.statusLabel || '暂无状态' }}</div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="plans.length === 0 || !getInviteeId()"
        @click="handleSubmit"
      >
        发送邀请
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.id-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--tondo-text-secondary);
}

.search-results {
  margin-bottom: 12px;
  border: 1px solid var(--tondo-border);
  border-radius: 8px;
  overflow: hidden;
}

.search-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--tondo-border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover,
.search-item.active {
  background: rgba(79, 140, 255, 0.08);
}

.user-id {
  font-size: 12px;
  color: var(--tondo-primary);
}

.user-meta {
  font-size: 12px;
  color: var(--tondo-text-secondary);
}

.user-preview {
  padding: 12px;
  background: var(--tondo-bg);
  border-radius: 8px;
  border: 1px solid var(--tondo-border);
}

.preview-title {
  font-size: 12px;
  color: var(--tondo-text-secondary);
  margin-bottom: 6px;
}
</style>
