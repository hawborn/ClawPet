import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto'

import {
  DEFAULT_GATEWAY_SNAPSHOT,
  DEFAULT_SOUL_STATE,
  type GatewayActivityKind,
  type GatewayActiveRun,
  type GatewayApprovalDecision,
  type GatewayApprovalSummary,
  type GatewayConnectionState,
  type GatewayMessageSummary,
  type GatewayNodeSummary,
  type GatewayPresenceSummary,
  type GatewaySessionSummary,
  type GatewaySource,
  type GatewayTranscriptEntry,
  type OpenClawSnapshot,
  type SoulState,
  type SoulStatus
} from '@shared/ipc'

const CLIENT_ID = 'openclaw-macos'
const CLIENT_MODE = 'ui'
const CLIENT_SCOPES = ['operator.read', 'operator.write', 'operator.approvals'] as const
const DEVICE_FAMILY = 'desktop'
const PROTOCOL_VERSION = 3
const REFRESH_INTERVAL_MS = 20_000
const RECONNECT_BASE_MS = 1_500
const RECONNECT_MAX_MS = 15_000
const CONNECT_TIMEOUT_MS = 8_000
const RECENT_MESSAGES_LIMIT = 12
const TRANSCRIPT_LIMIT = 160
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

interface GatewayConfig {
  gatewayUrl: string
  source: GatewaySource
  sourcePath: string
  token?: string
}

interface OpenClawConfigFile {
  gateway?: {
    port?: number
    auth?: {
      token?: string
    }
  }
}

interface DeviceIdentity {
  deviceId: string
  privateKeyPem: string
  publicKeyPem: string
}

interface PendingRequest {
  reject: (reason?: unknown) => void
  resolve: (value: unknown) => void
}

type GatewayEventPayload = Record<string, unknown>

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function derivePublicKeyRaw(publicKeyPem: string) {
  const spki = createPublicKey(publicKeyPem).export({
    type: 'spki',
    format: 'der'
  }) as Buffer

  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length)
  }

  return spki
}

function fingerprintPublicKey(publicKeyPem: string) {
  return createHash('sha256').update(derivePublicKeyRaw(publicKeyPem)).digest('hex')
}

function buildDeviceAuthPayloadV3(params: {
  clientId: string
  clientMode: string
  deviceFamily: string
  deviceId: string
  nonce: string
  platform: string
  role: string
  scopes: string[]
  signedAtMs: number
  token?: string
}) {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
    params.platform.toLowerCase(),
    params.deviceFamily.toLowerCase()
  ].join('|')
}

function normalizeTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ''
  }

  const parts: string[] = []

  for (const part of content) {
    if (!part || typeof part !== 'object') {
      continue
    }

    const record = part as Record<string, unknown>
    const type = normalizeTrimmedString(record.type)

    if (type === 'text' || type === 'input_text') {
      const text = normalizeTrimmedString(record.text)
      if (text) {
        parts.push(text)
      }
      continue
    }

    if (type === 'thinking') {
      const thinking = normalizeTrimmedString(record.thinking)
      if (thinking) {
        parts.push(thinking)
      }
      continue
    }

    if (type === 'toolCall') {
      const toolName = normalizeTrimmedString(record.name)
      if (toolName) {
        parts.push(`[tool:${toolName}]`)
      }
    }
  }

  return parts.join('\n').trim()
}

function summarizeToolArguments(args: unknown) {
  if (!args || typeof args !== 'object') {
    return ''
  }

  const record = args as Record<string, unknown>
  const preferred =
    normalizeTrimmedString(record.path) ||
    normalizeTrimmedString(record.command) ||
    normalizeTrimmedString(record.rawCommand) ||
    normalizeTrimmedString(record.url) ||
    normalizeTrimmedString(record.filePath)

  if (preferred) {
    return preferred
  }

  try {
    return JSON.stringify(record).slice(0, 240)
  } catch {
    return ''
  }
}

function normalizeTranscriptEntries(
  sessionKey: string,
  rawMessages: unknown[]
): GatewayTranscriptEntry[] {
  const transcript: GatewayTranscriptEntry[] = []

  rawMessages.forEach((rawMessage, messageIndex) => {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return
    }

    const message = rawMessage as Record<string, unknown>
    const role = normalizeTrimmedString(message.role) || 'assistant'
    const timestamp = typeof message.timestamp === 'number' ? message.timestamp : undefined

    if (role === 'toolResult') {
      const toolName = normalizeTrimmedString(message.toolName) || 'tool'
      const text =
        normalizeMessageText(message.content) ||
        normalizeTrimmedString(message.output) ||
        normalizeTrimmedString(message.result) ||
        '[工具结果]'

      transcript.push({
        id: `${sessionKey}-${messageIndex}-tool-result`,
        kind: 'tool-result',
        role: 'tool',
        sessionKey,
        text,
        timestamp,
        toolName
      })
      return
    }

    const content = Array.isArray(message.content) ? message.content : []

    if (content.length === 0) {
      const text = normalizeMessageText(message.content)

      if (text) {
        transcript.push({
          id: `${sessionKey}-${messageIndex}-text`,
          kind: 'text',
          role,
          sessionKey,
          text,
          timestamp
        })
      }

      return
    }

    content.forEach((part, partIndex) => {
      if (!part || typeof part !== 'object') {
        return
      }

      const record = part as Record<string, unknown>
      const type = normalizeTrimmedString(record.type)

      if (type === 'text' || type === 'input_text') {
        const text = normalizeTrimmedString(record.text)

        if (!text) {
          return
        }

        transcript.push({
          id: `${sessionKey}-${messageIndex}-${partIndex}-text`,
          kind: 'text',
          role,
          sessionKey,
          text,
          timestamp
        })
        return
      }

      if (type === 'thinking') {
        const text = normalizeTrimmedString(record.thinking) || '[思考中]'
        transcript.push({
          id: `${sessionKey}-${messageIndex}-${partIndex}-thinking`,
          kind: 'thinking',
          role,
          sessionKey,
          text,
          timestamp
        })
        return
      }

      if (type === 'toolCall') {
        const toolName = normalizeTrimmedString(record.name) || 'tool'
        const text =
          summarizeToolArguments(record.arguments) ||
          normalizeTrimmedString(record.partialJson) ||
          '[工具调用]'

        transcript.push({
          id: `${sessionKey}-${messageIndex}-${partIndex}-tool-call`,
          kind: 'tool-call',
          role,
          sessionKey,
          text,
          timestamp,
          toolName
        })
      }
    })
  })

  return transcript.slice(-TRANSCRIPT_LIMIT)
}

