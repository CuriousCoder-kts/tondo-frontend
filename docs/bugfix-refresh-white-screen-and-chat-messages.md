# 前端问题记录：刷新白屏 & 私聊消息不显示

**记录日期：** 2026-06-23  
**涉及项目：** `tondo-frontend`（Vue 3 + Vite + Pinia + Vue Router + STOMP.js）  
**关联后端：** `Tondo`（Spring Boot WebSocket 私聊）

---

## 概述

在 Tier 1 功能开发完成后，测试时发现两个影响核心体验的问题：

1. **刷新页面后，右侧内容面板经常空白**（侧边栏可能正常，主内容区无任何 UI）
2. **私聊发送消息后，消息不出现在聊天窗口**（输入框清空或保留，但气泡列表无新消息）

两个问题均已修复。本文档记录现象、根因、修改文件与验证方式，便于后续排查类似问题。

---

## 问题一：刷新网页后内容面板白屏

### 现象

- 用户在已登录状态下访问 `/`、`/companion`、`/chat/1` 等页面
- 按 **F5 刷新** 或浏览器重新加载
- **左侧侧边栏**（Tondo Logo、菜单、用户信息）有时仍正常
- **右侧 `<router-view>` 内容区** 完全空白，无任何卡片列表、表单或占位文案

### 出现位置

| 模块 | 文件 |
|------|------|
| 应用入口 | `src/main.js` |
| 路由配置 | `src/router/index.js` |
| 主布局 | `src/layouts/MainLayout.vue` |
| HTTP 拦截 | `src/api/request.js` |
| 用户状态 | `src/stores/user.js` |

### 根因分析

问题由 **多个因素叠加** 导致，并非单一 bug：

#### 1. 路由未就绪就挂载应用

**原代码（`main.js`）：**

```javascript
app.use(router)
app.mount('#app')  // 立即挂载，不等待 router.isReady()
```

刷新时，浏览器 URL 已指向 `/chat/1` 等深层路径，但 Vue Router 尚未完成初始导航解析。此时子路由组件可能 **未匹配或未渲染**，表现为内容区空白。

#### 2. 可选动态路由写法不稳定

**原路由：**

```javascript
{ path: 'chat/:relationId?', name: 'chat', component: ChatView }
```

Vue Router 4 对 `?` 可选参数的支持在部分场景下（尤其刷新深链接时）匹配不稳定，可能导致 **匹配不到组件**，`<router-view>` 为空。

#### 3. 401 时登录态不同步

**原代码（`request.js`）：**

```javascript
if (res.code === 401) {
  localStorage.removeItem('token')  // 只清 localStorage
  router.push({ name: 'login' })
}
```

Pinia 中 `userStore.token` **未被清除**，路由守卫仍认为 `isLoggedIn === true`，允许进入需登录页面，但所有 API 持续 401。子页面数据加载失败，可能渲染为空或异常中间状态。

#### 4. 布局层过早渲染子页面

**原代码（`MainLayout.vue`）：**

```javascript
onMounted(() => {
  chatStore.fetchRelations()  // 无 await、无 loading 门控
  chatStore.connect()
})
```

```html
<router-view />  <!-- 立即渲染，不等待用户/关系数据就绪 -->
```

刷新时 `userStore.user` 可能仍为 `null`（`fetchUser` 异步未完成），子组件已开始发请求，与路由守卫、token 状态交织，加剧空白或闪烁。

### 解决方案

| 改动 | 文件 | 说明 |
|------|------|------|
| 等待路由就绪再挂载 | `main.js` | `router.isReady().then(() => app.mount('#app'))` |
| 刷新时补拉用户信息 | `router/index.js` | `beforeEach` 中若 `token` 存在但 `user` 为空，则 `await fetchUser()` |
| 拆分私聊路由 | `router/index.js` | `/chat` 与 `/chat/:relationId` 分为 `chat`、`chat-room` 两条路由 |
| 401 同步 logout | `api/request.js` | 调用 `useUserStore().logout()`，统一清除 token |
| 布局 loading 门控 | `layouts/MainLayout.vue` | 初始化完成前显示 loading，`ready` 后再渲染 `<router-view>` |

