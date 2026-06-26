<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  phone: '',
  password: '',
})

async function handleLogin() {
  if (!form.phone || !form.password) {
    ElMessage.warning('请填写手机号和密码')
    return
  }
  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch {
    /* handled by interceptor */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="logo-icon">T</span>
        <h1>欢迎回到 Tondo</h1>
        <p>在这里，困惑可以被倾听，陪伴可以被找到</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>

      <div class="auth-footer">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--tondo-sidebar-from) 0%, var(--tondo-sidebar-to) 100%);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 20px 50px rgba(15, 27, 51, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-accent) 100%);
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  color: #fff;
  margin-bottom: 14px;
  box-shadow: 0 6px 16px rgba(79, 140, 255, 0.35);
}

.auth-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.auth-header p {
  color: var(--tondo-text-secondary);
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 42px;
  margin-top: 8px;
  background: var(--tondo-primary);
  border-color: var(--tondo-primary);
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--tondo-text-secondary);
}
</style>
