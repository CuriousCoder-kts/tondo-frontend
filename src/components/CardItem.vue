<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TagDisplay from './TagDisplay.vue'
import UserAvatar from './UserAvatar.vue'
import { parseJsonTags, NEED_TYPES, getDominantEmotionColor } from '@/utils/constants'
import { formatDate } from '@/utils/date'

const props = defineProps({
  card: { type: Object, required: true },
})

const router = useRouter()

const emotionTags = computed(() => parseJsonTags(props.card.emotionTags))
const confusionTags = computed(() => parseJsonTags(props.card.confusionTags))
const needLabel = computed(
  () => NEED_TYPES.find((n) => n.value === props.card.needType)?.label || props.card.needType,
)
const isResolved = computed(() => props.card.status === 'RESOLVED')
const accent = computed(() => getDominantEmotionColor(emotionTags.value))

const accentStyle = computed(() => {
  if (isResolved.value) return { '--card-accent': '#34d399' }
  if (!accent.value) return { '--card-accent': 'var(--tondo-primary)' }
  return { '--card-accent': accent.value.border }
})

function goDetail() {
  router.push({ name: 'card-detail', params: { id: props.card.id } })
}
</script>

<template>
  <article
    :class="['card-item page-section', { resolved: isResolved }]"
    :style="accentStyle"
    @click="goDetail"
  >
    <header class="card-header">
      <div class="author">
        <UserAvatar :name="card.authorNickname || '匿名'" :size="30" />
        <span class="author-name">{{ card.authorNickname || '匿名' }}</span>
        <span class="dot">·</span>
        <span class="post-time">{{ formatDate(card.createdAt) }}</span>
      </div>
      <span v-if="isResolved" class="status-tag resolved">已走出来</span>
    </header>

    <h3 class="card-title">{{ card.title || '无标题困惑' }}</h3>
    <p class="card-desc">{{ card.eventDescription }}</p>

    <div class="tags-row">
      <TagDisplay :tags="emotionTags" colored />
      <TagDisplay :tags="confusionTags" />
    </div>

    <footer class="card-footer">
      <span><el-icon><ChatLineRound /></el-icon> {{ card.replyCount || 0 }}</span>
      <span><el-icon><Star /></el-icon> {{ card.thanksCount || 0 }}</span>
      <span class="need">{{ needLabel }}</span>
    </footer>
  </article>
</template>

<style scoped>
.card-item {
  --card-accent: var(--tondo-primary);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.card-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--card-accent), var(--tondo-accent-light));
}

.card-item:hover {
  box-shadow: var(--tondo-shadow-hover);
  transform: translateY(-2px);
}

.card-item.resolved::before {
  background: linear-gradient(90deg, #34d399, #6ee7b7);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.author-name {
  font-weight: 600;
  color: var(--tondo-text);
}

.dot {
  opacity: 0.4;
}

.post-time {
  white-space: nowrap;
}

.status-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  flex-shrink: 0;
  font-weight: 500;
}

.status-tag.resolved {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  color: #059669;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-desc {
  color: var(--tondo-text-secondary);
  font-size: 14px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.tags-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.card-footer {
  display: flex;
  gap: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--tondo-border);
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.card-footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-footer .need {
  margin-left: auto;
  color: var(--tondo-primary-dark);
  font-weight: 500;
}

.card-footer .el-icon {
  font-size: 14px;
  color: var(--tondo-primary-light);
}
</style>
