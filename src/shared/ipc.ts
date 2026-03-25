export const PET_WINDOW_WIDTH = 192
export const PET_WINDOW_HEIGHT = 156
export const MAX_PETS = 6

export type PetVariantId =
  | 'peach-cat'
  | 'mint-cat'
  | 'midnight-cat'
  | 'butter-cat'
  | 'sakura-cat'
  | 'cocoa-cat'
export type PetActivity = 'idle' | 'walk' | 'greet' | 'sleep'
export type Facing = -1 | 1
export type SoulStatus = 'idle' | 'thinking' | 'coding' | 'running' | 'waiting' | 'error'

// P1: 任务生命周期阶段 - 用于表达任务从接收到完成的完整过程
export type TaskLifecyclePhase = 
  | 'task-received'   // 刚收到任务
  | 'thinking'        // 正在思考/分析
  | 'executing'       // 正在执行
  | 'waiting'         // 等待响应/审批
  | 'needs-human'     // 需要人工介入
  | 'done'            // 完成成功
  | 'failed'          // 执行失败
export type SoulSource = 'openclaw' | 'qclaw' | 'custom'
export type GatewaySource = 'openclaw' | 'qclaw' | 'custom'
export type GatewayConnectionState = 'unconfigured' | 'connecting' | 'connected' | 'degraded' | 'disconnected' | 'error'
export type NotificationLevel = 'critical' | 'important' | 'normal' | 'info'
export type GatewayApprovalDecision = 'allow-once' | 'allow-always' | 'deny'
export type GatewayActivityKind =
  | 'idle'
  | 'job'
  | 'tool'
  | 'read'
  | 'write'
  | 'edit'
  | 'exec'
  | 'attach'

export interface AppSettings {
  clickThrough: boolean
  paused: boolean
  soulMode: boolean
  muted: boolean
  lastActiveSessionKey?: string
}

export interface PetWindowState {
  activity: PetActivity
  facing: Facing
  petId: string
  speechDurationMs: number
  speechText: string
  variantId: PetVariantId
  // P1-CP-007: 会话绑定信息（可选，用于多会话支持）
  sessionBinding?: PetSessionBinding
  priorityInfo?: PetPriorityInfo
}

// P1-CP-007: 宠物会话映射 - 记录每个宠物代表的工作会话
export interface PetSessionBinding {
  petId: string
  sessionKey: string        // 绑定的会话 key
  isPrimary: boolean        // 是否为主要会话
  sessionName: string       // 会话显示名称
  sessionModel?: string     // 会话模型（如 GPT-4）
  lastActivityAt?: number   // 最后活动时间
}

// P1-CP-007: 宠物优先级信息 - 用于优先级排序和展示
export interface PetPriorityInfo {
  petId: string
  sessionKey: string
  priority: 'high' | 'normal' | 'low'
  hasActiveRun: boolean     // 当前是否有活跃任务
  hasApproval: boolean      // 是否在等待审批
  lifecyclePhase?: TaskLifecyclePhase
}

export interface SoulState {
  active: boolean
  description: string
  source: SoulSource
  sourcePath: string
  status: SoulStatus
  updatedAt: string
}

export interface GatewaySessionSummary {
  chatType?: string
  displayName: string
  key: string
  kind?: string
  lastChannel?: string
  model?: string
  modelProvider?: string
  originLabel?: string
  sessionId?: string
  totalTokens?: number
  updatedAt?: number
}

export interface GatewayOutgoingAttachment {
  id: string
  fileName: string
  mimeType: string
  contentBase64: string
  previewDataUrl?: string
  sizeBytes: number
}

export interface GatewayAttachmentSummary {
  kind: 'image'
  fileName?: string
  mimeType?: string
  previewDataUrl?: string
  localId?: string
}

export interface GatewaySendMessagePayload {
  message: string
  sessionKey?: string
  attachments?: GatewayOutgoingAttachment[]
}

export interface GatewayMessageSummary {
  id: string
  role: string
  sessionKey: string
  text: string
  attachments?: GatewayAttachmentSummary[]
  timestamp?: number
}

export type GatewayTranscriptKind =
  | 'text'
  | 'thinking'
  | 'tool-call'
  | 'tool-result'
  | 'status'

