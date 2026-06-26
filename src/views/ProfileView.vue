<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { updateProfile } from '@/api/user'
import { uploadAvatar } from '@/api/file'
import UserAvatar from '@/components/UserAvatar.vue'
import PageShell from '@/components/PageShell.vue'
import { formatDateTime } from '@/utils/date'
import {
  CONFUSION_TAGS,
  COMPANION_STYLES,
  parseJsonTags,
  toJsonTags,
} from '@/utils/constants'

const userStore = useUserStore()
const editing = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const avatarCacheKey = ref('')

const form = reactive({
  statusLabel: '',
  confusionTags: [],
  companionStyle: 'ANY',
})

function startEdit() {
  const user = userStore.user
  form.statusLabel = user.statusLabel || ''
  form.confusionTags = parseJsonTags(user.confusionTags)
  form.companionStyle = user.companionStyle || 'ANY'
  editing.value = true
}

async function handleSave() {
  saving.value = true
  try {
    await updateProfile({
      statusLabel: form.statusLabel,
      confusionTags: toJsonTags(form.confusionTags),
      companionStyle: form.companionStyle,
    })
    await userStore.fetchUser()
    ElMessage.success('资料已更新')
    editing.value = false
  } finally {
    saving.value = false
  }
}

async function handleAvatarChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return
  }
  uploadingAvatar.value = true
  try {
    const result = await uploadAvatar(file)
    avatarCacheKey.value = Date.now()
    if (userStore.user && result?.url) {
      userStore.user.avatarUrl = result.url
    }
    await userStore.fetchUser()
    ElMessage.success('头像已更新')
  } catch (e) {
    ElMessage.error(e?.message || '头像上传失败')
  } finally {
    uploadingAvatar.value = false
  }
}

function copyUserId() {
  const id = userStore.user?.id
  if (!id) return
  navigator.clipboard.writeText(String(id)).then(() => {
    ElMessage.success('用户 ID 已复制')
  }).catch(() => {
    ElMessage.info(`你的用户 ID：${id}`)
  })
}

const showMatchTip = computed(() => {
  const user = userStore.user
  if (!user) return false
  const hasTags = parseJsonTags(user.confusionTags).length > 0
  const hasStyle = !!user.companionStyle
  return !hasTags || !hasStyle
})

const profileReadyForMatch = computed(() => !showMatchTip.value && !!userStore.user)

onMounted(() => {
  userStore.fetchUser()
})
</script>

<template>
  <PageShell title="我的" subtitle="个人资料与匹配信息">
    <template #actions>
      <el-button v-if="!editing" type="primary" @click="startEdit">编辑资料</el-button>
    </template>

    <div v-if="userStore.user" class="page-stack">
      <section class="profile-hero page-section">
        <div class="profile-top">
          <div class="avatar-block">
            <UserAvatar
              :src="userStore.user.avatarUrl"
              :name="userStore.user.nickname"
              :size="64"
              :cache-key="avatarCacheKey"
            />
            <el-upload
              :show-file-list="false"
              accept="image/jpeg,image/png,image/webp,image/gif"
              :auto-upload="false"
              :disabled="uploadingAvatar"
              @change="handleAvatarChange"
            >
              <el-button size="small" :loading="uploadingAvatar">更换头像</el-button>
            </el-upload>
          </div>
          <div class="profile-info">
            <h2>{{ userStore.user.nickname }}</h2>
            <p class="phone">{{ userStore.user.phone }}</p>
            <span class="trust-badge">信任等级 Lv.{{ userStore.user.trustLevel }}</span>
          </div>
        </div>
      </section>

      <section v-if="!editing" class="page-section">
        <h3 class="page-section-title">账号信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">用户 ID</span>
            <span class="value user-id-row">
              <strong>{{ userStore.user.id }}</strong>
              <el-button size="small" text type="primary" @click="copyUserId">复制</el-button>
            </span>
          </div>
          <div class="info-item">
            <span class="label">状态标签</span>
            <span class="value">{{ userStore.user.statusLabel || '未设置' }}</span>
          </div>
          <div class="info-item">
            <span class="label">陪伴风格</span>
            <span class="value">
              {{ COMPANION_STYLES.find(s => s.value === userStore.user.companionStyle)?.label || '未设置' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">注册时间</span>
            <span class="value">{{ formatDateTime(userStore.user.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">最近更新</span>
            <span class="value">{{ formatDateTime(userStore.user.updatedAt) }}</span>
          </div>
          <div class="info-item span-full">
            <span class="label">困惑标签</span>
            <div class="tag-list">
              <el-tag
                v-for="tag in parseJsonTags(userStore.user.confusionTags)"
                :key="tag"
                size="small"
                round
              >
                {{ tag }}
              </el-tag>
              <span v-if="!parseJsonTags(userStore.user.confusionTags).length" class="value muted">未设置</span>
            </div>
          </div>
        </div>

        <div class="id-tip">
          好友可通过你的<strong>用户 ID</strong>在「陪伴计划 → 邀请陪伴」中邀请你。
        </div>

        <div v-if="showMatchTip" class="tip-box">
          <el-icon><InfoFilled /></el-icon>
          <span>完善困惑标签和陪伴风格，可提高「同路人匹配」的准确度。</span>
        </div>
        <div v-else-if="profileReadyForMatch" class="tip-box tip-box--success">
          <el-icon><CircleCheckFilled /></el-icon>
          <span>匹配资料已完善，可在陪伴计划中使用「同路人推荐」。</span>
        </div>
      </section>

      <section v-else class="page-section">
        <h3 class="page-section-title">编辑资料</h3>
        <el-form :model="form" label-position="top" class="edit-form">
          <el-form-item label="一句话状态">
            <el-input v-model="form.statusLabel" placeholder="如：正在跨行求职中" maxlength="50" />
          </el-form-item>
          <el-form-item label="我的困惑领域（用于匹配）">
            <el-checkbox-group v-model="form.confusionTags">
              <el-checkbox v-for="tag in CONFUSION_TAGS" :key="tag" :label="tag" />
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="偏好陪伴风格">
            <el-radio-group v-model="form.companionStyle">
              <el-radio v-for="item in COMPANION_STYLES" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <div class="edit-actions">
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
            <el-button round @click="editing = false">取消</el-button>
          </div>
        </el-form>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.profile-top {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.profile-info h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.phone {
  color: var(--tondo-text-secondary);
  font-size: 14px;
  margin-bottom: 10px;
}

.trust-badge {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #edf3ff, #e0eaff);
  color: var(--tondo-primary-dark);
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4fa 100%);
  border-radius: var(--tondo-radius);
  border: 1px solid var(--tondo-border);
}

.info-item.span-full {
  grid-column: 1 / -1;
}

.info-item .label {
  font-size: 12px;
  color: var(--tondo-text-secondary);
}

.info-item .value {
  font-size: 14px;
  font-weight: 600;
}

.info-item .value.muted {
  font-weight: 400;
  color: var(--tondo-text-secondary);
}

.user-id-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.edit-form {
  max-width: 560px;
}

.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.id-tip {
  margin-top: 20px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
  line-height: 1.6;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 14px 16px;
  background: #fff8f0;
  border-radius: var(--tondo-radius-sm);
  border: 1px solid #ffe0b2;
  font-size: 14px;
  color: #e65100;
}

.tip-box--success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

@media (max-width: 640px) {
  .profile-top {
    flex-direction: column;
    text-align: center;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
