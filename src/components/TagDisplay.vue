<script setup>
import { getEmotionColor } from '@/utils/constants'

defineProps({
  tags: { type: Array, default: () => [] },
  type: { type: String, default: '' },
  colored: { type: Boolean, default: false },
})
</script>

<template>
  <div class="tag-list">
    <template v-if="colored">
      <span
        v-for="tag in tags"
        :key="tag"
        class="emotion-tag"
        :style="{
          background: getEmotionColor(tag).bg,
          color: getEmotionColor(tag).text,
        }"
      >
        {{ tag }}
      </span>
    </template>
    <template v-else>
      <span v-for="tag in tags" :key="tag" class="plain-tag">{{ tag }}</span>
    </template>
  </div>
</template>

<style scoped>
.emotion-tag,
.plain-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.plain-tag {
  color: var(--tondo-primary-dark);
  background: linear-gradient(135deg, #edf3ff, #e0eaff);
}
</style>