**修复后关键代码示例：**

```javascript
// main.js
router.isReady().then(() => {
  app.mount('#app')
})

// router/index.js
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  if (userStore.token && !userStore.user) {
    try {
      await userStore.fetchUser()
    } catch {
      userStore.logout()
    }
  }
  // ... 原有 requiresAuth / guest 判断
})

// MainLayout.vue
const ready = ref(false)
onMounted(async () => {
  try {
    if (userStore.token && !userStore.user) {
      await userStore.fetchUser()
    }
    await chatStore.fetchRelations()
    chatStore.connect()
  } finally {
    ready.value = true
  }
})
```

```html
<router-view v-if="ready" />
<div v-else v-loading="true" class="loading-placeholder" />
```

### 验证方式

1. 登录后分别访问 `/`、`/companion`、`/chat`、`/chat/{关系ID}`
2. 每个页面 **F5 刷新** 多次
3. 预期：侧边栏 + 内容区均正常；短暂 loading 后可看到页面内容
4. 后端停服或 token 过期时，应跳转登录页而非长期空白

---

## 问题二：私聊发送消息不显示

### 现象

- 用户进入私聊页，选择已 ACCEPTED 的陪伴关系
- WebSocket 显示「已连接」或短暂「未连接」
- 输入消息点击发送
- **聊天区域不出现刚发送的气泡**（自己发的消息看不到；对方若在线可能仍能收到）

### 出现位置

| 模块 | 文件 |
|------|------|
| 聊天状态 | `src/stores/chat.js` |
| 聊天页面 | `src/views/ChatView.vue` |

### 根因分析

#### 1. 历史消息加载覆盖了乐观更新（主要原因）

发送流程原为：

1. `sendMessage()` → WebSocket `publish`
2. 然后 `appendMessage()` 写入本地列表

同时，`selectRelation()` 与 `watch(route.params.relationId)` **都会** 调用 `loadHistory()`：

```javascript
function setMessages(relationId, messages) {
  messagesByRelation.value[relationId] = [...messages].reverse()  // 整表替换
}
```

**竞态时序：**

```
用户点击发送 → appendMessage（本地有消息）
     ↓
loadHistory 异步返回 → setMessages 整表替换（服务器尚无刚发消息）
     ↓
本地刚 append 的消息被抹掉 → 界面空白
```

后端设计是：发送者 **不会** 收到 STOMP 推送，仅接收方收到。因此发送者必须依赖本地乐观更新；一旦被 `setMessages` 覆盖，消息就「消失」。

#### 2. 重复加载历史加剧竞态

```javascript
function selectRelation(relationId) {
  router.replace({ name: 'chat', params: { relationId } })
  loadHistory(relationId)  // 第一次
}

watch(() => route.params.relationId, (id) => {
  loadHistory(Number(id))  // 路由变化后再来一次
})
```

一次选会话触发 **两次** 历史拉取，更容易在发送后覆盖本地消息。

#### 3. Pinia 动态 key 响应式不稳定

**原 ChatView：**

```javascript
const messages = computed(() => {
  return chatStore.messagesByRelation[currentRelationId.value] || []
})
```

对 store 内对象做 **动态 key** 访问，在部分更新路径下 computed 可能 **不重新计算**，界面不刷新（与问题 1 叠加时更难察觉）。

#### 4. senderId 严格相等比较

```javascript
function isSelf(msg) {
  return msg.senderId === userStore.userId  // JWT 为 number，后端可能为 string
}
```

不会导致消息不显示，但会导致 **气泡左右方向错误**（自己的消息显示在左侧）。

#### 5. 发送前未连接时直接 return

原逻辑在 `!chatStore.connected` 时提前 return，且 **先检查连接再 append**。用户感知为「发了但没显示」；与连接慢有关，但非主因。

### 解决方案

