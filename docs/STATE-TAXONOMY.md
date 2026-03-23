# Clawpet 状态事件词典

> 本文档定义 Clawpet 中所有状态、活动、事件的分类体系，为产品、设计、实现提供统一的语言基础。

---

## 1. 连接状态（Connection States）

描述 Clawpet 与 OpenClaw Gateway 的连接状态。

### 1.1 状态枚举

| 状态 | 英文 | 说明 | 触发条件 | 回复条件 |
|------|------|------|--------|--------|
| **连接中** | `connecting` | 正在建立与 Gateway 的连接 | 应用启动或网络恢复后 | 连接成功或超时（8s） |
| **已连接** | `connected` | 成功连接到 OpenClaw Gateway，已通过认证 | 握手完成，收到 hello 消息 | 网络断开或心跳超时 |
| **降级中** | `degraded` | 原生 Gateway 连接失败，已切换到 soul bridge 或文件桥接 | Gateway 连接失败 3+ 次后 | 重新连接成功 |
| **断开** | `disconnected` | 与 Gateway 的连接已断开，暂无法重连 | 握手失败、网络不可达、心跳超时 | 网络恢复或主动重连 |
| **错误** | `error` | 连接过程中出现致命错误 | 认证失败、配置错误、端口拒绝 | 手动重试或配置修改 |
| **未配置** | `unconfigured` | 未找到有效的 OpenClaw 配置 | 启动时找不到 ~/.openclaw 或 ~/.qclaw | 用户配置 OpenClaw |

### 1.2 状态转移流程

```
未配置 → 连接中 → 已连接 → (降级中 ↔ 已连接)
  ↓        ↓        ↓
         断开 ← 错误 ← 心跳超时
          ↓
         连接中 → 已连接
```

### 1.3 降级策略

**原生接入失败的降级顺序：**
1. 检查 `.openclaw/openclaw.json` 中的 Gateway 配置
2. 如果失败，尝试 `.qclaw/openclaw.json`
3. 如果都失败，切换到 Soul Bridge（灵魂模式）
4. 如果都无效，切换到文件桥接模式

---

## 2. 灵魂状态（Soul States）

描述 OpenClaw agent 的工作状态，由宠物的行为和动画表现出来。

### 2.1 核心灵魂状态

| 状态 | 英文 | 中文标签 | 说明 | 动画表现 | 宠物行为 |
|------|------|--------|------|--------|--------|
| **待命** | `idle` | 待命中 | agent 在线，无任务运行 | 缓慢呼吸，偶尔转身 | 散步、抖耳朵、打呵欠 |
| **思考** | `thinking` | 思考中 | agent 正在读取或处理信息 | 轻微摇头、眯眼 | 原地转圈、抓头皮 |
| **工作** | `coding` | 工作中 | agent 正在创建或修改文件 | 急促走动、积极的头部摆动 | 快速走动、频繁转身 |
| **执行** | `running` | 执行中 | agent 正在执行命令或工具 | 跳跃、高频率的尾巴摆动 | 快速走动、不断跳跃 |
| **等待** | `waiting` | 等待中 | agent 等待执行批准或用户输入 | 坐立不安，频繁看向用户 | 在原地踏步、转身观察 |
| **错误** | `error` | 异常中 | 连接失败或 agent 执行出错 | 晃动、卷尾 | 走动缓慢、无精打采 |

### 2.2 状态优先级

用于当多个活动同时发生时的优先级选择：

```
error (最高) > waiting > running > coding > thinking > idle (最低)
```

**规则**：
- 如果 agent 在等待审批，使用 `waiting`，即使同时在运行其他任务
- 如果有错误，`error` 覆盖所有其他状态
- 如果有多个活动，选择最高优先级的状态

### 2.3 灵魂状态触发条件

**from OpenClaw events:**