function pushTranscriptEntry(
  transcript: GatewayTranscriptEntry[],
  entry: GatewayTranscriptEntry
): GatewayTranscriptEntry[] {
  const previous = transcript[transcript.length - 1]

  if (
    previous &&
    previous.sessionKey === entry.sessionKey &&
    previous.kind === entry.kind &&
    previous.role === entry.role &&
    previous.toolName === entry.toolName &&
    previous.text === entry.text
  ) {
    return transcript
  }

  return [...transcript, entry].slice(-TRANSCRIPT_LIMIT)
}

function shortenLabel(input: string, maxLength = 48) {
  const normalized = input.trim().replace(/\s+/g, ' ')

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1)}…`
}

function classifySessionRole(sessionKey: string, defaultAgentId?: string) {
  const normalized = sessionKey.trim().toLowerCase()

  if (!normalized) {
    return 'other' as const
  }

  if (normalized === 'main' || normalized.endsWith(':main')) {
    return 'main' as const
  }

  if (defaultAgentId && normalized === `agent:${defaultAgentId.toLowerCase()}:main`) {
    return 'main' as const
  }

  return 'other' as const
}

function classifyToolActivityKind(toolName: string) {
  const normalized = toolName.trim().toLowerCase()

  if (!normalized) {
    return 'tool' as GatewayActivityKind
  }

  if (normalized.includes('read')) {
    return 'read'
  }

  if (
    normalized.includes('edit') ||
    normalized.includes('patch') ||
    normalized.includes('replace') ||
    normalized.includes('apply')
  ) {
    return 'edit'
  }

  if (
    normalized.includes('write') ||
    normalized.includes('append') ||
    normalized.includes('create') ||
    normalized.includes('save')
  ) {
    return 'write'
  }

  if (
    normalized.includes('exec') ||
    normalized.includes('run') ||
    normalized.includes('shell') ||
    normalized.includes('process') ||
    normalized.includes('terminal')
  ) {
    return 'exec'
  }

  if (
    normalized.includes('attach') ||
    normalized.includes('upload') ||
    normalized.includes('image') ||
    normalized.includes('screenshot') ||
    normalized.includes('camera')
  ) {
    return 'attach'
  }

  return 'tool'
}

function readArgString(args: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = args[key]
    const normalized = normalizeTrimmedString(value)
    if (normalized) {
      return normalized
    }
  }

  return ''
}

function summarizeToolActivity(
  toolName: string,
  args: Record<string, unknown>,
  meta: Record<string, unknown>
) {
  const kind = classifyToolActivityKind(toolName)
  const command =
    readArgString(args, ['command', 'rawCommand', 'cmd']) ||
    (Array.isArray(args.argv)
      ? args.argv.filter((value): value is string => typeof value === 'string').join(' ')
      : '')
  const pathLike =
    readArgString(args, ['path', 'filePath', 'to', 'dst', 'outputPath', 'inputPath']) ||
    readArgString(meta, ['path', 'filePath', 'summary'])

  switch (kind) {
    case 'exec':
      return {
        activityKind: kind,
        label: shortenLabel(command || toolName)
      }
    case 'read':
    case 'write':
    case 'edit':
    case 'attach':
      return {
        activityKind: kind,
        label: shortenLabel(pathLike || toolName)
      }
    default:
      return {
        activityKind: kind,
        label: shortenLabel(toolName)
      }
  }
}

function formatSessionLabel(session: GatewaySessionSummary) {
  return session.displayName || session.key
}

function parseApproval(payload: GatewayEventPayload): GatewayApprovalSummary | null {
  const id = normalizeTrimmedString(payload.id)

  if (!id) {
    return null
  }

  const nestedRequest =
    payload.request && typeof payload.request === 'object'
      ? (payload.request as Record<string, unknown>)
      : null

  const rawCommand =
    normalizeTrimmedString(payload.rawCommand) ||
    normalizeTrimmedString(nestedRequest?.rawCommand) ||
    normalizeTrimmedString(nestedRequest?.command)

  return {
    action: normalizeTrimmedString(payload.action) || normalizeTrimmedString(nestedRequest?.action),
    agentId: normalizeTrimmedString(payload.agentId) || normalizeTrimmedString(nestedRequest?.agentId),
    command: rawCommand,
    cwd: normalizeTrimmedString(payload.cwd) || normalizeTrimmedString(nestedRequest?.cwd),
    expiresAtMs: typeof payload.expiresAtMs === 'number' ? payload.expiresAtMs : undefined,
    host: normalizeTrimmedString(payload.host) || normalizeTrimmedString(nestedRequest?.host),
    id,
    sessionKey:
      normalizeTrimmedString(payload.sessionKey) || normalizeTrimmedString(nestedRequest?.sessionKey)
  }
}

async function detectGatewayConfig(): Promise<GatewayConfig | null> {
  const explicitUrl = normalizeTrimmedString(process.env.CLAWPET_OPENCLAW_WS_URL)
  const explicitToken = normalizeTrimmedString(process.env.CLAWPET_OPENCLAW_TOKEN)

  if (explicitUrl) {
    return {
      gatewayUrl: explicitUrl,
      source: 'custom',
      sourcePath: explicitUrl,
      token: explicitToken || undefined
    }
  }

  const candidates: Array<{ path: string; source: GatewaySource }> = [
    { path: join(homedir(), '.openclaw', 'openclaw.json'), source: 'openclaw' },
    { path: join(homedir(), '.qclaw', 'openclaw.json'), source: 'qclaw' }
  ]

  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) {
      continue
    }

    try {
      const raw = await readFile(candidate.path, 'utf8')
      const parsed = JSON.parse(raw) as OpenClawConfigFile
      const port = parsed.gateway?.port ?? (candidate.source === 'qclaw' ? 28789 : 18789)
      const token = normalizeTrimmedString(parsed.gateway?.auth?.token)

      return {
        gatewayUrl: `ws://127.0.0.1:${port}`,
        source: candidate.source,
        sourcePath: candidate.path,
        token: token || undefined
      }
    } catch {
      continue
    }
  }

  return null
}

