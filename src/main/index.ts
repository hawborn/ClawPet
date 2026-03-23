import { join } from 'node:path'

import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from 'electron'

import {
  DEFAULT_GATEWAY_SNAPSHOT,
  DEFAULT_SOUL_STATE,
  IPC_CHANNELS,
  NOTIFICATION_LEVEL_THROTTLE_MS,
  SOUL_STATUS_LABELS,
  TASK_LIFECYCLE_LABELS,
  TASK_LIFECYCLE_EMOTION,
  type AppSettings,
  type GatewayApprovalDecision,
  type NotificationLevel,
  type OpenClawSnapshot,
  type PetVariantId,
  type SoulState,
  type TaskLifecyclePhase
} from '@shared/ipc'

import {
  ensureDataDirectory,
  logResolvedConfig,
  resolveAppConfig,
  validateAppConfig,
  type ResolvedAppConfig
} from './app-config'
import { loadAppSettings, saveAppSettings } from './app-persistence'
import { OpenClawGatewayClient } from './openclaw-client'
import { loadStoredLineup, saveStoredLineup, type StoredPetEntry } from './pet-lineup-store'
import { PetManager } from './pet-manager'
import { SoulBridge } from './soul-bridge'
import { PET_DEFINITIONS } from '../renderer/src/pet-definitions'

let tray: Tray | null = null
let petManager: PetManager | null = null
let soulBridge: SoulBridge | null = null
let gatewayClient: OpenClawGatewayClient | null = null
let panelWindow: BrowserWindow | null = null
let approvalWindow: BrowserWindow | null = null
let runtimeConfig: ResolvedAppConfig | null = null
let gatewaySnapshot: OpenClawSnapshot = { ...DEFAULT_GATEWAY_SNAPSHOT }
let fileSoulState: SoulState = { ...DEFAULT_SOUL_STATE }
let gatewaySoulState: SoulState = { ...DEFAULT_SOUL_STATE }
let previousRunsSnapshot: Map<string, { runId?: string; lastError?: string; lifecyclePhase?: TaskLifecyclePhase }> = new Map()
let activeRunStartTime: number | null = null
// P1: 任务生命周期追踪 - 记录每个任务的生命周期阶段
let taskLifecycleTracker: Map<string, { phase: TaskLifecyclePhase; startedAt: number; transitionedAt: number }> = new Map()
let waitingTimeoutTimers: Map<string, NodeJS.Timeout> = new Map() // Multi-stage waiting timers
let lastSnapshotPushTime = 0
let pendingSnapshotPush: OpenClawSnapshot | null = null
let snapshotPushTimer: NodeJS.Timeout | null = null

// Notification throttle tracker
const notificationThrottle = new Map<string, number>()

const appSettings: AppSettings = {
  clickThrough: false,
  paused: false,
  soulMode: true
}

const APPROVAL_WINDOW_WIDTH = 360
const APPROVAL_WINDOW_HEIGHT = 220
const SNAPSHOT_PUSH_THROTTLE_MS = 100 // Throttle snapshot pushes to max 10 per second

// Multi-stage waiting timeout configuration
const WAITING_STAGES = [
  { stage: 'expecting', delayMs: 30_000, message: '期待中...' },      // 30s - show expecting behavior
  { stage: 'hint1', delayMs: 60_000, message: '还等呢...' },          // 60s - first hint
  { stage: 'hint2', delayMs: 120_000, message: '在不在啊...' },       // 2m - second hint
  { stage: 'important', delayMs: 300_000, message: '该回应了吧' },    // 5m - important notification
  { stage: 'critical', delayMs: 600_000, message: '真的要提醒了' }   // 10m - critical notification
] as const

let pendingLineupSave: NodeJS.Timeout | null = null

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <g fill="black">
        <circle cx="18" cy="18" r="6" />
        <circle cx="32" cy="12" r="6" />
        <circle cx="46" cy="18" r="6" />
        <path d="M18 42c0-10 8-16 14-16s14 6 14 16c0 8-6 12-14 12s-14-4-14-12Z" />
      </g>
    </svg>
  `

  const image = nativeImage
    .createFromDataURL(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`)
    .resize({ width: 18, height: 18 })

  image.setTemplateImage(true)
  return image
}