| 改动 | 文件 | 说明 |
|------|------|------|
| 乐观更新优先 | `stores/chat.js` | **先** `appendMessage`，再 `publish` WebSocket |
| 合并而非覆盖 | `stores/chat.js` | `setMessages` 保留带 `_local` 标记、尚未出现在服务器的消息 |
| 历史只加载一次 | `stores/chat.js` + `ChatView.vue` | `isHistoryLoaded(relationId)` 避免重复拉取 |
| 统一 relationId 类型 | `stores/chat.js` | `normalizeRelationId()` 一律转 `Number` 作 key |
| 可靠响应式绑定 | `ChatView.vue` | `storeToRefs(chatStore).activeMessages` |
| 同步 activeRelationId | `ChatView.vue` | 路由变化时 `setActiveRelation`，与 store computed 对齐 |
| 宽松比较 sender | `ChatView.vue` | `msg.senderId == userStore.userId` |
| 路由名更新 | `CompanionView.vue` 等 | 跳转私聊使用 `chat-room` + `String(relationId)` |

**修复后发送逻辑（核心）：**

```javascript
function sendMessage(relationId, content) {
  const id = normalizeRelationId(relationId)

  // 1. 先本地显示（乐观更新）
  appendMessage(id, {
    relationId: id,
    senderId: userStore.userId,
    content,
    createdAt: new Date().toISOString(),
    _local: true,
  })

  // 2. 再发 WebSocket
  if (!client.value?.connected) {
    throw new Error('WebSocket 未连接')
  }
  client.value.publish({
    destination: '/app/chat.private',
    body: JSON.stringify({ relationId: id, content }),
  })
}

function setMessages(relationId, messages) {
  const id = normalizeRelationId(relationId)
  const serverMessages = [...messages].reverse()
  const existing = messagesByRelation.value[id] || []
  const pendingLocal = existing.filter(
    (m) => m._local && !serverMessages.some((s) => s.id && s.content === m.content),
  )
  messagesByRelation.value = {
    ...messagesByRelation.value,
    [id]: [...serverMessages, ...pendingLocal],
  }
  historyLoaded.value = { ...historyLoaded.value, [id]: true }
}
```

### 验证方式

1. 两个账号建立 ACCEPTED 陪伴关系
2. 进入私聊，确认右上角 **「已连接」**
3. 发送消息 → **应立即出现在右侧**（自己气泡）
4. 刷新页面 → 历史消息从 API 加载，刚发送的应在库中可见
5. 快速连续发送、切换会话再切回，消息不应丢失

---

## 修改文件清单

```
src/main.js
src/router/index.js
src/api/request.js
src/stores/chat.js
src/layouts/MainLayout.vue
src/views/ChatView.vue
src/views/CompanionView.vue
```

---

## 经验总结

### 刷新白屏类问题

- SPA 刷新时必须考虑 **`router.isReady()`** 与 **异步 auth 初始化** 的时序
- 401 处理必须 **localStorage 与 Pinia 状态同步**
- 避免过于花哨的可选路由参数，深链接用 **明确的两条路由** 更稳
- 布局层对子路由做 **ready 门控**，避免「壳在了、内容没加载」

### 实时聊天类问题

- 发送方无服务端 push 时，必须 **乐观更新 UI**
- 历史消息拉取与本地状态要用 **合并策略**，不能无脑 `=` 覆盖
- 同一数据源避免 **多处 watch 重复拉取**
- Pinia 嵌套对象 + 动态 key 优先用 **store 内 computed + storeToRefs**

### 与后端行为的配合

| 后端行为 | 前端应对 |
|----------|----------|
| STOMP 只推送给接收方 | 发送方本地 append，不等待 push |
| `GET /api/messages/{relationId}` 返回历史 | 首次进入拉一次，之后合并更新 |
| JWT `sub` 为字符串形式 userId | 比较时用 `==` 或统一 `Number()` |

---

## 相关文档

- 后端 WebSocket 测试页：`Tondo/src/main/java/com/tondo/front/test-chat.html`（同样采用发送后本地 display）
- Tier 1 功能说明：陪伴关系 API、用户搜索、匹配推荐等（见项目对话记录 / 开发日志）
