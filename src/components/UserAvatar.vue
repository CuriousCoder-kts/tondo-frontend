<script setup>
import { computed } from 'vue'
import { resolveMediaUrl } from '@/utils/media'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: 'U' },
  size: { type: Number, default: 36 },
  cacheKey: { type: [String, Number], default: '' },
})

const initial = computed(() => (props.name?.charAt(0) || 'U').toUpperCase())

const imageSrc = computed(() => resolveMediaUrl(props.src, props.cacheKey))
</script>

<template>
  <el-avatar :size="size" :src="imageSrc || undefined" class="user-avatar">
    {{ initial }}
  </el-avatar>
</template>

<style scoped>
.user-avatar {
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-accent) 100%);
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar :deep(img) {
  object-fit: cover;
}
</style>
