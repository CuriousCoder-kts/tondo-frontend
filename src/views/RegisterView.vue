<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCommunityRule } from '@/api/user'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const ruleLoading = ref(true)
const communityRule = ref(null)

const form = reactive({
  phone: '',
  password: '',
  nickname: '',
  acceptCommunityRule: false,
})

onMounted(async () => {
  try {
    communityRule.value = await getCommunityRule()
  } catch {
    communityRule.value = {
      title: 'Tondo 社区公约',
      content: '欢迎加入 Tondo。请尊重他人、真实表达、拒绝骚扰，共建温暖克制的社区氛围。',
    }
  } finally {
    ruleLoading.value = false
  }
})

async function handleRegister() {
  if (!form.phone || !form.password || !form.nickname) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (!form.acceptCommunityRule) {
    ElMessage.warning('请阅读并同意社区公约')
    return
  }
  loading.value = true
  try {
    await userStore.register({ ...form })
    ElMessage.success('注册成功，请登录')
    router.push({ name: 'login' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card auth-card--wide">
      <div class="auth-header">
        <span class="logo-icon">T</span>
        <h1>加入 Tondo</h1>
        <p>分享困惑，收获理解与陪伴</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent="handleRegister">
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="11位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="你的昵称（唯一）" maxlength="20" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="设置密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="社区公约">
          <div v-loading="ruleLoading" class="rule-box">
            <h4>{{ communityRule?.title || 'Tondo 社区公约' }}</h4>
            <pre class="rule-content">{{ communityRule?.content }}</pre>
          </div>
          <el-checkbox v-model="form.acceptCommunityRule" class="rule-check">
            我已阅读并同意《社区公约》，承诺共建温暖、克制的社区氛围
          </el-checkbox>
        </el-form-item>

        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleRegister">
          注册
        </el-button>
      </el-form>

      <div class="auth-footer">
        已有账号？
        <router-link to="/login">去登录</router-link>
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

.auth-card--wide {
  max-width: 520px;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
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

.rule-box {
  background: var(--tondo-bg);
  border: 1px solid var(--tondo-border);
  border-radius: var(--tondo-radius);
  padding: 16px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.rule-box h4 {
  margin-bottom: 8px;
  font-size: 15px;
}

.rule-content {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: var(--tondo-text-secondary);
  margin: 0;
}

.rule-check {
  align-items: flex-start;
  height: auto;
  white-space: normal;
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
