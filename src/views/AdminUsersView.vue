<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchUsers } from '@/api/user'
import { updateUserStatus, updateUserRole } from '@/api/admin'
import UserAvatar from '@/components/UserAvatar.vue'
import PageShell from '@/components/PageShell.vue'

const keyword = ref('')
const loading = ref(false)
const users = ref([])

async function handleSearch() {
  const q = keyword.value.trim()
  if (!q) {
    ElMessage.warning('请输入用户 ID 或昵称')
    return
  }
  loading.value = true
  try {
    const list = await searchUsers(q)
    users.value = list.map((u) => ({
      ...u,
      _frozen: u.isFrozen === 1,
      _role: u.role || 'USER',
    }))
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

async function toggleFreeze(user) {
  const frozen = !user._frozen
  const action = frozen ? '冻结' : '解冻'
  try {
    await ElMessageBox.confirm(`确定${action}用户「${user.nickname}」？`, '用户管理', { type: 'warning' })
    await updateUserStatus(user.id, frozen)
    user._frozen = frozen
    ElMessage.success(`已${action}`)
  } catch {
    /* cancelled */
  }
}

async function changeRole(user, role) {
  try {
    await ElMessageBox.confirm(`确定将「${user.nickname}」设为 ${role}？`, '用户管理', { type: 'warning' })
    await updateUserRole(user.id, role)
    user._role = role
    ElMessage.success('角色已更新')
  } catch {
    /* cancelled */
  }
}

function displayRole(user) {
  return user._role || 'USER'
}
</script>

<template>
  <PageShell title="用户管理" subtitle="搜索并管理用户">
    <div class="page-toolbar">
      <el-input
        v-model="keyword"
        placeholder="输入用户 ID 或昵称搜索"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
    </div>

    <div v-loading="loading" class="page-stack">
      <article v-for="user in users" :key="user.id" class="page-section user-item">
        <div class="user-main">
          <UserAvatar :src="user.avatarUrl" :name="user.nickname" :size="52" />
          <div class="user-info">
            <div class="name-row">
              <span class="name">{{ user.nickname }}</span>
              <span :class="['role-badge', displayRole(user).toLowerCase()]">
                {{ displayRole(user) }}
              </span>
              <span v-if="user._frozen" class="frozen-badge">已冻结</span>
            </div>
            <div class="meta">ID {{ user.id }} · 信任 Lv.{{ user.trustLevel || 1 }}</div>
            <div v-if="user.statusLabel" class="status-label">{{ user.statusLabel }}</div>
          </div>
        </div>
        <div class="user-actions">
          <el-button size="small" @click="toggleFreeze(user)">
            {{ user._frozen ? '解冻账号' : '冻结账号' }}
          </el-button>
          <el-button
            v-if="displayRole(user) !== 'ADMIN'"
            size="small"
            round
            type="warning"
            @click="changeRole(user, 'ADMIN')"
          >
            设为管理员
          </el-button>
          <el-button
            v-else
            size="small"
            round
            @click="changeRole(user, 'USER')"
          >
            设为普通用户
          </el-button>
        </div>
      </article>

      <div v-if="!loading && users.length === 0" class="empty-state">
        <el-icon><Search /></el-icon>
        <p>搜索用户以进行管理操作</p>
      </div>
    </div>
  </PageShell>
</template>

<style scoped>
.search-input {
  flex: 1;
  max-width: 360px;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 200px;
}

.user-info {
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.name {
  font-weight: 600;
  font-size: 15px;
}

.role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--tondo-bg);
  color: var(--tondo-text-secondary);
}

.role-badge.admin {
  color: var(--tondo-primary-dark);
  background: linear-gradient(135deg, #edf3ff, #e0eaff);
}

.frozen-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fef2f2;
  color: #c0392b;
}

.meta {
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.status-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--tondo-text);
}

.user-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .user-card {
    flex-direction: column;
    align-items: stretch;
  }

  .user-actions {
    justify-content: stretch;
  }

  .user-actions .el-button {
    flex: 1;
  }
}
</style>
