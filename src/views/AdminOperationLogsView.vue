<script setup>
import { ref, onMounted } from 'vue'
import { getOperationLogs } from '@/api/admin'
import { formatDateTime } from '@/utils/date'
import PageShell from '@/components/PageShell.vue'

const loading = ref(false)
const logs = ref([])

async function fetchLogs() {
  loading.value = true
  try {
    logs.value = await getOperationLogs({ page: 1, size: 50 })
  } catch {
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>

<template>
  <PageShell title="操作日志" subtitle="管理员操作审计记录">
    <template #actions>
      <el-button @click="fetchLogs">刷新</el-button>
    </template>

    <div v-loading="loading" class="page-section page-section--flush">
      <el-table :data="logs" empty-text="暂无日志" style="width: 100%">
        <el-table-column prop="id" label="ID" width="64" />
        <el-table-column prop="operatorId" label="操作人" width="80" />
        <el-table-column prop="action" label="动作" min-width="140" />
        <el-table-column prop="targetType" label="目标类型" width="96" />
        <el-table-column prop="targetId" label="目标 ID" width="80" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="120" />
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </PageShell>
</template>