```typescript
// 伪代码示意
if (approvals.length > 0) {
  status = 'waiting'  // 优先显示：有待审批
} else if (lastError && isRecent(lastError)) {
  status = 'error'    // 连接或执行错误
} else if (activeRun) {
  switch (activeRun.activityKind) {
    case 'read': status = 'thinking'   // 正在读取文件或网络
    case 'write': status = 'coding'    // 正在创建/修改文件
    case 'edit': status = 'coding'     // 同上
    case 'exec': status = 'running'    // 正在执行命令
    case 'job': status = 'running'     // 正在运行任务
    default: status = 'thinking'
  }
} else if (recentActivity < 20s) {
  status = 'thinking'  // 最近有活动，可能在思考
} else {
  status = 'idle'      // 无活动，待命中
}
```

---

## 3. 活动类型（Activity Kinds）

描述 OpenClaw agent 具体在做什么类型的工作。

### 3.1 主要活动分类

| 活动类型 | 英文 | 说明 | 示例 | 映射到灵魂状态 |
|--------|------|------|-----|--------------|
| **读取** | `read` | 正在读取或查阅信息 | 读文件、网络请求、数据库查询 | `thinking` |
| **写入** | `write` | 正在创建新文件或追加内容 | 创建文件、日志写入、数据保存 | `coding` |
| **编辑** | `edit` | 正在修改或更新现有文件 | 替换文本、应用补丁、格式化 | `coding` |
| **执行** | `exec` | 正在运行命令或脚本 | shell 命令、进程执行、编译 | `running` |
| **附加** | `attach` | 正在上传、截图或处理多媒体 | 上传文件、截屏、图像处理 | `running` |
| **工作** | `job` | 通用后台任务 | agent 生命周期任务、流程编排 | `running` |
| **工具** | `tool` | 调用工具或插件 | 通用工具调用（未分类） | `thinking` |
| **空闲** | `idle` | 无活动 | - | `idle` |

### 3.2 活动分类规则

宠物收到来自 OpenClaw 的事件后，按以下规则分类：

#### 3.2.1 Tool 流事件分类

工具名包含关键词时自动分类：

```typescript
function classifyToolActivityKind(toolName: string): ActivityKind {
  const name = toolName.toLowerCase()
  
  if (name.includes('read')) return 'read'
  if (name.includes('edit', 'patch', 'replace', 'apply')) return 'edit'
  if (name.includes('write', 'append', 'create', 'save')) return 'write'
  if (name.includes('exec', 'run', 'shell', 'process', 'terminal')) return 'exec'
  if (name.includes('attach', 'upload', 'image', 'screenshot', 'camera')) return 'attach'
  
  return 'tool'
}
```

#### 3.2.2 Lifecycle 流事件

| Phase | Interpretation | Activity Kind |
|-------|---|---|
| `start` | 任务开始 | 基于流类型（tool/job） |
| `processing` | 任务处理中 | 基于流类型 |
| `end` | 任务完成 | 任务结束，清空活动 |
| `error` | 任务失败 | 错误状态，activity 变 error |

#### 3.2.3 Assistant 流事件

| Phase | Interpretation |
|-------|---|
| `stream` | 正在组织回复 |
| `final` | 回复完成 |

---

## 4. 交接事件（Handoff Events）

描述需要用户干预的关键时刻。

### 4.1 审批请求（Approval Request）

```typescript
interface ApprovalEvent {
  type: 'exec.approval.requested'
  id: string                    // 审批 ID
  command: string              // 要执行的命令
  action?: string              // 动作类型（e.g., 'exec'）
  host?: string                // 目标主机
  cwd?: string                 // 工作目录
  expiresAtMs?: number         // 过期时间
  sessionKey: string           // 会话标识
}
```

**触发条件**：agent 需要执行高风险操作

**反馈机制**：
- 浮窗显示命令摘要和来源
- 三个主动作：allow-once / allow-always / deny
- 4s 内无操作自动消失
- 已处理的审批从列表移除

### 4.2 任务完成（Task Completion）

