import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_SOUL_STATE, type SoulSource, type SoulState, type SoulStatus } from '@shared/ipc'

const DEFAULT_POLL_INTERVAL_MS = 1200
const STATE_FILE_RELATIVE_PATH = ['clawpet', 'soul-state.json']

interface OpenClawConfig {
  agents?: {
    defaults?: {
      workspace?: string
    }
  }
}

const CONFIG_CANDIDATES: Array<{ path: string; source: SoulSource }> = [
  { path: join(homedir(), '.openclaw', 'openclaw.json'), source: 'openclaw' },
  { path: join(homedir(), '.qclaw', 'openclaw.json'), source: 'qclaw' }
]

function expandHomePath(inputPath: string) {
  if (inputPath === '~') {
    return homedir()
  }

  if (inputPath.startsWith('~/')) {
    return join(homedir(), inputPath.slice(2))
  }

  return inputPath
}

function normalizeStatus(input: unknown): SoulStatus {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : ''

  switch (value) {
    case 'idle':
    case 'done':
    case 'rest':
    case 'standby':
      return 'idle'
    case 'thinking':
    case 'think':
    case 'reasoning':
    case 'planning':
      return 'thinking'
    case 'coding':
    case 'working':
    case 'implementing':
    case 'editing':
    case 'writing':
      return 'coding'
    case 'running':
    case 'tool':
    case 'executing':
    case 'testing':
      return 'running'
    case 'waiting':
    case 'blocked':
    case 'review':
      return 'waiting'
    case 'error':
    case 'failed':
    case 'fail':
      return 'error'
    default:
      return 'idle'
  }
}

async function detectWorkspace() {
  for (const candidate of CONFIG_CANDIDATES) {
    if (!existsSync(candidate.path)) {
      continue
    }

    try {
      const raw = await readFile(candidate.path, 'utf8')
      const parsed = JSON.parse(raw) as OpenClawConfig
      const workspace = parsed.agents?.defaults?.workspace

      if (workspace) {
        return {
          source: candidate.source,
          workspace: expandHomePath(workspace)
        }
      }
    } catch {
      continue
    }
  }

  return {
    source: 'openclaw' as SoulSource,
    workspace: join(homedir(), '.openclaw', 'workspace')
  }
}

function createInactiveState(sourcePath: string, source: SoulSource): SoulState {
  return {
    ...DEFAULT_SOUL_STATE,
    source,
    sourcePath
  }
}

function trimDescription(input: unknown) {
  if (typeof input !== 'string') {
    return ''
  }

  return input.trim().replace(/\s+/g, ' ').slice(0, 80)
}

function normalizeSoulState(
  input: Record<string, unknown>,
  sourcePath: string,
  source: SoulSource
): SoulState {
  const updatedAt =
    typeof input.updatedAt === 'string' && input.updatedAt.length > 0
      ? input.updatedAt
      : new Date().toISOString()

  return {
    active: input.active !== false,
    description: trimDescription(input.description),
    source,
    sourcePath,
    status: normalizeStatus(input.status),
    updatedAt
  }
}

export class SoulBridge {
  private currentState: SoulState = DEFAULT_SOUL_STATE
  private lastRawState = ''
  private listener: ((state: SoulState) => void) | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private resolvedPath = ''
  private resolvedSource: SoulSource = 'openclaw'

  async start(listener: (state: SoulState) => void) {
    this.listener = listener

    const detected = await detectWorkspace()
    this.resolvedPath =
      process.env.CLAWPET_SOUL_STATE_FILE &&
      process.env.CLAWPET_SOUL_STATE_FILE.trim().length > 0
        ? expandHomePath(process.env.CLAWPET_SOUL_STATE_FILE.trim())
        : join(detected.workspace, ...STATE_FILE_RELATIVE_PATH)
    this.resolvedSource = detected.source
    this.currentState = createInactiveState(this.resolvedPath, this.resolvedSource)
    this.listener(this.currentState)

    await this.refresh()

    this.pollTimer = setInterval(() => {
      void this.refresh()
    }, DEFAULT_POLL_INTERVAL_MS)
  }

  stop() {
    if (!this.pollTimer) {
      return
    }

    clearInterval(this.pollTimer)
    this.pollTimer = null
  }

  getState() {
    return { ...this.currentState }
  }

  getStateFilePath() {
    return this.resolvedPath
  }

  private async refresh() {
    if (!this.resolvedPath) {
      return
    }

    if (!existsSync(this.resolvedPath)) {
      const nextState = createInactiveState(this.resolvedPath, this.resolvedSource)
      const serialized = JSON.stringify(nextState)

      if (serialized !== this.lastRawState) {
        this.lastRawState = serialized
        this.currentState = nextState
        this.listener?.(this.currentState)
      }

      return
    }

    try {
      const raw = await readFile(this.resolvedPath, 'utf8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const nextState = normalizeSoulState(parsed, this.resolvedPath, this.resolvedSource)
      const serialized = JSON.stringify(nextState)

      if (serialized === this.lastRawState) {
        return
      }

      this.lastRawState = serialized
      this.currentState = nextState
      this.listener?.(this.currentState)
    } catch {
      const nextState = {
        ...createInactiveState(this.resolvedPath, this.resolvedSource),
        active: true,
        description: '灵魂状态文件不可读',
        status: 'error' as SoulStatus
      }
      const serialized = JSON.stringify(nextState)

      if (serialized !== this.lastRawState) {
        this.lastRawState = serialized
        this.currentState = nextState
        this.listener?.(this.currentState)
      }
    }
  }
}