function currentSoulState() {
  if (gatewaySnapshot.connected) {
    return gatewaySoulState
  }

  if (fileSoulState.active) {
    return fileSoulState
  }

  if (gatewaySnapshot.configured) {
    return gatewaySoulState
  }

  return fileSoulState
}

function shouldNotify(key: string, level: NotificationLevel): boolean {
  const throttleMs = NOTIFICATION_LEVEL_THROTTLE_MS[level]
  const lastNotifyTime = notificationThrottle.get(key) ?? 0
  const now = Date.now()
  
  if (now - lastNotifyTime >= throttleMs) {
    notificationThrottle.set(key, now)
    return true
  }
  return false
}

function isPetModuleEnabled() {
  return runtimeConfig?.enablePets ?? true
}

function isSoulBridgeEnabled() {
  return runtimeConfig?.enableSoulBridge ?? true
}

function isGatewayEnabled() {
  return runtimeConfig?.enableGatewayClient ?? true
}

function lineupFilePath() {
  return runtimeConfig?.lineupFilePath ?? join(app.getPath('userData'), 'pet-lineup.json')
}

function getGatewayClient() {
  if (!isGatewayEnabled() || !gatewayClient) {
    throw new Error('OpenClaw Gateway 功能已禁用')
  }

  return gatewayClient
}

function loadRendererPage(window: BrowserWindow, search = '') {
  const normalizedSearch = search.length > 0 && !search.startsWith('?') ? `?${search}` : search

  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    url.search = normalizedSearch
    void window.loadURL(url.toString())
    return
  }

  void window.loadFile(join(__dirname, '../renderer/index.html'), {
    search: normalizedSearch
  })
}

function buildTrayMenu() {
  const petsEnabled = isPetModuleEnabled()
  const gatewayEnabled = isGatewayEnabled()
  const soulEnabled = isSoulBridgeEnabled() || gatewayEnabled
  const soulState = currentSoulState()
  const soulLabel = !soulEnabled
    ? '灵魂状态：已禁用'
    : soulState.active
      ? `灵魂状态：${SOUL_STATUS_LABELS[soulState.status]}`
      : '灵魂状态：等待 OpenClaw 同步'
  const gatewayLabel = !gatewayEnabled
    ? 'OpenClaw：已禁用'
    : gatewaySnapshot.connected
      ? `OpenClaw：在线 · ${gatewaySnapshot.sessions.length} 会话`
      : gatewaySnapshot.configured
        ? 'OpenClaw：离线'
        : 'OpenClaw：未发现配置'
  const wardrobeMenu = PET_DEFINITIONS.map((definition) => ({
    label: definition.name,
    enabled: petsEnabled,
    click: () => {
      petManager?.setAllPetsVariant(definition.id)
    }
  }))

  return Menu.buildFromTemplate([
    {
      label: '添加蜜桃猫',
      enabled: petsEnabled,
      click: () => petManager?.spawnPet('peach-cat')
    },
    {
      label: '添加薄荷猫',
      enabled: petsEnabled,
      click: () => petManager?.spawnPet('mint-cat')
    },
    {
      label: '添加夜空猫',
      enabled: petsEnabled,
      click: () => petManager?.spawnPet('midnight-cat')
    },
    {
      label: '移除最后一只',
      enabled: petsEnabled,
      click: () => petManager?.removeLastPet()
    },
    {
      label: '给全部宠物换皮肤',
      enabled: petsEnabled,
      submenu: [
        ...wardrobeMenu,
        {
          type: 'separator'
        },
        {
          label: '随机换肤',
          enabled: petsEnabled,
          click: () => petManager?.randomizeAllVariants()
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      label: gatewayLabel,
      enabled: false
    },
    {
      label: '和 OpenClaw 说话',
      enabled: gatewayEnabled,
      click: () => openGatewayPanel()
    },
    {
      label: '刷新 OpenClaw 状态',
      enabled: gatewayEnabled,
      click: () => {
        void gatewayClient?.refresh()
      }
    },
    {
      label: gatewaySnapshot.approvals.length > 0 ? `打开审批弹窗 · ${gatewaySnapshot.approvals.length}` : '打开审批弹窗',
      enabled: gatewayEnabled,
      click: () => openApprovalWindow(true)
    },
    {
      type: 'separator'
    },
    {
      label: soulLabel,
      enabled: false
    },
    {
      label: '灵魂模式',
      type: 'checkbox',
      checked: appSettings.soulMode,
      enabled: soulEnabled,
      click: () => toggleSoulMode()
    },
    {
      label: '暂停动作',
      type: 'checkbox',
      checked: appSettings.paused,
      click: () => togglePaused()
    },
    {
      label: '点击穿透',
      type: 'checkbox',
      checked: appSettings.clickThrough,
      enabled: petsEnabled,
      click: () => toggleClickThrough()
    },
    {
      label: '全部打个招呼',
      enabled: petsEnabled,
      click: () => petManager?.nudgeAll()
    },
    {
      label: '显示窗口',
      enabled: petsEnabled,
      click: () => petManager?.revealAll()
    },
    {
      type: 'separator'
    },
    {
      label: '退出 ClawPet',
      click: () => app.quit()
    }
  ])
}

function createPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    return panelWindow
  }

  panelWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 920,
    minHeight: 680,
    show: false,
    title: 'OpenClaw',
    backgroundColor: '#f6f1eb',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: {
      x: 18,
      y: 18
    },
    vibrancy: 'sidebar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  panelWindow.on('closed', () => {
    panelWindow = null
  })

  panelWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  loadRendererPage(panelWindow, 'view=panel')
  return panelWindow
}