export class OpenClawGatewayClient {
  private activeRuns = new Map<string, GatewayActiveRun>()
  private config: GatewayConfig | null = null
  private connectTimer: NodeJS.Timeout | null = null
  private connectNonce = ''
  private connectResponseId = ''
  private identity: DeviceIdentity | null = null
  private lastActivityAt = 0
  private lastChatEventState = ''
  private lastTickAt = 0
  private pending = new Map<string, PendingRequest>()
  private reconnectTimer: NodeJS.Timeout | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private snapshot: OpenClawSnapshot = { ...DEFAULT_GATEWAY_SNAPSHOT }
  private soul: SoulState = { ...DEFAULT_SOUL_STATE }
  private tickIntervalMs = 30_000
  private tickTimer: NodeJS.Timeout | null = null
  private ws: WebSocket | null = null
  private backoffMs = RECONNECT_BASE_MS
  private isStopped = false
  private currentConnectionState: GatewayConnectionState = 'unconfigured'

  constructor(
    private readonly stateDir: string,
    private readonly onUpdate: (snapshot: OpenClawSnapshot, soul: SoulState) => void
  ) {}

  async start() {
    this.isStopped = false
    this.config = await detectGatewayConfig()

    if (!this.config) {
      this.setConnectionState('unconfigured')
      this.snapshot = {
        ...DEFAULT_GATEWAY_SNAPSHOT,
        configured: false,
        connectionState: 'unconfigured'
      }
      this.soul = { ...DEFAULT_SOUL_STATE }
      this.emitUpdate()
      return
    }

    this.snapshot = {
      ...DEFAULT_GATEWAY_SNAPSHOT,
      configured: true,
      connectionState: 'connecting',
      gatewayUrl: this.config.gatewayUrl,
      source: this.config.source,
      sourcePath: this.config.sourcePath
    }
    this.identity = this.loadOrCreateIdentity()
    this.setConnectionState('connecting')
    this.emitUpdate()
    this.connect()
  }

