<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPendingReports, handleReport } from '@/api/admin'
import { formatDateTime } from '@/utils/date'
import PageShell from '@/components/PageShell.vue'
import { REPORT_TARGET_TYPES, REPORT_REASONS, ADMIN_ACTIONS } from '@/utils/constants'

const loading = ref(false)
const reports = ref([])

async function fetchReports() {
  loading.value = true
  try {
    const list = await getPendingReports()
    reports.value = Array.isArray(list) ? list : []
  } catch {
    reports.value = []
  } finally {
    loading.value = false
  }
}

function reasonLabel(value) {
  return REPORT_REASONS.find((r) => r.value === value)?.label || value
}

function targetTypeLabel(value) {
  return REPORT_TARGET_TYPES[value] || value
}

async function doHandle(report, action) {
  if (!report?.id) {
    ElMessage.error('举报数据异常，请刷新后重试')
    return
  }
  const actionLabel = ADMIN_ACTIONS.find((a) => a.value === action)?.label || action
  await ElMessageBox.confirm(`确定执行「${actionLabel}」？`, '处理举报', { type: 'warning' })
  await handleReport(report.id, { action, handleResult: actionLabel })
  ElMessage.success('处理完成')
  fetchReports()
}

onMounted(fetchReports)
</script>

<template>
  <PageShell title="举报管理" subtitle="审核待处理举报">
    <template #actions>
      <el-button @click="fetchReports">刷新</el-button>
    </template>

    <div v-loading="loading" class="page-stack">
      <article v-for="report in reports" :key="report.id" class="page-section report-item">
        <div class="report-meta">
          <span class="type-tag">{{ targetTypeLabel(report.targetType) }}</span>
          <span class="report-id">#{{ report.id }}</span>
          <span class="sep">·</span>
          <span>{{ formatDateTime(report.createdAt) }}</span>
        </div>

        <p class="report-summary">{{ report.targetSummary || '（无摘要）' }}</p>

        <div class="report-info">
          <span>举报人：{{ report.reporterNickname || '未知' }}</span>
          <span>原因：{{ reasonLabel(report.reason) }}</span>
          <span v-if="report.targetId">目标 ID：{{ report.targetId }}</span>
        </div>

        <p v-if="report.description" class="report-desc">{{ report.description }}</p>

        <div class="report-actions">
          <el-button size="small" @click="doHandle(report, 'DISMISS')">驳回</el-button>
          <el-button size="small" type="warning" @click="doHandle(report, 'HIDE_CONTENT')">隐藏内容</el-button>
          <el-button size="small" type="danger" @click="doHandle(report, 'FREEZE_USER')">冻结账号</el-button>
        </div>
      </article>

      <div v-if="!loading && reports.length === 0" class="empty-state">
        <p>暂无待处理举报</p>
      </div>
    </div>
  </PageShell>
</template>

<style scoped>
.report-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
  margin-bottom: 10px;
}

.type-tag {
  font-weight: 500;
  color: var(--tondo-text);
}

.report-id {
  color: var(--tondo-text-secondary);
}

.sep {
  color: var(--tondo-border);
}

.report-summary {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4fa 100%);
  border-radius: 8px;
  border-left: 3px solid var(--tondo-primary);
}

.report-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--tondo-text-secondary);
  margin-bottom: 8px;
}

.report-desc {
  font-size: 13px;
  color: var(--tondo-text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.report-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid var(--tondo-border);
}
</style>
