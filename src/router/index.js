import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/CardListView.vue'),
      },
      {
        path: 'cards/create',
        name: 'card-create',
        component: () => import('@/views/CardCreateView.vue'),
      },
      {
        path: 'cards/:id',
        name: 'card-detail',
        component: () => import('@/views/CardDetailView.vue'),
      },
      {
        path: 'companion',
        name: 'companion',
        component: () => import('@/views/CompanionView.vue'),
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('@/views/ChatView.vue'),
      },
      {
        path: 'chat/:relationId',
        name: 'chat-room',
        component: () => import('@/views/ChatView.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
      },
      {
        path: 'admin/reports',
        name: 'admin-reports',
        component: () => import('@/views/AdminReportsView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/logs',
        name: 'admin-logs',
        component: () => import('@/views/AdminOperationLogsView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/AdminUsersView.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (userStore.token && !userStore.user) {
    try {
      await userStore.fetchUser()
    } catch (e) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        await userStore.logout()
      }
    }
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && userStore.isLoggedIn && userStore.user) {
    return { name: 'home' }
  }
  if (to.meta.requiresAdmin && userStore.user?.role !== 'ADMIN') {
    return { name: 'home' }
  }
})

export default router