export interface GatewayTranscriptEntry {
  id: string
  kind: GatewayTranscriptKind
  role: string
  sessionKey: string
  text: string
  attachments?: GatewayAttachmentSummary[]
  timestamp?: number
  toolName?: string
}

export interface GatewayPresenceSummary {
  deviceId?: string
  mode?: string
  reason?: string
  text: string
  ts?: number
}

export interface GatewayNodeSummary {
  caps?: string[]
  connected?: boolean
  displayName: string
  nodeId: string
  paired?: boolean
  platform?: string
}

export interface GatewayApprovalSummary {
  action?: string
  agentId?: string
  command?: string
  cwd?: string
  expiresAtMs?: number
  host?: string
  id: string
  sessionKey?: string
}

export interface GatewayActiveRun {
  activityKind: GatewayActivityKind
  label: string
  phase?: string
  runId: string
  sessionKey: string
  startedAt: number
  stream: string
  summary: string
  updatedAt: number
}

export interface OpenClawSnapshot {
  activeSessionKey: string
  approvals: GatewayApprovalSummary[]
  configured: boolean
  connected: boolean
  connectionState: GatewayConnectionState
  connectionStateChangedAt?: number
  defaultAgentId?: string
  gatewayUrl: string
  lastError: string
  lastEventAt?: number
  liveTranscript: GatewayTranscriptEntry | null
  nodes: GatewayNodeSummary[]
  presence: GatewayPresenceSummary[]
  recentMessages: GatewayMessageSummary[]
  sessions: GatewaySessionSummary[]
  source: GatewaySource
  sourcePath: string
  activeRun: GatewayActiveRun | null
  transcript: GatewayTranscriptEntry[]
}

export interface PetSnapshot {
  pet: PetWindowState
  settings: AppSettings
  soul: SoulState
}

export const DEFAULT_SOUL_STATE: SoulState = {
  active: false,
  description: '',
  source: 'openclaw',
  sourcePath: '',
  status: 'idle',
  updatedAt: ''
}

export const DEFAULT_GATEWAY_SNAPSHOT: OpenClawSnapshot = {
  activeSessionKey: '',
  approvals: [],
  configured: false,
  connected: false,
  connectionState: 'unconfigured',
  gatewayUrl: '',
  lastError: '',
  nodes: [],
  presence: [],
  recentMessages: [],
  sessions: [],
  source: 'openclaw',
  sourcePath: '',
  activeRun: null,
  liveTranscript: null,
  transcript: []
}

export const SOUL_STATUS_LABELS: Record<SoulStatus, string> = {
  idle: '待命中',
  thinking: '思考中',
  coding: '工作中',
  running: '执行中',
  waiting: '等待中',
  error: '异常中'
}

export const GATEWAY_CONNECTION_STATE_LABELS: Record<GatewayConnectionState, string> = {
  unconfigured: '未配置',
  connecting: '连接中...',
  connected: '已连接',
  degraded: '降级模式',
  disconnected: '已断开',
  error: '连接错误'
}

export const NOTIFICATION_LEVEL_THROTTLE_MS: Record<NotificationLevel, number> = {
  critical: 0,           // 不节流
  important: 30_000,    // 30秒
  normal: 5_000,        // 5秒
  info: 10_000          // 10秒
}

// P1: 任务生命周期阶段的标签和描述
export const TASK_LIFECYCLE_LABELS: Record<TaskLifecyclePhase, string> = {
  'task-received': '收到任务',
  'thinking': '思考中',
  'executing': '执行中',
  'waiting': '等待中',
  'needs-human': '需要决策',
  'done': '任务完成',
  'failed': '执行失败'
}

// P1: 情感状态类型定义
export type TaskEmotionState = 'neutral' | 'focused' | 'excited' | 'concerned' | 'completed' | 'failed'

// P1: 任务生命周期阶段对应的视觉状态（可用于颜色、动画等）
export const TASK_LIFECYCLE_EMOTION: Record<TaskLifecyclePhase, TaskEmotionState> = {
  'task-received': 'excited',      // 兴奋：新任务来了
  'thinking': 'focused',            // 专注：在思考
  'executing': 'focused',           // 专注：正在工作
  'waiting': 'concerned',           // 担忧：在等待
  'needs-human': 'concerned',       // 担忧：需要人类决策
  'done': 'completed',              // 完成：任务成功
  'failed': 'failed'                // 失败：出了问题
}

