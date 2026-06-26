<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { checkin, getCheckinStatus } from '@/api/companion'
import { parseDate } from '@/utils/date'

const props = defineProps({
  relationId: {
    type: Number,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['checked-in'])

const loading = ref(false)
const checkingIn = ref(false)
const status = ref(null)
const note = ref('')

function toDateKey(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : parseDate(date)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayKey = toDateKey(new Date())

const progressPercent = computed(() => {
  if (!status.value?.durationDays) return 0
  const elapsed = status.value.daysElapsed || 0
  return Math.min(100, Math.round((elapsed / status.value.durationDays) * 100))
})

const calendarDays = computed(() => {
  if (!status.value?.startedAt || !status.value?.durationDays) return []

  const start = parseDate(status.value.startedAt)
  if (!start) return []
  start.setHours(0, 0, 0, 0)
  const mySet = new Set((status.value.myCheckinDates || []).map((d) => d))
  const partnerSet = new Set((status.value.partnerCheckinDates || []).map((d) => d))
  const days = []

  for (let i = 0; i < status.value.durationDays; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = toDateKey(date)
    days.push({
      key,
      label: date.getDate(),
      mine: mySet.has(key),
      partner: partnerSet.has(key),
      future: key > todayKey,
    })
  }
  return days
})

async function loadStatus() {
  if (!props.relationId) return
  loading.value = true
  try {
    status.value = await getCheckinStatus(props.relationId)
  } catch {
    status.value = null
  } finally {
    loading.value = false
  }
}

async function handleCheckin() {
  checkingIn.value = true
  try {
    await checkin(props.relationId, note.value.trim() || undefined)
    ElMessage.success('打卡成功，继续保持！')
    note.value = ''
    await loadStatus()
    emit('checked-in')
  } finally {
    checkingIn.value = false
  }
}

watch(
  () => props.relationId,
  () => loadStatus(),
  { immediate: true },
)

onMounted(loadStatus)

defineExpose({ loadStatus })
</script>

<template>
  <div v-loading="loading" :class="['checkin-panel', { compact }]">
    <template v-if="status">
      <div class="countdown-row">
        <div class="countdown-main">
          <span class="countdown-num">{{ status.daysRemaining }}</span>
          <span class="countdown-label">天剩余</span>
        </div>
        <div class="countdown-meta">
          <div>已进行 {{ status.daysElapsed }} / {{ status.durationDays }} 天</div>
          <div v-if="status.myStreak > 0" class="streak">连续打卡 {{ status.myStreak }} 天</div>
        </div>
      </div>

      <el-progress
        :percentage="progressPercent"
        :stroke-width="8"
        :show-text="false"
        color="#e94560"
        style="margin-bottom: 12px"
      />

      <div v-if="!compact" class="stats-row">
        <span>我的打卡 {{ status.myTotalCheckins }} 次</span>
        <span>伙伴打卡 {{ status.partnerTotalCheckins }} 次</span>
        <span v-if="status.partnerCheckedInToday" class="partner-done">伙伴今日已打卡</span>
      </div>

      <div v-if="!compact" class="calendar">
        <div class="calendar-title">打卡日历</div>
        <div class="calendar-grid">
          <div
            v-for="day in calendarDays"
            :key="day.key"
            :class="[
              'calendar-cell',
              {
                mine: day.mine,
                partner: day.partner && !day.mine,
                both: day.mine && day.partner,
                future: day.future,
              },
            ]"
            :title="day.key"
          >
            {{ day.label }}
          </div>
        </div>
        <div class="calendar-legend">
          <span><i class="dot mine" />我</span>
          <span><i class="dot partner" />伙伴</span>
          <span><i class="dot both" />双方</span>
        </div>
      </div>

      <div class="checkin-action">
        <el-input
          v-if="!compact && !status.checkedInToday"
          v-model="note"
          placeholder="今日一句（可选）"
          maxlength="100"
          show-word-limit
          size="small"
          style="margin-bottom: 8px"
        />
        <el-button
          type="primary"
          :disabled="status.checkedInToday"
          :loading="checkingIn"
          @click="handleCheckin"
        >
          {{ status.checkedInToday ? '今日已打卡' : '今日打卡' }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.checkin-panel {
  padding: 16px;
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.06), rgba(99, 102, 241, 0.04));
  border-radius: 10px;
  border: 1px solid rgba(79, 140, 255, 0.15);
}

.checkin-panel.compact {
  padding: 12px;
}

.countdown-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.countdown-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.countdown-num {
  font-size: 32px;
  font-weight: 700;
  color: var(--tondo-primary);
  line-height: 1;
}

.compact .countdown-num {
  font-size: 24px;
}

.countdown-label {
  font-size: 13px;
  color: var(--tondo-text-secondary);
}

.countdown-meta {
  font-size: 13px;
  color: var(--tondo-text-secondary);
  line-height: 1.6;
}

.streak {
  color: #27ae60;
  font-weight: 500;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--tondo-text-secondary);
  margin-bottom: 12px;
}

.partner-done {
  color: #27ae60;
}

.calendar-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border-radius: 4px;
  background: #f0eeeb;
  color: var(--tondo-text-secondary);
}

.calendar-cell.mine {
  background: rgba(79, 140, 255, 0.35);
  color: var(--tondo-text);
  font-weight: 500;
}

.calendar-cell.partner {
  background: rgba(52, 152, 219, 0.35);
}

.calendar-cell.both {
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.5), rgba(52, 152, 219, 0.5));
  font-weight: 600;
}

.calendar-cell.future {
  opacity: 0.35;
}

.calendar-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--tondo-text-secondary);
  margin-bottom: 12px;
}

.calendar-legend .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

.calendar-legend .dot.mine {
  background: rgba(79, 140, 255, 0.5);
}

.calendar-legend .dot.partner {
  background: rgba(52, 152, 219, 0.5);
}

.calendar-legend .dot.both {
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.6), rgba(52, 152, 219, 0.6));
}

.checkin-action {
  display: flex;
  flex-direction: column;
}

.compact .checkin-action {
  flex-direction: row;
  align-items: center;
}
</style>
