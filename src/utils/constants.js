export const CONFUSION_TAGS = [
  '职业迷茫', '情感困扰', '学业压力', '人际关系',
  '自我认同', '家庭矛盾', '健康焦虑', '财务压力',
]

export const EMOTION_TAGS = [
  '焦虑', '迷茫', '孤独', '沮丧', '愤怒', '恐惧', '无助', 'Hopeful',
]

/** 情绪标签对应色（块 C 视觉） */
export const EMOTION_COLORS = {
  焦虑: { bg: '#fff4e6', border: '#ffa94d', text: '#d9480f' },
  迷茫: { bg: '#f3f0ff', border: '#9775fa', text: '#5f3dc4' },
  孤独: { bg: '#e7f5ff', border: '#74c0fc', text: '#1864ab' },
  沮丧: { bg: '#f1f3f5', border: '#868e96', text: '#343a40' },
  愤怒: { bg: '#fff0f0', border: '#ff6b6b', text: '#c92a2a' },
  恐惧: { bg: '#f8f0fc', border: '#da77f2', text: '#862e9c' },
  无助: { bg: '#f8f9fa', border: '#ced4da', text: '#495057' },
  Hopeful: { bg: '#ebfbee', border: '#69db7c', text: '#2b8a3e' },
}

export function getEmotionColor(tag) {
  return EMOTION_COLORS[tag] || { bg: '#f5f5f5', border: '#ccc', text: '#555' }
}

export function getDominantEmotionColor(tags) {
  if (!tags?.length) return null
  return getEmotionColor(tags[0])
}

export const NEED_TYPES = [
  { value: 'EMPATHY', label: '需要共情' },
  { value: 'ADVICE', label: '需要建议' },
  { value: 'COMPANION', label: '需要陪伴' },
]

export const CARD_STATUS = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  RESOLVED: '已解决',
  HIDDEN: '已隐藏',
}

export const CHECKIN_FREQUENCIES = [
  { value: 'DAILY', label: '每日打卡' },
  { value: 'WEEKLY', label: '每周打卡' },
]

export const COMPANION_STYLES = [
  { value: 'ANY', label: '不限' },
  { value: 'STRICT', label: '严格督促' },
  { value: 'ENCOURAGING', label: '温柔鼓励' },
  { value: 'QUIET', label: '安静陪伴' },
]

export const RELATION_STATUS = {
  PENDING: '待接受',
  ACCEPTED: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REJECTED: '已拒绝',
}

export const PLAN_STATUS = {
  SEEKING: '招募中',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

export const REPORT_REASONS = [
  { value: 'HARASSMENT', label: '骚扰或不友善' },
  { value: 'FAKE_INFO', label: '虚假误导' },
  { value: 'HATE_SPEECH', label: '仇恨或歧视' },
  { value: 'OTHER', label: '其他' },
]

export const REPORT_TARGET_TYPES = {
  CARD: '困惑卡片',
  REPLY: '回复',
  MESSAGE: '私聊消息',
  USER: '用户',
}

export const ADMIN_ACTIONS = [
  { value: 'DISMISS', label: '驳回举报' },
  { value: 'HIDE_CONTENT', label: '隐藏内容' },
  { value: 'FREEZE_USER', label: '冻结账号' },
]

export function parseJsonTags(jsonStr) {
  if (!jsonStr) return []
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toJsonTags(tags) {
  return JSON.stringify(tags)
}
