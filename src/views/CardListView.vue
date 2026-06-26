<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCards } from '@/api/card'
import CardItem from '@/components/CardItem.vue'
import PageShell from '@/components/PageShell.vue'
import { CONFUSION_TAGS } from '@/utils/constants'

const router = useRouter()
const cards = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(10)
const confusionTag = ref('')
const sort = ref('new')

async function fetchCards() {
  loading.value = true
  try {
    const data = await getCards({
      page: page.value,
      size: size.value,
      confusionTag: confusionTag.value || undefined,
      sort: sort.value,
    })
    cards.value = data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  page.value = 1
  fetchCards()
}

function handlePageChange(p) {
  page.value = p
  fetchCards()
}

onMounted(fetchCards)
</script>

<template>
  <PageShell
    title="困惑广场"
    subtitle="分享困惑，收获陪伴与经验"
  >
    <template #actions>
      <el-button type="primary" @click="router.push('/cards/create')">
        <el-icon><EditPen /></el-icon>
        发布困惑
      </el-button>
    </template>

    <div class="page-toolbar">
      <el-select
        v-model="confusionTag"
        placeholder="筛选领域"
        clearable
        class="filter-select"
        @change="handleFilter"
      >
        <el-option v-for="tag in CONFUSION_TAGS" :key="tag" :label="tag" :value="tag" />
      </el-select>
      <el-radio-group v-model="sort" @change="handleFilter">
        <el-radio-button value="new">最新</el-radio-button>
        <el-radio-button value="hot">最热</el-radio-button>
      </el-radio-group>
    </div>

    <div v-loading="loading" class="page-stack">
      <CardItem v-for="card in cards" :key="card.id" :card="card" />
      <div v-if="!loading && cards.length === 0" class="empty-state">
        <el-icon><Document /></el-icon>
        <p>还没有困惑卡片，来做第一个分享的人吧 ✨</p>
      </div>
    </div>

    <div v-if="total > size" class="pagination">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="size"
        :current-page="page"
        @current-change="handlePageChange"
      />
    </div>
  </PageShell>
</template>

<style scoped>
.filter-select {
  width: 160px;
}

.pagination {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
</style>