```typescript
interface CompletionEvent {
  type: 'agent' | 'job' | 'chat'
  phase: 'end' | 'final'
  durationMs: number           // 任务耗时
  status: 'success'            // 成功
}
```

**反馈表现**：
- 宠物播放完成动画（跳跃、鸣叫）
- 短暂提示框（1.5s）显示 "完成！"
- 灵魂状态返回 idle 或等待下一任务

### 4.3 任务失败（Task Failure）

```typescript
interface FailureEvent {
  type: 'agent' | 'job'
  phase: 'error'
  error: string                // 错误信息
}
```

**反馈表现**：
- 宠物行为转为沮丧（低头、颤抖）
- 弹出提示 "出错了，检查一下？"（3s）
- 灵魂状态变为 `error`
- Panel 显示错误日志

### 4.4 长等待提醒（Long Wait Alert）

```typescript
interface LongWaitEvent {
  type: 'waiting' | 'blocked'
  durationMs: number           // 已等待时间
  threshold: number            // 提醒阈值（默认 60s）
}
```

**升级策略**：
- **30s**：无反馈，静默等待
- **60s**：第一次提醒 → 宠物坐下，吱呀吱呀声
- **120s**：第二次提醒 → 宠物来回踱步，更大声的提醒
- **300s**：第三次提醒 → 宠物跳跃，重要提醒弹窗
- **600s**：第四次提醒 → 宠物焦躁，系统通知

---

## 5. 提醒强度（Notification Levels）

对不同事件的打扰程度进行分级。

### 5.1 强度等级

| 强度 | 英文 | 特征 | 示例 | 节流策略 |
|------|------|------|-----|--------|
| **关键** | `critical` | 必须立即处理 | 审批超时（即将失效） | 不节流 |
| **重要** | `important` | 应该处理 | 任务失败、审批请求 | 同类 30s 节流 |
| **普通** | `normal` | 可以处理 | 任务完成、会话切换 | 同类 5s 节流 |
| **信息** | `info` | 供参考 | 状态变化、活动更新 | 同类 10s 节流 |

### 5.2 事件强度映射

| 事件 | 强度 | 理由 |
|------|------|------|
| 审批请求 | `important` | 可能影响流程，需要用户决策 |
| 审批即将过期（<10s） | `critical` | 如果不处理会自动超时 |
| 任务失败 | `important` | 可能需要用户介入或重试 |
| 任务完成 | `normal` | 参考性反馈，不阻塞流程 |
| 30s+ 等待 | `important` | 用户可能需要介入 |
| 状态变化（读→写→执行） | `info` | 纯参考信息 |

### 5.3 节流规则

**同类提醒节流**：

```typescript
// 同类型的提醒在一定时间内最多触发一次
interface NotificationThrottle {
  key: string                  // 提醒 key（e.g., 'approval-requested'）
  lastFiredAt: number         // 上次触发时间
  throttleMs: number          // 节流时间（由强度决定）
}

function shouldNotify(key: string, throttleMs: number): boolean {
  const last = throttleMap.get(key)
  const now = Date.now()
  
  if (!last || now - last >= throttleMs) {
    throttleMap.set(key, now)
    return true
  }
  return false
}
```

**示例**：
- 同一会话的多个 `tool:read` 事件，5s 内仅反馈一次
- 多个待审批，每次有新增审批时提醒（不合并提醒）
- 单个审批逐秒倒计时的过期警告（特殊处理）

---

## 6. 宠物行为映射（Pet Behavior Mapping）

根据状态和活动自动选择宠物行为。

### 6.1 行为表