function createApprovalWindow() {
  if (approvalWindow && !approvalWindow.isDestroyed()) {
    return approvalWindow
  }

  approvalWindow = new BrowserWindow({
    width: APPROVAL_WINDOW_WIDTH,
    height: APPROVAL_WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: 'OpenClaw',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  approvalWindow.on('closed', () => {
    approvalWindow = null
  })

  approvalWindow.setAlwaysOnTop(true, 'floating')
  approvalWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  approvalWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  loadRendererPage(approvalWindow, 'view=approval')
  return approvalWindow
}

function positionApprovalWindow() {
  if (!approvalWindow || approvalWindow.isDestroyed()) {
    return
  }

  const { x, y, width, height } = screen.getPrimaryDisplay().workArea

  approvalWindow.setBounds({
    x: Math.round(x + width - APPROVAL_WINDOW_WIDTH - 24),
    y: Math.round(y + height - APPROVAL_WINDOW_HEIGHT - 210),
    width: APPROVAL_WINDOW_WIDTH,
    height: APPROVAL_WINDOW_HEIGHT
  })
}

function openGatewayPanel() {
  if (!isGatewayEnabled()) {
    return
  }

  const window = createPanelWindow()

  if (window.isVisible()) {
    window.focus()
    return
  }

  window.once('ready-to-show', () => {
    window.show()
    window.focus()
  })

  if (window.webContents.isLoading()) {
    return
  }

  window.show()
  window.focus()
}

function openApprovalWindow(force = false) {
  if (!isGatewayEnabled()) {
    return
  }

  if (!force && gatewaySnapshot.approvals.length === 0) {
    return
  }

  const window = createApprovalWindow()
  positionApprovalWindow()

  if (window.isVisible()) {
    return
  }

  window.once('ready-to-show', () => {
    positionApprovalWindow()
    window.showInactive()
  })

  if (window.webContents.isLoading()) {
    return
  }

  window.showInactive()
}

function syncApprovalWindow(snapshot: OpenClawSnapshot) {
  if (!isGatewayEnabled()) {
    approvalWindow?.hide()
    return
  }

  if (snapshot.approvals.length === 0) {
    approvalWindow?.hide()
    return
  }

  const shouldReveal = !approvalWindow || approvalWindow.isDestroyed() || !approvalWindow.isVisible()
  openApprovalWindow(shouldReveal)

  if (approvalWindow && !approvalWindow.isDestroyed()) {
    approvalWindow.webContents.send(IPC_CHANNELS.command, {
      type: 'sync-gateway-snapshot',
      snapshot
    })
  }
}

function setupWaitingStageTimers(runId: string) {
  // Clear any existing timers for this run
  clearWaitingStageTimers(runId)

  // Setup multi-stage waiting timers
  for (const stageConfig of WAITING_STAGES) {
    const timerId = `${runId}-${stageConfig.stage}`
    const timer = setTimeout(() => {
      // Check if still in waiting state
      if (
        gatewaySnapshot.activeRun?.runId === runId &&
        (gatewaySnapshot.approvals.length > 0 || gatewaySnapshot.activeRun?.phase === 'waiting')
      ) {
        handleWaitingStage(runId, stageConfig)
      }
      waitingTimeoutTimers.delete(timerId)
    }, stageConfig.delayMs)

    waitingTimeoutTimers.set(timerId, timer)
  }
}

function clearWaitingStageTimers(runId: string) {
  // Clear all timers related to this run
  const keysToDelete: string[] = []
  for (const [key, timer] of waitingTimeoutTimers.entries()) {
    if (key.startsWith(runId)) {
      clearTimeout(timer)
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach((key) => waitingTimeoutTimers.delete(key))
}

function handleWaitingStage(runId: string, stageConfig: (typeof WAITING_STAGES)[number]) {
  if (!petManager) {
    return
  }

  switch (stageConfig.stage) {
    case 'expecting':
      // Show expecting behavior - subtle hint via soul state update
      // Update soul status to indicate waiting/expecting
      const expectingSoulState = {
        ...currentSoulState(),
        status: 'waiting' as const
      }
      petManager.setSoulState(expectingSoulState)
      break

    case 'hint1':
    case 'hint2':
      // Show feedback messages
      if (shouldNotify(`task-waiting-${stageConfig.stage}`, 'important')) {
        petManager.broadcast({
          type: 'task-feedback',
          feedback: {
            type: 'completion',
            message: stageConfig.message,
            durationMs: 3200
          }
        })
      }
      break

    case 'important':
      // Important level notification
      if (shouldNotify('task-waiting-important', 'important')) {
        app.dock?.bounce('informational')
        petManager.broadcast({
          type: 'task-feedback',
          feedback: {
            type: 'completion',
            message: stageConfig.message,
            durationMs: 3200
          }
        })
      }
      break

    case 'critical':
      // Critical level - system notification
      if (shouldNotify('task-waiting-critical', 'critical')) {
        // Trigger system notification
        app.dock?.bounce('critical')
        if (panelWindow && !panelWindow.isDestroyed()) {
          panelWindow.show()
          panelWindow.focus()
        }
        petManager.broadcast({
          type: 'task-feedback',
          feedback: {
            type: 'failure',
            message: stageConfig.message,
            durationMs: 3200
          }
        })
      }
      break
  }
}

// P1: 任务生命周期转移逻辑
function updateTaskLifecyclePhase(runId: string, newPhase: TaskLifecyclePhase) {
  const now = Date.now()
  const existing = taskLifecycleTracker.get(runId)
  const previousPhase = existing?.phase

  if (previousPhase === newPhase) {
    return // No phase change
  }

  taskLifecycleTracker.set(runId, {
    phase: newPhase,
    startedAt: existing?.startedAt ?? now,
    transitionedAt: now
  })

  // Broadcast lifecycle transition to UI
  if (petManager && previousPhase) {
    petManager.broadcast({
      type: 'ceremony-transition',
      from: previousPhase,
      to: newPhase,
      durationMs: 600
    })
  }
}

// P1: 根据快照推断任务生命周期阶段
function inferTaskLifecyclePhase(snapshot: OpenClawSnapshot): TaskLifecyclePhase | null {
  if (!snapshot.activeRun) {
    return null
  }

  const activeRun = snapshot.activeRun
  
  // Check for explicit phase information
  if (activeRun.phase) {
    if (activeRun.phase === 'waiting' || snapshot.approvals.length > 0) {
      return 'waiting'
    }
    if (activeRun.phase === 'completed') {
      return 'done'
    }
    if (activeRun.phase === 'failed') {
      return 'failed'
    }
  }

  // Infer from activity kind
  if (activeRun.activityKind === 'idle') {
    return 'task-received'
  } else if (activeRun.activityKind === 'read' || activeRun.activityKind === 'edit') {
    return 'thinking'
  } else if (
    activeRun.activityKind === 'exec' ||
    activeRun.activityKind === 'write' ||
    activeRun.activityKind === 'tool'
  ) {
    return 'executing'
  } else if (activeRun.activityKind === 'job') {
    return 'executing'
  }

  return 'executing' // Default
}

function detectRunStateChanges(snapshot: OpenClawSnapshot) {
  const currentActiveRunId = snapshot.activeRun?.runId ?? null
  const previousState = previousRunsSnapshot.get('activeRunId') ?? {}
  const previousActiveRunId = previousState.runId ?? null
  const previousLastError = previousState.lastError ?? null

  // Reset waiting timers when run state changes
  if (currentActiveRunId !== previousActiveRunId) {
    if (previousActiveRunId) {
      clearWaitingStageTimers(previousActiveRunId)
      taskLifecycleTracker.delete(previousActiveRunId) // Clean up lifecycle tracker
    }
    activeRunStartTime = currentActiveRunId ? Date.now() : null
  }

  // P1: Update task lifecycle phase
  if (currentActiveRunId) {
    const inferredPhase = inferTaskLifecyclePhase(snapshot)
    if (inferredPhase) {
      updateTaskLifecyclePhase(currentActiveRunId, inferredPhase)
    }
  }

  // Setup multi-stage waiting timers for new active runs
  if (currentActiveRunId && !previousActiveRunId) {
    activeRunStartTime = Date.now()
    setupWaitingStageTimers(currentActiveRunId)
  }

  // Detect failed runs: lastError changed (indicating a failure occurred)
  const isNewError = snapshot.lastError && snapshot.lastError !== previousLastError
  if (isNewError && previousActiveRunId) {
    // Clear waiting timers on failure
    clearWaitingStageTimers(previousActiveRunId)
    updateTaskLifecyclePhase(previousActiveRunId, 'failed')
    // Only notify failure if we had an active run and error is new
    notifyRunFailure(previousActiveRunId)
  }

  // Detect completed runs: activeRun was present but now it's null or changed
  // Only treat as completion if no error is present (otherwise it was a failure)
  if (previousActiveRunId && previousActiveRunId !== currentActiveRunId && !isNewError) {
    // Clear waiting timers on completion
    clearWaitingStageTimers(previousActiveRunId)
    updateTaskLifecyclePhase(previousActiveRunId, 'done')
    notifyRunCompletion(previousActiveRunId)
  }

  // Update snapshot
  if (currentActiveRunId) {
    const currentPhase = inferTaskLifecyclePhase(snapshot)
    previousRunsSnapshot.set('activeRunId', {
      runId: currentActiveRunId,
      lastError: snapshot.lastError,
      lifecyclePhase: currentPhase ?? undefined
    })
  } else {
    previousRunsSnapshot.set('activeRunId', { lastError: snapshot.lastError })
  }
}

function notifyRunCompletion(runKey: string) {
  if (!petManager || !shouldNotify('task-completion', 'normal')) {
    return
  }

  const messages = ['完成了！', '搞定了！', '太好了！', '完成 ✓']
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  petManager.broadcast({
    type: 'task-feedback',
    feedback: {
      type: 'completion',
      message: randomMessage,
      durationMs: 2400
    }
  })
}

function notifyRunFailure(runKey: string) {
  if (!petManager || !shouldNotify('task-failure', 'important')) {
    return
  }

  const messages = ['出问题了...', '嗯，失败了', '这个没做好', '试试其他办法吧']
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  petManager.broadcast({
    type: 'task-feedback',
    feedback: {
      type: 'failure',
      message: randomMessage,
      durationMs: 2400
    }
  })
}

function notifyWaitingTimeout(runKey: string) {
  if (!petManager || !shouldNotify('task-waiting', 'important')) {
    return
  }

  const messages = ['嗯？还在等呢...', '怎么还没动静...', '催一下？', '想要帮忙吗...']
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  petManager.broadcast({
    type: 'task-feedback',
    feedback: {
      type: 'completion',
      message: randomMessage,
      durationMs: 3200
    }
  })
}

function pushGatewaySnapshot(snapshot: OpenClawSnapshot) {
  // Throttle snapshot pushes to avoid overwhelming the UI
  const now = Date.now()
  const timeSinceLastPush = now - lastSnapshotPushTime
  
  if (timeSinceLastPush < SNAPSHOT_PUSH_THROTTLE_MS) {
    // Store the latest snapshot and schedule a deferred push
    pendingSnapshotPush = snapshot
    
    if (!snapshotPushTimer) {
      snapshotPushTimer = setTimeout(() => {
        snapshotPushTimer = null
        if (pendingSnapshotPush) {
          const deferred = pendingSnapshotPush
          pendingSnapshotPush = null
          pushGatewaySnapshot(deferred)
        }
      }, SNAPSHOT_PUSH_THROTTLE_MS - timeSinceLastPush)
    }
    return
  }
  
  // Clear any pending timer since we're pushing now
  if (snapshotPushTimer) {
    clearTimeout(snapshotPushTimer)
    snapshotPushTimer = null
  }
  pendingSnapshotPush = null
  lastSnapshotPushTime = now
  
  detectRunStateChanges(snapshot)
  petManager?.setGatewaySnapshot(snapshot)

  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.webContents.send(IPC_CHANNELS.command, {
      type: 'sync-gateway-snapshot',
      snapshot
    })
  }

  syncApprovalWindow(snapshot)
}

function refreshTrayMenu() {
  if (!tray) {
    return
  }

  tray.setContextMenu(buildTrayMenu())
}

function syncSoulState() {
  petManager?.setSoulState(currentSoulState())
  refreshTrayMenu()
}

function togglePaused() {
  appSettings.paused = !appSettings.paused
  petManager?.setPaused(appSettings.paused)
  refreshTrayMenu()
  savePersistentSettings()
}

function toggleClickThrough() {
  appSettings.clickThrough = !appSettings.clickThrough
  petManager?.setClickThrough(appSettings.clickThrough)
  refreshTrayMenu()
  savePersistentSettings()
}

function toggleSoulMode() {
  appSettings.soulMode = !appSettings.soulMode
  petManager?.setSoulMode(appSettings.soulMode)
  refreshTrayMenu()
  savePersistentSettings()
}

function savePersistentSettings() {
  if (runtimeConfig) {
    void saveAppSettings(runtimeConfig.dataDir, appSettings)
  }
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.getSnapshot, (event) => petManager?.getSnapshotFor(event.sender.id))
  ipcMain.handle(IPC_CHANNELS.interact, (event) => {
    petManager?.interactByWebContentsId(event.sender.id)
  })
  ipcMain.handle(IPC_CHANNELS.petCycleVariant, (event) => {
    petManager?.cycleVariantByWebContentsId(event.sender.id)
  })
  ipcMain.handle(IPC_CHANNELS.petSetAllVariant, (_event, variantId: PetVariantId) => {
    petManager?.setAllPetsVariant(variantId)
  })
  ipcMain.handle(IPC_CHANNELS.petRandomizeVariants, () => {
    petManager?.randomizeAllVariants()
  })
  ipcMain.on(IPC_CHANNELS.petDragStart, (event, payload: { screenX: number; screenY: number }) => {
    petManager?.beginDragByWebContentsId(event.sender.id, payload.screenX, payload.screenY)
  })
  ipcMain.on(IPC_CHANNELS.petDragMove, (event, payload: { screenX: number; screenY: number }) => {
    petManager?.dragByWebContentsId(event.sender.id, payload.screenX, payload.screenY)
  })
  ipcMain.on(IPC_CHANNELS.petDragEnd, (event) => {
    petManager?.endDragByWebContentsId(event.sender.id)
  })
  ipcMain.handle(IPC_CHANNELS.gatewayGetSnapshot, () => gatewaySnapshot)
  ipcMain.handle(IPC_CHANNELS.gatewayOpenPanel, () => {
    if (isGatewayEnabled()) {
      openGatewayPanel()
    }
  })
  ipcMain.handle(IPC_CHANNELS.gatewayRefresh, async () => {
    if (!isGatewayEnabled()) {
      return gatewaySnapshot
    }

    await getGatewayClient().refresh()
    return gatewaySnapshot
  })
  ipcMain.handle(
    IPC_CHANNELS.gatewaySendMessage,
    async (_event, payload: { message: string; sessionKey?: string }) => {
      await getGatewayClient().sendMessage(payload.message, payload.sessionKey)
      return gatewaySnapshot
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.gatewayAbortRun,
    async (_event, payload: { sessionKey?: string } | undefined) => {
      await getGatewayClient().abortRun(payload?.sessionKey)
      return gatewaySnapshot
    }
  )
  ipcMain.handle(IPC_CHANNELS.gatewaySelectSession, async (_event, sessionKey: string) => {
    await getGatewayClient().selectSession(sessionKey)
    return gatewaySnapshot
  })
  ipcMain.handle(
    IPC_CHANNELS.gatewayResolveApproval,
    async (_event, payload: { id: string; decision: GatewayApprovalDecision }) => {
      await getGatewayClient().resolveApproval(payload.id, payload.decision)
      return gatewaySnapshot
    }
  )
  ipcMain.handle(IPC_CHANNELS.togglePause, () => {
    togglePaused()
    return { ...appSettings }
  })
  ipcMain.handle(IPC_CHANNELS.toggleClickThrough, () => {
    toggleClickThrough()
    return { ...appSettings }
  })
  ipcMain.handle(IPC_CHANNELS.toggleSoulMode, () => {
    toggleSoulMode()
    return { ...appSettings }
  })
  ipcMain.handle(IPC_CHANNELS.revealWindow, () => {
    petManager?.revealAll()
  })
}

function createTray() {
  tray = new Tray(createTrayImage())
  tray.setToolTip('ClawPet')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => {
    if (isPetModuleEnabled()) {
      petManager?.revealAll()
    }
  })
}

function registerDisplayEvents() {
  const handleDisplayChange = () => {
    petManager?.handleDisplayMetricsChanged()
    positionApprovalWindow()
  }

  screen.on('display-added', handleDisplayChange)
  screen.on('display-removed', handleDisplayChange)
  screen.on('display-metrics-changed', handleDisplayChange)
}

function schedulePersistLineup(pets: StoredPetEntry[]) {
  if (pendingLineupSave) {
    clearTimeout(pendingLineupSave)
  }

  pendingLineupSave = setTimeout(() => {
    pendingLineupSave = null
    void saveStoredLineup(lineupFilePath(), pets)
  }, 180)
}

function ensureRuntimeConfig() {
  const config = resolveAppConfig(app.getPath('userData'))
  const validation = validateAppConfig(config)

  validation.warnings.forEach((warning) => {
    console.warn(`[ClawPet] Config warning: ${warning}`)
  })

  if (validation.errors.length > 0) {
    throw new Error(`Invalid runtime config:\n${validation.errors.map((error) => `- ${error}`).join('\n')}`)
  }

  ensureDataDirectory(config)
  logResolvedConfig(config)
  runtimeConfig = config
  return config
}

function spawnInitialLineup(storedLineup: StoredPetEntry[] | null) {
  if (!petManager || !runtimeConfig || !runtimeConfig.enablePets) {
    return
  }

  const knownVariants = new Set(PET_DEFINITIONS.map((definition) => definition.id))
  let spawned = false

  if (storedLineup && storedLineup.length > 0) {
    for (const pet of storedLineup.slice(0, runtimeConfig.maxPets)) {
      if (!knownVariants.has(pet.variantId)) {
        continue
      }

      spawned = petManager.spawnPet(pet.variantId, pet) || spawned
    }
  } else {
    for (const variantId of runtimeConfig.defaultPets.slice(0, runtimeConfig.maxPets)) {
      if (!knownVariants.has(variantId)) {
        continue
      }

      spawned = petManager.spawnPet(variantId) || spawned
    }
  }

  if (!spawned) {
    petManager.spawnPet('peach-cat')
  }
}

async function bootRuntime() {
  const config = ensureRuntimeConfig()
  
  // Load persisted app settings
  const loadedSettings = await loadAppSettings(config.dataDir)
  Object.assign(appSettings, loadedSettings)
  
  const storedLineup = config.enablePets ? await loadStoredLineup(config.lineupFilePath) : null

  if (config.enablePets) {
    petManager = new PetManager(
      appSettings,
      DEFAULT_SOUL_STATE,
      (pets) => {
        schedulePersistLineup(pets)
      },
      {
        maxPets: config.maxPets
      }
    )
    petManager.start()
  }

  if (config.enableSoulBridge) {
    soulBridge = new SoulBridge()
    await soulBridge.start((soulState) => {
      fileSoulState = soulState
      syncSoulState()
    })
  } else {
    fileSoulState = { ...DEFAULT_SOUL_STATE }
    console.info('[ClawPet] SoulBridge module disabled by runtime config')
  }

  if (config.enableGatewayClient) {
    gatewayClient = new OpenClawGatewayClient(config.dataDir, (snapshot, soulState) => {
      gatewaySnapshot = snapshot
      gatewaySoulState = soulState
      pushGatewaySnapshot(snapshot)
      syncSoulState()
    })
    await gatewayClient.start()
  } else {
    gatewaySnapshot = {
      ...DEFAULT_GATEWAY_SNAPSHOT,
      configured: false,
      connected: false,
      lastError: 'OpenClaw Gateway 功能已禁用'
    }
    gatewaySoulState = { ...DEFAULT_SOUL_STATE }
    pushGatewaySnapshot(gatewaySnapshot)
    console.info('[ClawPet] OpenClaw gateway module disabled by runtime config')
  }

  registerIpcHandlers()
  createTray()
  registerDisplayEvents()
  syncSoulState()
  spawnInitialLineup(storedLineup)
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  try {
    await bootRuntime()
  } catch (error) {
    console.error('[ClawPet] Startup failed', error)
    app.quit()
  }
})

app.on('activate', () => {
  if (!petManager) {
    return
  }

  petManager.revealAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (pendingLineupSave) {
    clearTimeout(pendingLineupSave)
    pendingLineupSave = null
  }

  // Clear all waiting stage timers
  for (const [, timer] of waitingTimeoutTimers.entries()) {
    clearTimeout(timer)
  }
  waitingTimeoutTimers.clear()

  if (snapshotPushTimer) {
    clearTimeout(snapshotPushTimer)
    snapshotPushTimer = null
  }

  if (petManager) {
    void saveStoredLineup(lineupFilePath(), petManager.getStoredLineup())
  }

  // Save app settings before quitting
  if (runtimeConfig) {
    void saveAppSettings(runtimeConfig.dataDir, appSettings)
  }

  petManager?.stop()
  soulBridge?.stop()
  gatewayClient?.stop()
  approvalWindow?.destroy()
})
