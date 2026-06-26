<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createCard } from '@/api/card'
import PageShell from '@/components/PageShell.vue'
import {
  CONFUSION_TAGS,
  EMOTION_TAGS,
  NEED_TYPES,
  toJsonTags,
} from '@/utils/constants'

const router = useRouter()
const loading = ref(false)

const form = reactive({
  title: '',
  eventDescription: '',
  emotionTags: [],
  attemptDescription: '',
  needType: '',
  confusionTags: [],
})

async function handleSubmit() {
  if (form.eventDescription.length < 30) {
    ElMessage.warning('事件描述至少30字')
    return
  }
  if (form.attemptDescription.length < 20) {
    ElMessage.warning('尝试描述至少20字')
    return
  }
  if (!form.emotionTags.length) {
    ElMessage.warning('请选择情绪标签')
    return
  }
  if (!form.confusionTags.length) {
    ElMessage.warning('请选择困惑领域')
    return
  }
  if (!form.needType) {
    ElMessage.warning('请选择你需要什么')
    return
  }

  loading.value = true
  try {
    const card = await createCard({
      title: form.title,
      eventDescription: form.eventDescription,
      emotionTags: toJsonTags(form.emotionTags),
      attemptDescription: form.attemptDescription,
      needType: form.needType,
      confusionTags: toJsonTags(form.confusionTags),
    })
    ElMessage.success('发布成功')
    router.push({ name: 'card-detail', params: { id: card.id } })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageShell
    title="发布困惑"
    subtitle="真诚分享，收获回应"
  >
    <el-form :model="form" label-position="top" class="create-form">
        <div class="form-block">
          <div class="form-block-head">
            <span class="form-block-num">01</span>
            <h3 class="form-block-title">基本信息</h3>
          </div>
          <el-form-item label="标题（可选）">
            <el-input v-model="form.title" placeholder="给你的困惑起个标题" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="发生了什么？（至少30字）">
            <el-input
              v-model="form.eventDescription"
              type="textarea"
              :rows="5"
              placeholder="描述你遇到的困惑或事件..."
              show-word-limit
            />
          </el-form-item>
        </div>

        <div class="form-block">
          <div class="form-block-head">
            <span class="form-block-num">02</span>
            <h3 class="form-block-title">情绪与领域</h3>
          </div>
          <el-form-item label="你现在的情绪">
            <el-checkbox-group v-model="form.emotionTags" class="tag-checkbox-group">
              <el-checkbox v-for="tag in EMOTION_TAGS" :key="tag" :value="tag" :label="tag" />
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="困惑领域">
            <el-checkbox-group v-model="form.confusionTags" class="tag-checkbox-group">
              <el-checkbox v-for="tag in CONFUSION_TAGS" :key="tag" :value="tag" :label="tag" />
            </el-checkbox-group>
          </el-form-item>
        </div>

        <div class="form-block">
          <div class="form-block-head">
            <span class="form-block-num">03</span>
            <h3 class="form-block-title">你的尝试与需求</h3>
          </div>
          <el-form-item label="你尝试过什么？（至少20字）">
            <el-input
              v-model="form.attemptDescription"
              type="textarea"
              :rows="4"
              placeholder="描述你已经尝试过的方法或行动..."
            />
          </el-form-item>
          <el-form-item label="你需要什么？">
            <el-radio-group v-model="form.needType" class="need-radio-group">
              <el-radio v-for="item in NEED_TYPES" :key="item.value" :value="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </div>

        <div class="form-submit">
          <el-button type="primary" size="large" :loading="loading" @click="handleSubmit">
            发布困惑
          </el-button>
        </div>
      </el-form>
  </PageShell>
</template>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 20px;
  background: var(--tondo-inset-bg);
  border: 1px solid var(--tondo-inset-border);
  border-radius: 12px;
}

.form-block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.form-block-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-accent) 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.form-block-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--tondo-text);
}

.create-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--tondo-text);
  padding-bottom: 6px;
}

.create-form :deep(.el-input__wrapper),
.create-form :deep(.el-textarea__inner) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(79, 140, 255, 0.12) inset;
}

.create-form :deep(.el-input__wrapper:hover),
.create-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px rgba(79, 140, 255, 0.28) inset;
}

.create-form :deep(.el-input__wrapper.is-focus),
.create-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--tondo-primary) inset;
}

.tag-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-checkbox-group :deep(.el-checkbox) {
  margin-right: 0;
  height: auto;
}

.tag-checkbox-group :deep(.el-checkbox__input) {
  display: none;
}

.tag-checkbox-group :deep(.el-checkbox__label) {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid rgba(79, 140, 255, 0.15);
  background: #fff;
  color: var(--tondo-text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  line-height: 1.4;
}

.tag-checkbox-group :deep(.el-checkbox__label:hover) {
  border-color: rgba(79, 140, 255, 0.35);
  color: var(--tondo-primary-dark);
}

.tag-checkbox-group :deep(.el-checkbox.is-checked .el-checkbox__label) {
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-primary-dark) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.need-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.need-radio-group :deep(.el-radio) {
  margin-right: 0;
  height: auto;
}

.need-radio-group :deep(.el-radio__input) {
  display: none;
}

.need-radio-group :deep(.el-radio__label) {
  padding: 8px 18px;
  border-radius: 20px;
  border: 1px solid rgba(79, 140, 255, 0.15);
  background: #fff;
  color: var(--tondo-text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.need-radio-group :deep(.el-radio__label:hover) {
  border-color: rgba(79, 140, 255, 0.35);
  color: var(--tondo-primary-dark);
}

.need-radio-group :deep(.el-radio.is-checked .el-radio__label) {
  background: linear-gradient(135deg, var(--tondo-primary) 0%, var(--tondo-primary-dark) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.form-submit {
  padding-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.form-submit .el-button {
  min-width: 168px;
  height: 44px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
}
</style>
