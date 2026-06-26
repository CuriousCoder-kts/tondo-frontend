export function parseDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, s = 0] = value
    if (!y || !m || !d) return null
    const date = new Date(y, m - 1, d, h, min, s)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'object') {
    if (value.year != null && value.monthValue != null && value.dayOfMonth != null) {
      const date = new Date(
        value.year,
        value.monthValue - 1,
        value.dayOfMonth,
        value.hour || 0,
        value.minute || 0,
        value.second || 0,
      )
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const text = String(value).trim()
  if (!text) return null
  const date = new Date(text.includes('T') ? text : text.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value, fallback = '-') {
  const date = parseDate(value)
  if (!date) return fallback
  return date.toLocaleString('zh-CN')
}

export function formatDate(value, fallback = '') {
  const date = parseDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('zh-CN')
}

export function formatTime(value, fallback = '') {
  const date = parseDate(value)
  if (!date) return fallback
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateLabel(value, fallback = '') {
  const date = parseDate(value)
  if (!date) return fallback
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return '今天'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function formatRelativeTime(value, fallback = '') {
  const date = parseDate(value)
  if (!date) return fallback
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function dateKey(value) {
  const date = parseDate(value)
  return date ? date.toDateString() : 'unknown'
}