  stop() {
    this.isStopped = true

    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }

    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }

    this.rejectPending(new Error('OpenClaw gateway client stopped'))
    this.ws?.close()
    this.ws = null
  }

  getSnapshot() {
    return { ...this.snapshot }
  }

  getSoulState() {
    return { ...this.soul }
  }

  async refresh() {
    if (!this.ws || !this.isConnected()) {
      return
    }

    await this.refreshCoreData()
  }

  async sendMessage(message: string, sessionKey?: string) {
    const targetSessionKey = (sessionKey || this.snapshot.activeSessionKey).trim()

    if (!targetSessionKey) {
      throw new Error('No active OpenClaw session selected')
    }

    const payload = await this.request<{ runId: string }>('chat.send', {
      sessionKey: targetSessionKey,
      message,
      idempotencyKey: `clawpet-${Date.now()}-${randomUUID()}`
    })

    const startedAt = Date.now()
    const optimisticUserEntry: GatewayTranscriptEntry = {
      id: `local-user-${startedAt}`,
      kind: 'text',
      role: 'user',
      sessionKey: targetSessionKey,
      text: message,
      timestamp: startedAt
    }
    this.snapshot = {
      ...this.snapshot,
      activeSessionKey: targetSessionKey,
      lastEventAt: startedAt,
      transcript: [...this.snapshot.transcript, optimisticUserEntry].slice(-TRANSCRIPT_LIMIT),
      liveTranscript: {
        id: `live-${normalizeTrimmedString(payload.runId) || randomUUID()}`,
        kind: 'status',
        role: 'assistant',
        sessionKey: targetSessionKey,
        text: '...',
        timestamp: startedAt
      }
    }
    this.setActiveRun({
      activityKind: 'write',
      label: '等待 OpenClaw 回复',
      phase: 'started',
      runId: normalizeTrimmedString(payload.runId) || randomUUID(),
      sessionKey: targetSessionKey,
      startedAt,
      stream: 'chat',
      summary: '等待 OpenClaw 回复',
      updatedAt: startedAt
    })
    this.lastActivityAt = startedAt
    this.emitUpdate()
  }

  async abortRun(sessionKey?: string) {
    const targetSessionKey = (sessionKey || this.snapshot.activeSessionKey).trim()

    if (!targetSessionKey) {
      return
    }

    await this.request('chat.abort', {
      sessionKey: targetSessionKey,
      runId:
        this.snapshot.activeRun && this.snapshot.activeRun.sessionKey === targetSessionKey
          ? this.snapshot.activeRun.runId
          : undefined
    })
  }

  async selectSession(sessionKey: string) {
    const nextKey = sessionKey.trim()

    if (!nextKey) {
      return
    }

    this.snapshot = {
      ...this.snapshot,
      activeSessionKey: nextKey
    }
    this.emitUpdate()
    await this.refreshHistory(nextKey)
  }

  async resolveApproval(id: string, decision: GatewayApprovalDecision) {
    await this.request('exec.approval.resolve', { id, decision })
  }

  private clearActiveRun(sessionKey: string, runId?: string) {
    const current = this.activeRuns.get(sessionKey)

    if (!current) {
      return
    }

    if (runId && current.runId !== runId) {
      return
    }

    this.activeRuns.delete(sessionKey)
    this.syncPreferredActiveRun()
  }

  private pruneApprovals() {
    const now = Date.now()
    const nextApprovals = this.snapshot.approvals.filter(
      (approval) => !approval.expiresAtMs || approval.expiresAtMs > now
    )

    if (nextApprovals.length !== this.snapshot.approvals.length) {
      this.snapshot = {
        ...this.snapshot,
        approvals: nextApprovals
      }
    }
  }

  private setActiveRun(run: GatewayActiveRun) {
    this.activeRuns.set(run.sessionKey, run)
    this.syncPreferredActiveRun()
  }

  private syncPreferredActiveRun() {
    if (this.activeRuns.size === 0) {
      this.snapshot = {
        ...this.snapshot,
        activeRun: null
      }
      return
    }

    const runs = [...this.activeRuns.values()].sort((leftRun, rightRun) => {
      const leftRole = classifySessionRole(leftRun.sessionKey, this.snapshot.defaultAgentId)
      const rightRole = classifySessionRole(rightRun.sessionKey, this.snapshot.defaultAgentId)

      if (leftRole !== rightRole) {
        return leftRole === 'main' ? -1 : 1
      }

      return rightRun.updatedAt - leftRun.updatedAt
    })

    this.snapshot = {
      ...this.snapshot,
      activeRun: runs[0] ?? null
    }
  }

  private connect() {
    if (!this.config || this.isStopped) {
      return
    }

    this.rejectPending(new Error('OpenClaw gateway reconnecting'))
    this.activeRuns.clear()

    this.connectNonce = ''
    this.connectResponseId = ''
    this.ws?.close()

    const ws = new WebSocket(this.config.gatewayUrl)
    this.ws = ws

    this.connectTimer = setTimeout(() => {
      this.setConnectionState('disconnected')
      this.snapshot = {
        ...this.snapshot,
        connected: false,
        lastError: 'OpenClaw Gateway 握手超时'
      }
      this.emitUpdate()
      ws.close()
    }, CONNECT_TIMEOUT_MS)

    ws.addEventListener('message', (event) => {
      void this.handleMessage(String(event.data))
    })

    ws.addEventListener('close', () => {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer)
        this.connectTimer = null
      }

      this.setConnectionState('disconnected')
      this.snapshot = {
        ...this.snapshot,
        connected: false
      }
      this.emitUpdate()
      this.scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      this.setConnectionState('error')
      this.snapshot = {
        ...this.snapshot,
        connected: false,
        lastError: 'OpenClaw Gateway 连接失败'
      }
      this.emitUpdate()
    })
  }

  private async handleMessage(rawMessage: string) {
    let frame: Record<string, unknown>

    try {
      frame = JSON.parse(rawMessage) as Record<string, unknown>
    } catch {
      return
    }

    const type = normalizeTrimmedString(frame.type)

    if (type === 'event') {
      const eventName = normalizeTrimmedString(frame.event)
      const payload =
        frame.payload && typeof frame.payload === 'object'
          ? (frame.payload as GatewayEventPayload)
          : {}

      if (eventName === 'connect.challenge') {
        await this.sendConnect(payload)
        return
      }

      this.handleEvent(eventName, payload)
      return
    }

    if (type !== 'res') {
      return
    }

    const id = normalizeTrimmedString(frame.id)
    const ok = frame.ok === true
    const payload = frame.payload
    const error = frame.error

    if (id === this.connectResponseId) {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer)
        this.connectTimer = null
      }

      if (!ok || !payload || typeof payload !== 'object') {
        const message =
          error && typeof error === 'object'
            ? normalizeTrimmedString((error as Record<string, unknown>).message)
            : 'OpenClaw Gateway 连接失败'

        this.setConnectionState('error')
        this.snapshot = {
          ...this.snapshot,
          connected: false,
          lastError: message
        }
        this.emitUpdate()
        this.ws?.close()
        return
      }

      const hello = payload as Record<string, unknown>
      const snapshot =
        hello.snapshot && typeof hello.snapshot === 'object'
          ? (hello.snapshot as Record<string, unknown>)
          : {}

      const health =
        snapshot.health && typeof snapshot.health === 'object'
          ? (snapshot.health as Record<string, unknown>)
          : {}

      const presence = this.normalizePresence(snapshot.presence)
      const defaultAgentId = normalizeTrimmedString(health.defaultAgentId)
      const activeSessionKey =
        normalizeTrimmedString(
          snapshot.sessionDefaults &&
            typeof snapshot.sessionDefaults === 'object' &&
            (snapshot.sessionDefaults as Record<string, unknown>).mainSessionKey
        ) || this.snapshot.activeSessionKey

      this.setConnectionState('connected')
      this.snapshot = {
        ...this.snapshot,
        activeSessionKey,
        connected: true,
        defaultAgentId: defaultAgentId || this.snapshot.defaultAgentId,
        lastError: '',
        presence
      }
      this.backoffMs = RECONNECT_BASE_MS
      this.lastTickAt = Date.now()
      this.tickIntervalMs =
        hello.policy && typeof hello.policy === 'object'
          ? Number((hello.policy as Record<string, unknown>).tickIntervalMs) || 30_000
          : 30_000
      this.emitUpdate()
      this.startTickWatch()
      this.startRefreshLoop()
      await this.refreshCoreData()
      return
    }

    const pending = this.pending.get(id)

    if (!pending) {
      return
    }

    this.pending.delete(id)
    if (ok) {
      pending.resolve(payload)
    } else {
      pending.reject(error)
    }
  }

  private handleAgentEvent(payload: GatewayEventPayload) {
    const runId = normalizeTrimmedString(payload.runId)
    const sessionKey = normalizeTrimmedString(payload.sessionKey)
    const stream = normalizeTrimmedString(payload.stream) || 'agent'
    const data =
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : {}
    const phase = normalizeTrimmedString(data.phase)
    const eventTimestamp =
      typeof payload.ts === 'number'
        ? payload.ts
        : typeof data.startedAt === 'number'
          ? data.startedAt
          : Date.now()

    this.lastActivityAt = eventTimestamp
    this.snapshot = {
      ...this.snapshot,
      lastEventAt: eventTimestamp
    }

    if (!runId || !sessionKey) {
      this.emitUpdate()
      return
    }

    if (stream === 'lifecycle') {
      if (phase === 'end') {
        this.clearActiveRun(sessionKey, runId)
        this.emitUpdate()
        return
      }

      if (phase === 'error') {
        const errorMessage = normalizeTrimmedString(data.error) || 'OpenClaw 运行出错'
        this.snapshot = {
          ...this.snapshot,
          lastError: errorMessage
        }
        this.clearActiveRun(sessionKey, runId)
        this.emitUpdate()
        return
      }

      const existingRun = this.activeRuns.get(sessionKey)
      this.setActiveRun({
        activityKind: existingRun?.activityKind ?? 'job',
        label: existingRun?.label ?? '准备运行',
        phase: phase || 'start',
        runId,
        sessionKey,
        startedAt: existingRun?.startedAt ?? eventTimestamp,
        stream,
        summary: phase ? `生命周期 · ${phase}` : '生命周期',
        updatedAt: eventTimestamp
      })
      this.emitUpdate()
      return
    }

    if (stream === 'assistant') {
      this.setActiveRun({
        activityKind: 'write',
        label: '正在组织回复',
        phase: phase || 'stream',
        runId,
        sessionKey,
        startedAt: eventTimestamp,
        stream,
        summary: 'assistant:stream',
        updatedAt: eventTimestamp
      })
      this.emitUpdate()
      return
    }

    if (stream === 'job') {
      const state = normalizeTrimmedString(data.state)

      if (state === 'done') {
        this.clearActiveRun(sessionKey, runId)
        this.emitUpdate()
        return
      }

      if (state === 'error') {
        this.snapshot = {
          ...this.snapshot,
          lastError: normalizeTrimmedString(data.error) || 'OpenClaw 任务失败'
        }
        this.clearActiveRun(sessionKey, runId)
        this.emitUpdate()
        return
      }

      const label =
        shortenLabel(
          normalizeTrimmedString(data.label) ||
            normalizeTrimmedString(data.summary) ||
            normalizeTrimmedString(data.command) ||
            'OpenClaw 正在运行任务'
        ) || 'OpenClaw 正在运行任务'

      this.setActiveRun({
        activityKind: 'job',
        label,
        phase: state || 'started',
        runId,
        sessionKey,
        startedAt: eventTimestamp,
        stream,
        summary: state ? `job:${state}` : 'job',
        updatedAt: eventTimestamp
      })
      this.emitUpdate()
      return
    }

    if (stream === 'tool') {
      const toolName =
        normalizeTrimmedString(data.name) ||
        normalizeTrimmedString(payload.name) ||
        normalizeTrimmedString(data.toolName) ||
        'tool'
      const args =
        data.args && typeof data.args === 'object' ? (data.args as Record<string, unknown>) : {}
      const meta =
        data.meta && typeof data.meta === 'object' ? (data.meta as Record<string, unknown>) : {}
      const { activityKind, label } = summarizeToolActivity(toolName, args, meta)

      this.setActiveRun({
        activityKind,
        label,
        phase: phase || 'start',
        runId,
        sessionKey,
        startedAt: eventTimestamp,
        stream,
        summary: phase ? `${toolName}:${phase}` : toolName,
        updatedAt: eventTimestamp
      })
      this.emitUpdate()
      return
    }

    this.setActiveRun({
      activityKind: 'tool',
      label: shortenLabel(stream),
      phase: phase || 'stream',
      runId,
      sessionKey,
      startedAt: eventTimestamp,
      stream,
      summary: phase ? `${stream}:${phase}` : stream,
      updatedAt: eventTimestamp
    })
    this.emitUpdate()
  }

  private handleChatEvent(payload: GatewayEventPayload) {
    const runId = normalizeTrimmedString(payload.runId)
    const sessionKey = normalizeTrimmedString(payload.sessionKey)
    const state = normalizeTrimmedString(payload.state)
    const message =
      payload.message && typeof payload.message === 'object'
        ? (payload.message as Record<string, unknown>)
        : {}
    const role = normalizeTrimmedString(message.role) || 'assistant'
    const content = normalizeMessageText(message.content)
    const timestamp =
      typeof payload.ts === 'number'
        ? payload.ts
        : typeof message.timestamp === 'number'
          ? message.timestamp
          : Date.now()

    this.lastChatEventState = state
    this.lastActivityAt = Date.now()
    this.snapshot = {
      ...this.snapshot,
      lastEventAt: timestamp
    }

    if (content) {
      const nextMessage: GatewayMessageSummary = {
        id: `${runId || randomUUID()}-${timestamp}`,
        role,
        sessionKey,
        text: content,
        timestamp
      }

      const recentMessages = [nextMessage, ...this.snapshot.recentMessages].slice(
        0,
        RECENT_MESSAGES_LIMIT
      )

      this.snapshot = {
        ...this.snapshot,
        liveTranscript:
          role === 'assistant' && state !== 'final' && state !== 'aborted' && state !== 'error'
            ? {
                id: `live-${runId || sessionKey}`,
                kind: 'text',
                role,
                sessionKey,
                text: content,
                timestamp
              }
            : this.snapshot.liveTranscript,
        recentMessages
      }
    }

    if (state === 'final' || state === 'aborted' || state === 'error') {
      this.clearActiveRun(sessionKey, runId)
      this.snapshot = {
        ...this.snapshot,
        liveTranscript: null
      }

      this.emitUpdate()

      if (sessionKey) {
        void this.refreshHistory(sessionKey)
        void this.refreshSessions()
      }

      return
    }

    if (runId && sessionKey) {
      this.setActiveRun({
        activityKind: 'write',
        label: '正在回复',
        phase: state || 'streaming',
        runId,
        sessionKey,
        startedAt: timestamp,
        stream: 'chat',
        summary: state || 'streaming',
        updatedAt: timestamp
      })
    }

    this.emitUpdate()
  }

  private handleEvent(eventName: string, payload: GatewayEventPayload) {
    if (eventName === 'tick') {
      this.lastTickAt = Date.now()
      return
    }

    if (eventName === 'presence') {
      this.snapshot = {
        ...this.snapshot,
        presence: this.normalizePresence(payload.presence)
      }
      this.emitUpdate()
      return
    }

    if (eventName === 'health') {
      const defaultAgentId = normalizeTrimmedString(payload.defaultAgentId)
      this.snapshot = {
        ...this.snapshot,
        defaultAgentId: defaultAgentId || this.snapshot.defaultAgentId
      }
      this.emitUpdate()
      return
    }

    if (eventName === 'chat') {
      this.handleChatEvent(payload)
      return
    }

    if (eventName === 'agent') {
      this.handleAgentEvent(payload)
      return
    }

    if (eventName === 'exec.approval.requested') {
      const approval = parseApproval(payload)

      if (!approval) {
        return
      }

      const approvals = [approval, ...this.snapshot.approvals.filter((item) => item.id !== approval.id)]
      this.snapshot = {
        ...this.snapshot,
        approvals
      }
      this.lastActivityAt = Date.now()
      this.emitUpdate()
      return
    }

    if (eventName === 'exec.approval.resolved') {
      const approvalId = normalizeTrimmedString(payload.id)

      if (!approvalId) {
        return
      }

      this.snapshot = {
        ...this.snapshot,
        approvals: this.snapshot.approvals.filter((approval) => approval.id !== approvalId)
      }
      this.emitUpdate()
    }
  }

  private async refreshCoreData() {
    await Promise.all([this.refreshPresence(), this.refreshSessions(), this.refreshNodes()])

    const activeSessionKey =
      this.snapshot.activeSessionKey || this.snapshot.sessions[0]?.key || 'agent:main:main'

    if (activeSessionKey) {
      this.snapshot = {
        ...this.snapshot,
        activeSessionKey
      }
      await this.refreshHistory(activeSessionKey)
    }
  }

  private async refreshHistory(sessionKey: string) {
    try {
      const result = await this.request<Record<string, unknown>>('chat.history', {
        sessionKey,
        limit: 200
      })
      const rawMessages = Array.isArray(result.messages) ? result.messages : []
      const recentMessages: GatewayMessageSummary[] = []

      for (let index = rawMessages.length - 1; index >= 0; index -= 1) {
        const rawMessage = rawMessages[index]
        if (!rawMessage || typeof rawMessage !== 'object') {
          continue
        }

        const message = rawMessage as Record<string, unknown>
        const role = normalizeTrimmedString(message.role)

        if (!role || role === 'toolResult') {
          continue
        }

        const text = normalizeMessageText(message.content)

        if (!text) {
          continue
        }

        recentMessages.unshift({
          id: `${sessionKey}-${index}`,
          role,
          sessionKey,
          text,
          timestamp: typeof message.timestamp === 'number' ? message.timestamp : undefined
        })
      }

      this.snapshot = {
        ...this.snapshot,
        activeSessionKey: sessionKey,
        liveTranscript: null,
        recentMessages: recentMessages.slice(-RECENT_MESSAGES_LIMIT).reverse(),
        transcript: normalizeTranscriptEntries(sessionKey, rawMessages)
      }
      this.emitUpdate()
    } catch {
      return
    }
  }

  private async refreshNodes() {
    try {
      const result = await this.request<Record<string, unknown>>('node.list', {})
      const rawNodes = Array.isArray(result.nodes) ? result.nodes : []
      const nodes: GatewayNodeSummary[] = []

      for (const rawNode of rawNodes) {
        if (!rawNode || typeof rawNode !== 'object') {
          continue
        }

        const node = rawNode as Record<string, unknown>
        const nodeId = normalizeTrimmedString(node.nodeId) || normalizeTrimmedString(node.id)

        if (!nodeId) {
          continue
        }

        nodes.push({
          caps: Array.isArray(node.caps)
            ? node.caps.filter((value): value is string => typeof value === 'string')
            : undefined,
          connected: typeof node.connected === 'boolean' ? node.connected : undefined,
          displayName: normalizeTrimmedString(node.displayName) || nodeId,
          nodeId,
          paired: typeof node.paired === 'boolean' ? node.paired : undefined,
          platform: normalizeTrimmedString(node.platform) || undefined
        })
      }

      this.snapshot = {
        ...this.snapshot,
        nodes
      }
      this.emitUpdate()
    } catch {
      return
    }
  }

  private async refreshPresence() {
    try {
      const result = await this.request<unknown>('system-presence', {})
      this.snapshot = {
        ...this.snapshot,
        presence: this.normalizePresence(result)
      }
      this.emitUpdate()
    } catch {
      return
    }
  }

  private async refreshSessions() {
    try {
      const result = await this.request<Record<string, unknown>>('sessions.list', {})
      const rawSessions = Array.isArray(result.sessions) ? result.sessions : []
      const sessions: GatewaySessionSummary[] = []

      for (const rawSession of rawSessions) {
        if (!rawSession || typeof rawSession !== 'object') {
          continue
        }

        const session = rawSession as Record<string, unknown>
        const key = normalizeTrimmedString(session.key)

        if (!key) {
          continue
        }

        const origin =
          session.origin && typeof session.origin === 'object'
            ? (session.origin as Record<string, unknown>)
            : {}

        sessions.push({
          chatType: normalizeTrimmedString(session.chatType) || undefined,
          displayName: normalizeTrimmedString(session.displayName) || key,
          key,
          kind: normalizeTrimmedString(session.kind) || undefined,
          lastChannel:
            normalizeTrimmedString(session.lastChannel) ||
            normalizeTrimmedString(session.channel) ||
            undefined,
          model: normalizeTrimmedString(session.model) || undefined,
          modelProvider: normalizeTrimmedString(session.modelProvider) || undefined,
          originLabel: normalizeTrimmedString(origin.label) || undefined,
          sessionId: normalizeTrimmedString(session.sessionId) || undefined,
          totalTokens: typeof session.totalTokens === 'number' ? session.totalTokens : undefined,
          updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : undefined
        })
      }

      const activeSessionKey =
        this.snapshot.activeSessionKey || sessions[0]?.key || this.snapshot.activeSessionKey

      this.snapshot = {
        ...this.snapshot,
        activeSessionKey,
        sessions
      }
      this.emitUpdate()
    } catch {
      return
    }
  }

  private loadOrCreateIdentity() {
    const identityPath = join(this.stateDir, 'openclaw', 'device.json')

    try {
      if (existsSync(identityPath)) {
        const raw = JSON.parse(readFileSync(identityPath, 'utf8')) as DeviceIdentity
        const deviceId = fingerprintPublicKey(raw.publicKeyPem)

        if (deviceId) {
          return {
            deviceId,
            privateKeyPem: raw.privateKeyPem,
            publicKeyPem: raw.publicKeyPem
          }
        }
      }
    } catch {
      // Fall through and regenerate.
    }

    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const identity = {
      deviceId: fingerprintPublicKey(
        publicKey.export({
          type: 'spki',
          format: 'pem'
        }).toString()
      ),
      publicKeyPem: publicKey
        .export({
          type: 'spki',
          format: 'pem'
        })
        .toString(),
      privateKeyPem: privateKey
        .export({
          type: 'pkcs8',
          format: 'pem'
        })
        .toString()
    }

    mkdirSync(join(this.stateDir, 'openclaw'), { recursive: true })
    writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`)
    return identity
  }

  private normalizePresence(input: unknown) {
    const rawPresence = Array.isArray(input)
      ? input
      : input && typeof input === 'object' && Array.isArray((input as Record<string, unknown>).presence)
        ? ((input as Record<string, unknown>).presence as unknown[])
        : []

    const normalized: GatewayPresenceSummary[] = []

    for (const entry of rawPresence) {
      if (!entry || typeof entry !== 'object') {
        continue
      }

      const record = entry as Record<string, unknown>
      const text = normalizeTrimmedString(record.text)

      if (!text) {
        continue
      }

      normalized.push({
        deviceId: normalizeTrimmedString(record.deviceId) || undefined,
        mode: normalizeTrimmedString(record.mode) || undefined,
        reason: normalizeTrimmedString(record.reason) || undefined,
        text,
        ts: typeof record.ts === 'number' ? record.ts : undefined
      })
    }

    return normalized
  }

  private isConnected() {
    return this.snapshot.connected && this.ws?.readyState === WebSocket.OPEN
  }

  private setConnectionState(state: GatewayConnectionState) {
    if (this.currentConnectionState !== state) {
      this.currentConnectionState = state
      this.snapshot = {
        ...this.snapshot,
        connectionState: state,
        connectionStateChangedAt: Date.now()
      }
    }
  }

  private emitUpdate() {
    this.pruneApprovals()
    this.syncPreferredActiveRun()
    this.soul = this.deriveSoulState()
    this.onUpdate({ ...this.snapshot }, { ...this.soul })
  }

  private deriveSoulState(): SoulState {
    const now = new Date().toISOString()

    if (!this.snapshot.configured) {
      return {
        ...DEFAULT_SOUL_STATE,
        active: false,
        source: this.snapshot.source,
        sourcePath: this.snapshot.sourcePath,
        updatedAt: now
      }
    }

    if (!this.snapshot.connected) {
      return {
        active: true,
        description: this.snapshot.lastError || 'OpenClaw Gateway 离线',
        source: this.snapshot.source,
        sourcePath: this.snapshot.sourcePath,
        status: 'error',
        updatedAt: now
      }
    }

    if (this.snapshot.approvals.length > 0) {
      const approval = this.snapshot.approvals[0]
      return {
        active: true,
        description: approval.command || '等待你确认执行请求',
        source: this.snapshot.source,
        sourcePath: this.snapshot.sourcePath,
        status: 'waiting',
        updatedAt: now
      }
    }

    if (this.snapshot.activeRun) {
      let status: SoulStatus = 'running'

      switch (this.snapshot.activeRun.activityKind) {
        case 'read':
          status = 'thinking'
          break
        case 'write':
        case 'edit':
          status = 'coding'
          break
        case 'exec':
        case 'attach':
        case 'job':
          status = 'running'
          break
        default:
          status = 'running'
      }

      return {
        active: true,
        description: this.snapshot.activeRun.label || `OpenClaw 正在处理 ${this.snapshot.activeRun.sessionKey}`,
        source: this.snapshot.source,
        sourcePath: this.snapshot.sourcePath,
        status,
        updatedAt: now
      }
    }

    const activeSession = this.snapshot.sessions.find(
      (session) => session.key === this.snapshot.activeSessionKey
    )

    if (Date.now() - this.lastActivityAt < 20_000) {
      return {
        active: true,
        description: activeSession ? formatSessionLabel(activeSession) : 'OpenClaw 在线',
        source: this.snapshot.source,
        sourcePath: this.snapshot.sourcePath,
        status: this.lastChatEventState === 'delta' ? 'coding' : 'thinking',
        updatedAt: now
      }
    }

    return {
      active: true,
      description: activeSession ? formatSessionLabel(activeSession) : 'OpenClaw 待命中',
      source: this.snapshot.source,
      sourcePath: this.snapshot.sourcePath,
      status: 'idle',
      updatedAt: now
    }
  }

  private rejectPending(error: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(error)
    }

    this.pending.clear()
  }

  private request<T = unknown>(method: string, params: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('OpenClaw Gateway 未连接'))
    }

    const id = randomUUID()

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      this.ws?.send(
        JSON.stringify({
          type: 'req',
          id,
          method,
          params
        })
      )
    })
  }

  private scheduleReconnect() {
    if (this.isStopped || this.reconnectTimer || !this.config) {
      return
    }

    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.backoffMs)

    this.backoffMs = Math.min(RECONNECT_MAX_MS, Math.round(this.backoffMs * 1.6))
  }

  private async sendConnect(payload: GatewayEventPayload) {
    if (!this.ws || !this.config || !this.identity) {
      return
    }

    const nonce = normalizeTrimmedString(payload.nonce)

    if (!nonce) {
      this.ws.close()
      return
    }

    this.connectNonce = nonce
    this.connectResponseId = randomUUID()
    const signedAt = Date.now()
    const signaturePayload = buildDeviceAuthPayloadV3({
      clientId: CLIENT_ID,
      clientMode: CLIENT_MODE,
      deviceFamily: DEVICE_FAMILY,
      deviceId: this.identity.deviceId,
      nonce,
      platform: process.platform,
      role: 'operator',
      scopes: [...CLIENT_SCOPES],
      signedAtMs: signedAt,
      token: this.config.token
    })

    const signature = base64UrlEncode(
      sign(null, Buffer.from(signaturePayload, 'utf8'), createPrivateKey(this.identity.privateKeyPem))
    )
    const publicKey = base64UrlEncode(derivePublicKeyRaw(this.identity.publicKeyPem))

    this.ws.send(
      JSON.stringify({
        type: 'req',
        id: this.connectResponseId,
        method: 'connect',
        params: {
          minProtocol: PROTOCOL_VERSION,
          maxProtocol: PROTOCOL_VERSION,
          client: {
            id: CLIENT_ID,
            displayName: 'Clawpet',
            version: '0.2.0',
            platform: process.platform,
            deviceFamily: DEVICE_FAMILY,
            mode: CLIENT_MODE,
            instanceId: this.identity.deviceId
          },
          role: 'operator',
          scopes: [...CLIENT_SCOPES],
          auth: this.config.token ? { token: this.config.token } : undefined,
          device: {
            id: this.identity.deviceId,
            publicKey,
            signature,
            signedAt,
            nonce
          }
        }
      })
    )
  }

  private startRefreshLoop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    this.refreshTimer = setInterval(() => {
      void this.refresh()
    }, REFRESH_INTERVAL_MS)
  }

  private startTickWatch() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
    }

    const interval = Math.max(1_000, Math.min(this.tickIntervalMs, 30_000))

    this.tickTimer = setInterval(() => {
      if (!this.lastTickAt) {
        return
      }

      if (Date.now() - this.lastTickAt > this.tickIntervalMs * 2) {
        this.setConnectionState('disconnected')
        this.snapshot = {
          ...this.snapshot,
          connected: false,
          lastError: 'OpenClaw Gateway 心跳超时'
        }
        this.emitUpdate()
        this.ws?.close()
      }
    }, interval)
  }
}