| 灵魂状态 | 活动类型 | 建议行为 | 速度 | 声效 |
|--------|--------|--------|------|------|
| `idle` | `idle` | idle / walk | 1-2 步/秒 | 偶尔鸣叫 |
| `thinking` | `read` | idle（眯眼） / 转圈 | 0-1 步/秒 | 无 |
| `thinking` | `tool` | idle（抓头） / 踱步 | 1 步/秒 | 轻微吱呀声 |
| `coding` | `write`/`edit` | walk | 2-3 步/秒 | 无或键盘声 |
| `running` | `exec`/`job` | walk / hop | 3-4 步/秒 | 急促声效 |
| `running` | `attach` | walk（快速） | 4 步/秒 | 快速吱呀声 |
| `waiting` | - | idle（局促） / 原地踏步 | 原地 | 期待声 |
| `error` | - | idle（头垂） / 缓慢走动 | 0-1 步/秒 | 悲鸣 |

### 6.2 动画选择逻辑

```typescript
function selectPetAnimation(soulStatus: SoulStatus, activityKind: ActivityKind): AnimationName {
  // 优先匹配状态
  if (soulStatus === 'waiting') return 'idle'  // 原地 idle
  if (soulStatus === 'error') return 'idle'    // 垂头 idle
  if (soulStatus === 'idle') {
    // 休闲状态有 30% 概率睡眠
    return Math.random() < 0.3 ? 'sleep' : (Math.random() < 0.5 ? 'walk' : 'idle')
  }
  
  // 活跃状态倾向 walk
  if (['thinking', 'coding', 'running'].includes(soulStatus)) {
    return 'walk'
  }
  
  return 'idle'
}
```

---

## 7. 状态同步机制（State Sync）

Clawpet 的各个组件如何保持状态同步。

### 7.1 信息流向

```
OpenClaw Gateway (WebSocket)
         ↓
OpenClawGatewayClient (解析 + 分类)
         ↓
soul-state (导出 SoulState)
         ↓
IPC Broadcast (electron main → renderer)
         ↓
┌─────────────────────────────────┐
├── pet-app.ts (宠物渲染)          │
├── panel-app.ts (面板显示)        │
└── approval-app.ts (审批浮窗)     │
```

### 7.2 更新频率（Throttling）

为避免高频更新导致 UI 卡顿，实现分层节流：

| 层级 | 更新频率 | 作用 |
|------|--------|------|
| **Main 进程** | 100ms | Panel 快照推送节流 |
| **Pet Manager** | 500ms | 宠物窗口快照广播节流 |
| **Renderer** | RequestAnimationFrame | 根据 IME 状态和用户交互决定是否渲染 |

### 7.3 IPC 命令

```typescript
// 同步宠物状态
{ type: 'sync-pet-state', pet: PetWindowState }

// 同步灵魂状态（宠物行为表达的状态）
{ type: 'sync-soul-state', soul: SoulState }

// 同步 Gateway 快照（连接、会话、活动）
{ type: 'sync-gateway-snapshot', snapshot: OpenClawSnapshot }

// 任务反馈（完成/失败）
{ type: 'task-feedback', feedback: { type, message, durationMs } }
```

---

## 8. 实现检查清单

### P0 完成阶段

- [ ] 连接状态机完整实现（6 个状态 + 转移规则）
- [ ] 灵魂状态正确映射（`deriveSoulState()` 函数）
- [ ] 活动分类完整（8 种活动类型）
- [ ] 宠物行为映射正确（idle/walk/greet/sleep）
- [ ] 提醒强度分级（4 个等级）
- [ ] 同类提醒节流（已实现基础）

### P1 增强阶段

- [ ] 长等待提醒升级策略
- [ ] 生命周期仪式感（task-received → thinking → executing → waiting → done/failed）
- [ ] 多宠物映射（session ↔ pet）
- [ ] 面板重构（工作卡片中心）

### P2 扩展阶段

- [ ] Companion Schema 外置化
- [ ] 人格/行为包系统

---

## 9. 参考资源

- PRD: `docs/CLAWPET-PRD.md` § 3 (状态分类与 glanceable 反馈)
- Roadmap: `docs/ROADMAP.md` § CP-005 (细粒度活动分类)
- IPC 定义: `src/shared/ipc.ts`
- Gateway 客户端: `src/main/openclaw-client.ts`
- 宠物定义: `src/renderer/src/pet-definitions.ts`

