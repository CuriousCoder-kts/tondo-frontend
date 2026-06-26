/** 头像/文件 URL 统一走 /api/files，便于 Vite 代理 */
export function resolveMediaUrl(url, cacheKey) {
  if (!url) return ''
  let resolved = url
  if (url.startsWith('http://localhost:9090/') || url.startsWith('https://')) {
    const idx = url.indexOf('avatars/')
    if (idx >= 0) {
      resolved = `/api/files/${url.substring(idx)}`
    }
  } else if (url.startsWith('/uploads/')) {
    resolved = `/api/files/${url.substring('/uploads/'.length)}`
  }
  if (cacheKey) {
    const sep = resolved.includes('?') ? '&' : '?'
    return `${resolved}${sep}t=${cacheKey}`
  }
  return resolved
}
