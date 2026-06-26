<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createReport } from '@/api/report'
import { REPORT_REASONS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  targetType: { type: String, required: true },
  targetId: { type: Number, required: true },
  targetLabel: { type: String, default: '该内容' },
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const loading = ref(false)
const form = reactive({
  reason: '',
  description: '',
})

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      form.reason = ''
      form.description = ''
    }
  },
)

watch(visible, (val) => emit('update:modelValue', val))

async function handleSubmit() {
  if (!form.reason) {
    ElMessage.warning('请选择举报原因')
    return
  }
  loading.value = true
  try {
    await createReport({
      targetType: props.targetType,
      targetId: props.targetId,
      reason: form.reason,
      description: form.description || undefined,
    })
    ElMessage.success('举报已提交，感谢你对社区的保护')
    visible.value = false
    emit('success')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="举报内容" width="480px">
    <p class="hint">你正在举报：{{ targetLabel }}</p>
    <el-form label-position="top">
      <el-form-item label="举报原因">
        <el-radio-group v-model="form.reason">
          <el-radio v-for="item in REPORT_REASONS" :key="item.value" :label="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="补充说明（可选）">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="loading" @click="handleSubmit">提交举报</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint {
  margin-bottom: 16px;
  color: var(--tondo-text-secondary);
  font-size: 14px;
}
</style>
