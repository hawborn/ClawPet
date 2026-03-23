import { join } from 'node:path'

import { BrowserWindow, screen } from 'electron'

import type {
  AppCommand,
  AppSettings,
  Facing,
  OpenClawSnapshot,
  PetActivity,
  PetPriorityInfo,
  PetSessionBinding,
  PetSnapshot,
  PetVariantId,
  PetWindowState,
  SoulState,
  TaskLifecyclePhase
} from '@shared/ipc'
import {
  IPC_CHANNELS,
  MAX_PETS,
  PET_WINDOW_HEIGHT,
  PET_WINDOW_WIDTH,
  SOUL_STATUS_LABELS
} from '@shared/ipc'

import { getPetDefinition, nextPetVariant, PET_DEFINITIONS } from '../renderer/src/pet-definitions'
import type { StoredPetEntry } from './pet-lineup-store'

const WORLD_TICK_MS = 1000 / 30
const WINDOW_MARGIN_X = 20
const WINDOW_MARGIN_Y = 8
const WINDOW_GAP = 104
const LANE_OFFSETS = [0, 14]

interface PetActor {
  activity: PetActivity
  activityTime: number
  facing: Facing
  id: string
  lane: number
  speechText: string
  speechTime: number
  variantId: PetVariantId
  velocity: number
  window: BrowserWindow
  x: number
  y: number
  // P1-CP-007: 会话绑定和优先级信息
  sessionBinding?: PetSessionBinding
  priorityInfo?: PetPriorityInfo
}

interface DragState {
  offsetX: number
  offsetY: number
  petId: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function shortenMessage(input: string, maxLength = 26) {
  if (input.length <= maxLength) {
    return input
  }

  return `${input.slice(0, maxLength - 1)}…`
}

export class PetManager {
  private dragState: DragState | null = null
  private readonly pets: PetActor[] = []
  private readonly webContentsToPetId = new Map<number, string>()
  private serial = 0
  private soulState: SoulState
  private tickTimer: NodeJS.Timeout | null = null
  private readonly maxPets: number
  // P1-CP-007: 会话到宠物的映射
  private sessionToPetId = new Map<string, string>()
  private lastGatewaySnapshot: OpenClawSnapshot | null = null

  constructor(
    private readonly settings: AppSettings,
    initialSoulState: SoulState,
    private readonly onLineupChanged?: (pets: StoredPetEntry[]) => void,
    options?: {
      maxPets?: number
    }
  ) {
    this.soulState = { ...initialSoulState }
    this.maxPets = clamp(Math.trunc(options?.maxPets ?? MAX_PETS), 1, MAX_PETS)
  }

  getStoredLineup() {
    return this.pets.map((pet) => ({
      variantId: pet.variantId,
      x: Math.round(pet.x),
      y: Math.round(pet.y)
    }))
  }

  start() {
    if (this.tickTimer) {
      return
    }

    this.tickTimer = setInterval(() => this.update(WORLD_TICK_MS / 1000), WORLD_TICK_MS)
  }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }

    if (this.snapshotBroadcastTimer) {
      clearTimeout(this.snapshotBroadcastTimer)
      this.snapshotBroadcastTimer = null
    }
  }

  getSnapshotFor(webContentsId: number): PetSnapshot {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet) {
      throw new Error(`No pet window found for webContents ${webContentsId}`)
    }

    return {
      pet: this.toPetWindowState(pet),
      settings: { ...this.settings },
      soul: { ...this.soulState }
    }
  }

  spawnPet(variantId: PetVariantId, position?: { x?: number; y?: number }) {
    if (this.pets.length >= this.maxPets) {
      return false
    }

    const actor = this.createPetActor(variantId, position)
    this.pets.push(actor)

    if (this.settings.soulMode && this.soulState.active) {
      this.applySoulMoodToPet(actor, this.pets.length - 1, false)
    }

    this.resolveSpacing()
    this.positionAllWindows()
    this.notifyLineupChanged()
    return true
  }

  removeLastPet() {
    if (this.pets.length <= 1) {
      return false
    }

    const pet = this.pets.pop()

    if (!pet) {
      return false
    }

    this.webContentsToPetId.delete(pet.window.webContents.id)
    if (!pet.window.isDestroyed()) {
      pet.window.destroy()
    }

    this.resolveSpacing()
    this.positionAllWindows()
    this.notifyLineupChanged()
    return true
  }

  nudgeAll() {
    this.pets.forEach((pet, index) => {
      setTimeout(() => {
        if (this.findPetById(pet.id)) {
          this.triggerGreeting(pet)
        }
      }, index * 100)
    })
  }

  revealAll() {
    this.clampPetsToDisplay()
    this.positionAllWindows()

    for (const pet of this.pets) {
      pet.window.showInactive()
    }
  }

  setClickThrough(nextValue: boolean) {
    this.settings.clickThrough = nextValue

    for (const pet of this.pets) {
      this.applyWindowSettings(pet.window)
    }

    this.broadcast({
      type: 'sync-settings',
      settings: { ...this.settings }
    })
  }

  setPaused(nextValue: boolean) {
    this.settings.paused = nextValue
    this.broadcast({
      type: 'sync-settings',
      settings: { ...this.settings }
    })
  }

  setSoulMode(nextValue: boolean) {
    this.settings.soulMode = nextValue
    this.broadcast({
      type: 'sync-settings',
      settings: { ...this.settings }
    })
    this.broadcast({
      type: 'sync-soul-state',
      soul: { ...this.soulState }
    })

    if (nextValue && this.soulState.active) {
      this.applySoulMoodToAllPets(true)
    }
  }

  setSoulState(nextSoulState: SoulState) {
    const didStatusChange =
      this.soulState.status !== nextSoulState.status ||
      this.soulState.description !== nextSoulState.description ||
      this.soulState.active !== nextSoulState.active

    this.soulState = { ...nextSoulState }

    this.broadcast({
      type: 'sync-soul-state',
      soul: { ...this.soulState }
    })

    if (this.settings.soulMode && didStatusChange) {
      this.applySoulMoodToAllPets(true)
    }
  }

  private lastBroadcastedSnapshot: OpenClawSnapshot | null = null
  private snapshotBroadcastTimer: NodeJS.Timeout | null = null

  setGatewaySnapshot(snapshot: OpenClawSnapshot) {
    this.lastBroadcastedSnapshot = snapshot
    this.lastGatewaySnapshot = snapshot

    // P1-CP-007: 更新会话-宠物映射
    this.updateSessionPetMapping(snapshot)
    
    // Throttle gateway snapshot broadcasts to pets to prevent excessive window updates
    // Only broadcast if we're not already scheduled, to batch updates
    if (!this.snapshotBroadcastTimer) {
      this.snapshotBroadcastTimer = setTimeout(() => {
        this.snapshotBroadcastTimer = null
        if (this.lastBroadcastedSnapshot) {
          this.broadcast({
            type: 'sync-gateway-snapshot',
            snapshot: this.lastBroadcastedSnapshot
          })
        }
      }, 500) // Only broadcast every 500ms at most to pet windows
    }
  }

  // P1-CP-007: 更新会话到宠物的映射
  private updateSessionPetMapping(snapshot: OpenClawSnapshot) {
    if (!snapshot.connected || snapshot.sessions.length === 0) {
      return
    }

    // 首次初始化：为主会话或活跃会话绑定宠物
    if (this.sessionToPetId.size === 0 && this.pets.length > 0) {
      const sessions = snapshot.sessions
      const primarySession = sessions.find((s) => s.key === snapshot.activeSessionKey) || sessions[0]

      if (primarySession && this.pets.length > 0) {
        const firstPet = this.pets[0]
        this.sessionToPetId.set(primarySession.key, firstPet.id)
        firstPet.sessionBinding = {
          petId: firstPet.id,
          sessionKey: primarySession.key,
          isPrimary: true,
          sessionName: primarySession.displayName,
          sessionModel: primarySession.model,
          lastActivityAt: primarySession.updatedAt
        }
        firstPet.priorityInfo = {
          petId: firstPet.id,
          sessionKey: primarySession.key,
          priority: 'high',
          hasActiveRun: !!snapshot.activeRun,
          hasApproval: snapshot.approvals.length > 0
        }
      }
    }

    // 更新现有映射的活动状态
    for (const pet of this.pets) {
      if (pet.sessionBinding) {
        const session = snapshot.sessions.find((s) => s.key === pet.sessionBinding!.sessionKey)
        if (session) {
          pet.sessionBinding.lastActivityAt = session.updatedAt
        }

        // 更新优先级信息
        if (pet.priorityInfo) {
          pet.priorityInfo.hasActiveRun =
            snapshot.activeRun?.sessionKey === pet.sessionBinding.sessionKey && !!snapshot.activeRun
          pet.priorityInfo.hasApproval = snapshot.approvals.some(
            (a) => a.sessionKey === pet.sessionBinding!.sessionKey
          )

          // 根据活动状态计算优先级
          if (pet.priorityInfo.hasApproval) {
            pet.priorityInfo.priority = 'high' // 有待审批任务最高优先级
          } else if (pet.priorityInfo.hasActiveRun) {
            pet.priorityInfo.priority = 'high' // 有活跃任务也是高优先级
          } else {
            pet.priorityInfo.priority = 'normal'
          }
        }
      }
    }
  }

  interactByWebContentsId(webContentsId: number) {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet || this.settings.clickThrough) {
      return
    }

    this.triggerGreeting(pet)
  }

  beginDragByWebContentsId(webContentsId: number, screenX: number, screenY: number) {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet || this.settings.clickThrough) {
      return
    }

    this.dragState = {
      offsetX: screenX - pet.x,
      offsetY: screenY - pet.y,
      petId: pet.id
    }

    pet.velocity = 0
    pet.activity = 'idle'
    pet.activityTime = randomBetween(1.4, 2.8)
    this.syncPetState(pet)
  }

  dragByWebContentsId(webContentsId: number, screenX: number, screenY: number) {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet || !this.dragState || this.dragState.petId !== pet.id) {
      return
    }

    const { leftBound, rightBound, topBound, bottomBound } = this.getWindowBounds()

    pet.x = clamp(screenX - this.dragState.offsetX, leftBound, rightBound)
    pet.y = clamp(screenY - this.dragState.offsetY, topBound, bottomBound)
    this.positionWindow(pet)
  }

  endDragByWebContentsId(webContentsId: number) {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet || !this.dragState || this.dragState.petId !== pet.id) {
      return
    }

    this.dragState = null
    pet.activityTime = randomBetween(1.4, 2.8)
    this.resolveSpacing()
    this.positionAllWindows()
    this.notifyLineupChanged()
  }

  cycleVariantByWebContentsId(webContentsId: number) {
    const pet = this.findPetByWebContentsId(webContentsId)

    if (!pet) {
      return
    }

    pet.variantId = nextPetVariant(pet.variantId)
    pet.speechText = getPetDefinition(pet.variantId).name
    pet.speechTime = 1.6
    this.syncPetState(pet)
    this.notifyLineupChanged()
  }

  handleDisplayMetricsChanged() {
    this.clampPetsToDisplay()
    this.resolveSpacing()
    this.positionAllWindows()
  }

  randomizeAllVariants() {
    for (const pet of this.pets) {
      const randomVariant =
        PET_DEFINITIONS[Math.floor(Math.random() * PET_DEFINITIONS.length)]?.id ?? pet.variantId
      pet.variantId = randomVariant
      pet.speechText = getPetDefinition(randomVariant).name
      pet.speechTime = 1.6
      this.syncPetState(pet)
    }

    this.notifyLineupChanged()
  }

  setAllPetsVariant(variantId: PetVariantId) {
    for (const pet of this.pets) {
      pet.variantId = variantId
      pet.speechText = getPetDefinition(variantId).name
      pet.speechTime = 1.6
      this.syncPetState(pet)
    }

    this.notifyLineupChanged()
  }

  private applySoulMoodToAllPets(announce: boolean) {
    this.pets.forEach((pet, index) => {
      this.applySoulMoodToPet(pet, index, announce && index === 0)
    })
  }

  private applySoulMoodToPet(pet: PetActor, index: number, announce: boolean) {
    if (!this.soulState.active) {
      return
    }

    const behavior = getPetDefinition(pet.variantId).behavior

    switch (this.soulState.status) {
      case 'idle': {
        const roll = Math.random()

        if (roll < behavior.greetChance + 0.06) {
          pet.activity = 'greet'
          pet.activityTime = 1.05
          pet.velocity = 0
        } else if (roll < 0.58) {
          pet.activity = 'walk'
          pet.activityTime = randomBetween(1.8, 3.1)
          pet.velocity =
            (index % 2 === 0 ? -1 : 1) *
            randomBetween(Math.max(16, behavior.walkSpeedMin - 4), Math.max(22, behavior.walkSpeedMax - 8))
          pet.facing = pet.velocity >= 0 ? 1 : -1
        } else if (roll < 1 - behavior.sleepChance) {
          pet.activity = 'idle'
          pet.activityTime = randomBetween(2.2, 4)
          pet.velocity = 0
        } else {
          pet.activity = 'sleep'
          pet.activityTime = randomBetween(2.8, 4.8)
          pet.velocity = 0
        }
        break
      }
      case 'thinking':
        pet.activity = Math.random() > 0.35 ? 'walk' : 'idle'
        pet.activityTime = randomBetween(1.6, 2.8)
        pet.velocity =
          pet.activity === 'walk'
            ? (index % 2 === 0 ? -1 : 1) *
              randomBetween(Math.max(16, behavior.walkSpeedMin - 2), Math.max(22, behavior.walkSpeedMax - 10))
            : 0
        pet.facing = pet.velocity >= 0 ? 1 : -1
        break
      case 'coding':
        pet.activity = 'walk'
        pet.activityTime = randomBetween(1.9, 3.1)
        pet.velocity =
          (index % 2 === 0 ? -1 : 1) *
          randomBetween(Math.max(24, behavior.walkSpeedMin + 4), Math.max(30, behavior.walkSpeedMax + 6))
        pet.facing = pet.velocity >= 0 ? 1 : -1
        break
      case 'running':
        pet.activity = index === 0 && Math.random() > 0.55 ? 'greet' : 'walk'
        pet.activityTime = pet.activity === 'greet' ? 1.1 : randomBetween(1.5, 2.6)
        pet.velocity =
          pet.activity === 'greet'
            ? 0
            : (index % 2 === 0 ? -1 : 1) *
              randomBetween(Math.max(30, behavior.walkSpeedMin + 10), Math.max(38, behavior.walkSpeedMax + 12))
        pet.facing = pet.velocity >= 0 ? 1 : -1
        break
      case 'waiting':
        // Waiting/expecting state: show anticipation through varied behaviors
        // More greet behavior to show the pet is paying attention
        const waitingRoll = Math.random()
        if (waitingRoll < 0.5) {
          pet.activity = 'greet'  // Show active attention
          pet.activityTime = 0.8
        } else if (waitingRoll < 0.85) {
          pet.activity = 'idle'   // Watchful waiting
          pet.activityTime = randomBetween(1.5, 2.5)
        } else {
          pet.activity = 'walk'   // Pacing back and forth
          pet.activityTime = randomBetween(1.2, 1.8)
          pet.velocity = (index % 2 === 0 ? -1 : 1) * randomBetween(12, 16)
          pet.facing = pet.velocity >= 0 ? 1 : -1
        }
        break
      case 'error':
        pet.activity = index === 0 ? 'greet' : Math.random() > 0.5 ? 'walk' : 'idle'
        pet.activityTime = pet.activity === 'greet' ? 1.2 : randomBetween(1.6, 2.8)
        pet.velocity = 0
        break
    }

    if (announce) {
      pet.speechText = this.getSoulAnnouncement()
      pet.speechTime = 3.2
    }

    this.syncPetState(pet)
  }

  private applyWindowSettings(window: BrowserWindow) {
    window.setIgnoreMouseEvents(this.settings.clickThrough)
    window.setAlwaysOnTop(true, 'floating')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  broadcast(command: AppCommand) {
    for (const pet of this.pets) {
      if (!pet.window.isDestroyed()) {
        pet.window.webContents.send(IPC_CHANNELS.command, command)
      }
    }
  }

  private clampPetsToDisplay() {
    const { leftBound, rightBound, topBound, bottomBound } = this.getWindowBounds()

    for (const pet of this.pets) {
      pet.x = clamp(pet.x, leftBound, rightBound)
      pet.y = clamp(pet.y, topBound, bottomBound)
    }
  }

  private createPetActor(variantId: PetVariantId, position?: { x?: number; y?: number }) {
    const lane = this.pets.length % LANE_OFFSETS.length
    const window = new BrowserWindow({
      width: PET_WINDOW_WIDTH,
      height: PET_WINDOW_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      title: 'ClawPet',
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    const actor: PetActor = {
      activity: 'idle',
      activityTime: randomBetween(1.6, 3),
      facing: -1,
      id: `pet-${this.serial++}`,
      lane,
      speechText: '',
      speechTime: 0,
      variantId,
      velocity: 0,
      window,
      x: typeof position?.x === 'number' ? position.x : this.findSpawnX(),
      y: typeof position?.y === 'number' ? position.y : this.getWindowY(lane)
    }

    this.webContentsToPetId.set(window.webContents.id, actor.id)
    this.applyWindowSettings(window)
    this.positionWindow(actor)

    window.once('ready-to-show', () => {
      window.showInactive()
    })

    window.on('closed', () => {
      this.removePetById(actor.id)
    })

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return actor
  }

  private findPetById(petId: string) {
    return this.pets.find((pet) => pet.id === petId) ?? null
  }

  private findPetByWebContentsId(webContentsId: number) {
    const petId = this.webContentsToPetId.get(webContentsId)
    return petId ? this.findPetById(petId) : null
  }

  private findSpawnX() {
    const { leftBound, rightBound } = this.getHorizontalBounds()
    const preferred = [
      rightBound,
      rightBound - WINDOW_GAP,
      rightBound - WINDOW_GAP * 2,
      rightBound - WINDOW_GAP * 3
    ]

    for (const candidate of preferred) {
      if (!this.pets.some((pet) => Math.abs(pet.x - candidate) < WINDOW_GAP)) {
        return clamp(candidate, leftBound, rightBound)
      }
    }

    return clamp(rightBound - this.pets.length * WINDOW_GAP, leftBound, rightBound)
  }

  private getHorizontalBounds() {
    const { leftBound, rightBound } = this.getWindowBounds()

    return { leftBound, rightBound }
  }

  private getWindowBounds() {
    const { x, width } = screen.getPrimaryDisplay().workArea
    const leftBound = x + WINDOW_MARGIN_X
    const rightBound = x + width - PET_WINDOW_WIDTH - WINDOW_MARGIN_X
    const { y, height } = screen.getPrimaryDisplay().workArea
    const topBound = y + 12
    const bottomBound = y + height - PET_WINDOW_HEIGHT - 8

    return { leftBound, rightBound, topBound, bottomBound }
  }

  private getSoulAnnouncement() {
    if (this.soulState.description.length > 0) {
      return shortenMessage(this.soulState.description)
    }

    return `OpenClaw ${SOUL_STATUS_LABELS[this.soulState.status]}`
  }

  private getWindowY(lane: number) {
    const { y, height } = screen.getPrimaryDisplay().workArea

    return Math.round(
      y + height - PET_WINDOW_HEIGHT - WINDOW_MARGIN_Y - LANE_OFFSETS[lane % LANE_OFFSETS.length]
    )
  }

  private pickNextActivity(pet: PetActor) {
    if (this.settings.soulMode && this.soulState.active) {
      this.applySoulMoodToPet(pet, pet.lane, false)
      return
    }

    const behavior = getPetDefinition(pet.variantId).behavior
    const roll = Math.random()

    if (roll < behavior.greetChance) {
      pet.activity = 'greet'
      pet.activityTime = randomBetween(0.95, 1.2)
      pet.velocity = 0
      if (Math.random() > 0.55) {
        pet.speechText = randomFrom(getPetDefinition(pet.variantId).messages)
        pet.speechTime = 2.4
      }
      this.syncPetState(pet)
      return
    }

    if (roll < 1 - behavior.idleChance - behavior.sleepChance) {
      pet.activity = 'walk'
      pet.activityTime = randomBetween(1.8, 3.6)
      pet.velocity =
        (Math.random() > 0.5 ? 1 : -1) * randomBetween(behavior.walkSpeedMin, behavior.walkSpeedMax)
      pet.facing = pet.velocity >= 0 ? 1 : -1
      this.syncPetState(pet)
      return
    }

    if (roll < 1 - behavior.sleepChance) {
      pet.activity = 'idle'
      pet.activityTime = randomBetween(1.3, 2.5)
      pet.velocity = 0
      this.syncPetState(pet)
      return
    }

    pet.activity = 'sleep'
    pet.activityTime = randomBetween(2.8, 4.2)
    pet.velocity = 0
    this.syncPetState(pet)
  }

  private positionAllWindows() {
    for (const pet of this.pets) {
      this.positionWindow(pet)
    }
  }

  private positionWindow(pet: PetActor) {
    pet.window.setBounds({
      x: Math.round(pet.x),
      y: Math.round(pet.y),
      width: PET_WINDOW_WIDTH,
      height: PET_WINDOW_HEIGHT
    })
  }

  private removePetById(petId: string) {
    const petIndex = this.pets.findIndex((pet) => pet.id === petId)

    if (petIndex < 0) {
      return
    }

    const [pet] = this.pets.splice(petIndex, 1)
    this.webContentsToPetId.delete(pet.window.webContents.id)

    this.resolveSpacing()
    this.positionAllWindows()
    this.notifyLineupChanged()
  }

  private resolveSpacing() {
    const { leftBound, rightBound } = this.getHorizontalBounds()
    const ordered = [...this.pets].sort((leftPet, rightPet) => leftPet.x - rightPet.x)

    for (let index = 1; index < ordered.length; index += 1) {
      const previousPet = ordered[index - 1]
      const currentPet = ordered[index]
      const overlap = WINDOW_GAP - (currentPet.x - previousPet.x)

      if (overlap <= 0) {
        continue
      }

      previousPet.x -= overlap / 2
      currentPet.x += overlap / 2
    }

    for (const pet of this.pets) {
      pet.x = clamp(pet.x, leftBound, rightBound)
    }
  }

  private syncPetState(pet: PetActor) {
    if (pet.window.isDestroyed()) {
      return
    }

    pet.window.webContents.send(IPC_CHANNELS.command, {
      type: 'sync-pet-state',
      pet: this.toPetWindowState(pet)
    } satisfies AppCommand)
  }

  private notifyLineupChanged() {
    this.onLineupChanged?.(this.getStoredLineup())
  }

  private toPetWindowState(pet: PetActor): PetWindowState {
    return {
      activity: pet.activity,
      facing: pet.facing,
      petId: pet.id,
      speechDurationMs: Math.max(0, Math.round(pet.speechTime * 1000)),
      speechText: pet.speechText,
      variantId: pet.variantId,
      // P1-CP-007: 包含会话绑定和优先级信息
      sessionBinding: pet.sessionBinding,
      priorityInfo: pet.priorityInfo
    }
  }

  private triggerGreeting(pet: PetActor) {
    const definition = getPetDefinition(pet.variantId)

    pet.activity = 'greet'
    pet.activityTime = 0.95
    pet.velocity = 0
    pet.speechText = randomFrom(definition.messages)
    pet.speechTime = 2.3
    this.syncPetState(pet)
  }

  private update(deltaSeconds: number) {
    let didMoveWindow = false

    for (const pet of this.pets) {
      if (pet.speechTime > 0) {
        pet.speechTime = Math.max(0, pet.speechTime - deltaSeconds)

        if (pet.speechTime === 0 && pet.speechText.length > 0) {
          pet.speechText = ''
          this.syncPetState(pet)
        }
      }
    }

    if (this.settings.paused) {
      return
    }

    const { leftBound, rightBound } = this.getHorizontalBounds()

    for (const pet of this.pets) {
      pet.activityTime -= deltaSeconds

      if (pet.activity === 'walk') {
        pet.x += pet.velocity * deltaSeconds
        didMoveWindow = true

        if (pet.x <= leftBound) {
          pet.x = leftBound
          pet.velocity = Math.abs(pet.velocity)
          pet.facing = 1
          this.syncPetState(pet)
        } else if (pet.x >= rightBound) {
          pet.x = rightBound
          pet.velocity = -Math.abs(pet.velocity)
          pet.facing = -1
          this.syncPetState(pet)
        }
      }

      if (pet.activityTime <= 0) {
        this.pickNextActivity(pet)
      }
    }

    if (didMoveWindow) {
      this.resolveSpacing()
      this.positionAllWindows()
    }
  }
}