// CP-009: 统一的情感状态颜色映射规范
export const EMOTION_COLORS: Record<TaskEmotionState, {
  primary: string      // 主色 (#RRGGBB)
  accent: string       // 辅色 (#RRGGBB)
  alphaLight: number   // 轻度透明度 (0.0-1.0)
  alphaMedium: number  // 中度透明度 (0.0-1.0)
  alphaHeavy: number   // 重度透明度 (0.0-1.0)
}> = {
  'excited': {
    primary: '#FFC86B',    // Gold
    accent: '#FFB847',     // Orange
    alphaLight: 0.35,
    alphaMedium: 0.45,
    alphaHeavy: 0.50
  },
  'focused': {
    primary: '#71D2FF',    // Sky Blue
    accent: '#4A90D9',     // Navy
    alphaLight: 0.35,
    alphaMedium: 0.42,
    alphaHeavy: 0.48
  },
  'concerned': {
    primary: '#BE9EF5',    // Purple
    accent: '#D9A5F8',     // Light Purple
    alphaLight: 0.35,
    alphaMedium: 0.48,
    alphaHeavy: 0.52
  },
  'completed': {
    primary: '#64F0A8',    // Leaf Green
    accent: '#7DFF9F',     // Mint
    alphaLight: 0.35,
    alphaMedium: 0.44,
    alphaHeavy: 0.50
  },
  'failed': {
    primary: '#FF6464',    // Red
    accent: '#FF8E5E',     // Orange-Red
    alphaLight: 0.35,
    alphaMedium: 0.50,
    alphaHeavy: 0.55
  },
  'neutral': {
    primary: '#C1D1DC',    // Gray
    accent: '#7A6B5E',     // Brown
    alphaLight: 0.20,
    alphaMedium: 0.28,
    alphaHeavy: 0.35
  }
}

export type AppCommand =
| {
type: 'sync-settings'
settings: AppSettings
}
| {
type: 'sync-pet-state'
pet: PetWindowState
}
| {
type: 'sync-soul-state'
soul: SoulState
}
| {
type: 'sync-gateway-snapshot'
snapshot: OpenClawSnapshot
}
| {
type: 'task-feedback'
feedback: {
type: 'completion' | 'failure'
message: string
durationMs: number
}
}
| {
type: 'task-lifecycle'
phase: TaskLifecyclePhase
runId: string
durationMs?: number
}
| {
type: 'ceremony-transition'
from: TaskLifecyclePhase
to: TaskLifecyclePhase
durationMs?: number
}
| {
type: 'desktop-utterance'
utterance: {
sessionKey?: string
text: string
kind: 'approval' | 'done' | 'failed' | 'waiting' | 'progress' | 'summary'
priority: 'critical' | 'important' | 'normal'
durationMs: number
canCopy: boolean
canExpand: boolean
}
}

export const IPC_CHANNELS = {
  command: 'app:command',
  gatewayAbortRun: 'gateway:abort-run',
  gatewayGetSnapshot: 'gateway:get-snapshot',
  gatewayOpenPanel: 'gateway:open-panel',
  gatewayPickImages: 'gateway:pick-images',
  gatewayRefresh: 'gateway:refresh',
  gatewayResolveApproval: 'gateway:resolve-approval',
  gatewaySelectSession: 'gateway:select-session',
  gatewaySendMessage: 'gateway:send-message',
  appCopyText: 'app:copy-text',
  appSetMuted: 'app:set-muted',
  getSnapshot: 'app:get-snapshot',
  interact: 'app:interact',
  petCycleVariant: 'pet:cycle-variant',
  petDragEnd: 'pet:drag-end',
  petDragMove: 'pet:drag-move',
  petDragStart: 'pet:drag-start',
  petSetAllVariant: 'pet:set-all-variant',
  petRandomizeVariants: 'pet:randomize-variants',
  revealWindow: 'app:reveal-window',
  toggleClickThrough: 'app:toggle-click-through',
  togglePause: 'app:toggle-pause',
  toggleSoulMode: 'app:toggle-soul-mode'
} as const
