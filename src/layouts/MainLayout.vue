<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import UserAvatar from '@/components/UserAvatar.vue'

const userStore = useUserStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const ready = ref(false)

const isAdmin = computed(() => userStore.user?.role === 'ADMIN')

async function handleLogout() {
  await userStore.logout()
  router.replace({ name: 'login' })
}

onMounted(async () => {
  try {
    if (userStore.token && !userStore.user) {
      await userStore.fetchUser()
    }
    if (!userStore.user) return
    await chatStore.fetchRelations()
    await notificationStore.fetchSummary()
    chatStore.connect()
  } finally {
    ready.value = true
  }
})
</script>

<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo" @click="$router.push('/')">
        <div class="logo-mark">
          <span class="logo-mark-letter">T</span>
        </div>
        <div class="logo-brand">
          <span class="logo-text">Tondo</span>
          <span class="logo-tagline">困惑与陪伴</span>
        </div>
      </div>

      <el-menu
        :default-active="$route.path.startsWith('/chat') ? '/chat' : ($route.path.startsWith('/cards/') && $route.path !== '/cards/create' ? '/' : $route.path)"
        class="sidebar-menu"
        background-color="transparent"
        text-color="#b2bec3"
        active-text-color="#ffffff"
        @select="(path) => $router.push(path)"
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <span>困惑广场</span>
        </el-menu-item>
        <el-menu-item index="/cards/create">
          <el-icon><EditPen /></el-icon>
          <span>发布困惑</span>
        </el-menu-item>
        <el-menu-item index="/companion">
          <el-icon><UserFilled /></el-icon>
          <span class="menu-label">陪伴计划</span>
          <el-badge
            v-if="notificationStore.pendingInvitations > 0"
            :value="notificationStore.pendingInvitations"
            class="menu-badge"
          />
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span class="menu-label">私聊</span>
          <el-badge
            v-if="notificationStore.unreadMessages > 0"
            :value="notificationStore.unreadMessages"
            class="menu-badge"
          />
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/admin/reports">
          <el-icon><Warning /></el-icon>
          <span>举报管理</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/admin/users">
          <el-icon><Setting /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/admin/logs">
          <el-icon><Document /></el-icon>
          <span>操作日志</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <div
          class="user-info"
          :class="{ active: $route.path === '/profile' }"
          @click="router.push('/profile')"
        >
          <UserAvatar
            :src="userStore.user?.avatarUrl"
            :name="userStore.user?.nickname"
            :size="36"
          />
          <div class="user-meta">
            <div class="user-name">{{ userStore.user?.nickname || '用户' }}</div>
            <div class="ws-status">
              <span :class="['dot', chatStore.connected ? 'online' : 'offline']" />
              {{ chatStore.connected ? '在线' : '离线' }}
            </div>
          </div>
        </div>
        <el-button text type="danger" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出
        </el-button>
      </div>
    </el-aside>

    <el-main class="main-content">
      <div class="main-content-inner">
        <router-view v-if="ready" />
        <div v-else v-loading="true" class="loading-placeholder" />
      </div>
    </el-main>

    <nav class="mobile-nav">
      <button
        :class="['mobile-nav-item', { active: $route.path === '/' }]"
        @click="$router.push('/')"
      >
        <el-icon><House /></el-icon>
        广场
      </button>
      <button
        :class="['mobile-nav-item', { active: $route.path.startsWith('/companion') }]"
        @click="$router.push('/companion')"
      >
        <el-icon><UserFilled /></el-icon>
        陪伴
      </button>
      <button
        :class="['mobile-nav-item', { active: $route.path.startsWith('/chat') }]"
        @click="$router.push('/chat')"
      >
        <el-icon><ChatDotRound /></el-icon>
        私聊
      </button>
      <button
        :class="['mobile-nav-item', { active: $route.path === '/profile' }]"
        @click="$router.push('/profile')"
      >
        <el-icon><Avatar /></el-icon>
        我的
      </button>
    </nav>
  </el-container>
</template>

<style scoped>
.main-layout {
  height: 100%;
}

.sidebar {
  background: linear-gradient(180deg, var(--tondo-sidebar-from) 0%, var(--tondo-sidebar-to) 100%);
  display: flex;
  flex-direction: column;
  border-right: none;
  position: relative;
  overflow: hidden;
}

.sidebar::after {
  content: '';
  position: absolute;
  top: -80px;
  right: -80px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 140, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 18px;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.9;
}

.logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, #6ba3ff 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow:
    0 4px 14px rgba(79, 140, 255, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  position: relative;
  overflow: hidden;
}

.logo-mark::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.logo-mark-letter {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.logo-brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.logo-tagline {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
  font-weight: 400;
  line-height: 1.2;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
}

.sidebar-menu .el-menu-item {
  margin: 4px 12px;
  border-radius: 8px;
  height: 44px;
  display: flex;
  align-items: center;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(90deg, rgba(79, 140, 255, 0.25) 0%, rgba(99, 102, 241, 0.12) 100%) !important;
  font-weight: 600;
}

.sidebar-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.06) !important;
}

.menu-label {
  flex: 1;
}

.menu-badge {
  margin-left: auto;
}

.menu-badge :deep(.el-badge__content) {
  border: none;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.06);
}

.user-info.active {
  background: rgba(79, 140, 255, 0.18);
}

.user-avatar {
  background: var(--tondo-primary);
  color: #fff;
  font-weight: 600;
}

.user-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.ws-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #636e72;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot.online {
  background: #00b894;
}

.dot.offline {
  background: #636e72;
}

.main-content {
  padding: 20px 24px 32px;
  overflow-y: auto;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(79, 140, 255, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 45%),
    var(--tondo-bg);
}

.main-content-inner {
  width: 100%;
}

.loading-placeholder {
  min-height: 400px;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100% !important;
    flex-direction: row;
    flex-wrap: wrap;
    padding-bottom: 0;
  }

  .logo {
    padding: 12px 16px;
  }

  .sidebar-menu {
    display: none;
  }

  .sidebar-footer {
    display: none;
  }

  .main-content {
    padding: 16px;
    padding-bottom: 72px;
  }

  .main-content-inner {
    max-width: none;
  }

  .mobile-nav {
    display: flex;
  }
}

.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, var(--tondo-sidebar-from) 0%, var(--tondo-sidebar-to) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 100;
  justify-content: space-around;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #b2bec3;
  font-size: 11px;
  cursor: pointer;
  padding: 4px 12px;
  border: none;
  background: none;
}

.mobile-nav-item.active {
  color: #fff;
}

.mobile-nav-item .el-icon {
  font-size: 22px;
}
</style>
