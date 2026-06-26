<script setup>
import { useRouter } from 'vue-router'
import NotificationBell from '@/components/NotificationBell.vue'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  /** 仅私聊等全宽页面使用 */
  full: { type: Boolean, default: false },
  /** 显示返回按钮 */
  back: { type: Boolean, default: false },
})

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <div :class="['page-shell', { 'page-shell--full': full }]">
    <header class="page-shell-header">
      <div class="page-shell-header-inner">
        <div class="page-shell-heading-block">
          <button v-if="back" type="button" class="page-back" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回</span>
          </button>

          <div
            v-if="title || subtitle || $slots.header"
            class="page-shell-heading"
          >
            <slot name="header">
              <h1 v-if="title" class="page-title">{{ title }}</h1>
              <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
            </slot>
          </div>
        </div>

        <div class="page-shell-actions">
          <slot name="actions" />
          <NotificationBell />
        </div>
      </div>
    </header>

    <div class="page-shell-body">
      <slot />
    </div>
  </div>
</template>
