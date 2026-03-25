import type { AppCommand, AppSettings, OpenClawSnapshot } from '@shared/ipc'
import { PET_WINDOW_HEIGHT, PET_WINDOW_WIDTH } from '@shared/ipc'

import { SinglePetScene } from './pet-engine'

export class PixelPetApp {
  private readonly canvas = document.createElement('canvas')
  private readonly controls = document.createElement('div')
  private readonly utteranceCard = document.createElement('div')
  private readonly ctx = this.canvas.getContext('2d')
  private destroySubscription: (() => void) | null = null
  private dpr = 1
  private dragPointerId: number | null = null
  private dragStartPoint: { screenX: number; screenY: number; x: number; y: number } | null = null
  private isDraggingPet = false
  private gatewaySnapshot: OpenClawSnapshot | null = null
  private hideControlsTimer: number | null = null
  private lastFrame = 0
  private scene!: SinglePetScene
  private settings: AppSettings = {
    clickThrough: false,
    paused: false,
    soulMode: true,
    muted: false
  }
  private utteranceTimeout: number | null = null
  private currentUtterance: {
    sessionKey?: string
    text: string
    kind: 'approval' | 'done' | 'failed' | 'waiting' | 'progress' | 'summary'
    priority: 'critical' | 'important' | 'normal'
    durationMs: number
    canCopy: boolean
    canExpand: boolean
  } | null = null

  constructor(private readonly root: HTMLDivElement) {
    this.canvas.className = 'pet-stage'
    this.controls.className = 'pet-controls'
    this.controls.innerHTML = `
      <button class="pet-control-btn" data-action="panel">说话</button>
      <button class="pet-control-btn" data-action="abort">停止</button>
      <button class="pet-control-btn" data-action="skin">换装</button>
      <button class="pet-control-btn" data-action="refresh">刷新</button>
    `
    this.utteranceCard.className = 'utterance-card'
    this.utteranceCard.style.display = 'none'
  }

  async mount() {
    if (!this.ctx) {
      throw new Error('Unable to create 2D context')
    }

    this.root.appendChild(this.canvas)
    this.root.appendChild(this.controls)
    this.root.appendChild(this.utteranceCard)
    this.resizeCanvas()

    const [snapshot, gatewaySnapshot] = await Promise.all([
      window.desktopPet.getSnapshot(),
      window.desktopPet.getGatewaySnapshot()
    ])
    this.settings = snapshot.settings
    this.gatewaySnapshot = gatewaySnapshot
    this.scene = new SinglePetScene(snapshot.settings, snapshot.pet, snapshot.soul, gatewaySnapshot)

    this.attachEvents()
    this.attachControls()
    this.destroySubscription = window.desktopPet.onCommand((command) => this.handleCommand(command))
    requestAnimationFrame((timestamp) => this.frame(timestamp))
  }

  private attachControls() {
    this.controls.addEventListener('pointerenter', () => {
      this.setControlsVisible(true)
    })

    this.controls.addEventListener('pointerleave', () => {
      this.scheduleHideControls()
    })

    this.controls.addEventListener('click', (event) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      const action = target.dataset.action

      switch (action) {
        case 'panel':
          void window.desktopPet.openGatewayPanel()
          break
        case 'abort':
          void window.desktopPet.abortGatewayRun(this.gatewaySnapshot?.activeSessionKey)
          break
        case 'skin':
          void window.desktopPet.cyclePetVariant()
          break
        case 'refresh':
          void window.desktopPet.refreshGateway()
          break
        default:
          break
      }
    })
  }

  private attachEvents() {
    window.addEventListener('resize', () => this.resizeCanvas())
    document.addEventListener('contextmenu', (event) => event.preventDefault())

    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.toCanvasPoint(event)
      const isPetHovered = this.scene.hitTest(point.x, point.y)
      this.scene.setHovered(isPetHovered)
      if (isPetHovered && !this.settings.clickThrough && !this.settings.muted) {
        this.setControlsVisible(true)
      }
      this.canvas.style.cursor = isPetHovered && !this.settings.clickThrough && !this.settings.muted ? 'pointer' : 'default'
    })

    this.canvas.addEventListener('pointerleave', () => {
      this.scene.setHovered(false)
      this.canvas.style.cursor = 'default'
      this.scheduleHideControls()
    })

    this.canvas.addEventListener('pointerdown', (event) => {
      if (this.settings.clickThrough || this.settings.muted) {
        return
      }

      const point = this.toCanvasPoint(event)
      if (!this.scene.hitTest(point.x, point.y)) {
        return
      }

      this.dragPointerId = event.pointerId
      this.dragStartPoint = {
        screenX: event.screenX,
        screenY: event.screenY,
        x: point.x,
        y: point.y
      }
      this.isDraggingPet = false
      this.canvas.setPointerCapture(event.pointerId)
    })

    this.canvas.addEventListener('pointermove', (event) => {
      if (this.dragPointerId !== event.pointerId || !this.dragStartPoint) {
        return
      }

      const deltaX = event.screenX - this.dragStartPoint.screenX
      const deltaY = event.screenY - this.dragStartPoint.screenY
      const distance = Math.hypot(deltaX, deltaY)

      if (!this.isDraggingPet && distance > 4) {
        this.isDraggingPet = true
        window.desktopPet.startPetDrag(this.dragStartPoint.screenX, this.dragStartPoint.screenY)
      }

      if (this.isDraggingPet) {
        window.desktopPet.movePetDrag(event.screenX, event.screenY)
      }
    })

    this.canvas.addEventListener('pointerup', (event) => {
      if (this.dragPointerId !== event.pointerId || !this.dragStartPoint) {
        return
      }

      const wasDragging = this.isDraggingPet
      const point = this.toCanvasPoint(event)

      if (wasDragging) {
        window.desktopPet.endPetDrag()
        this.setControlsVisible(true)
      } else if (event.altKey && this.scene.hitTest(point.x, point.y)) {
        this.scene.sparkleAffection(1.6)
        void window.desktopPet.cyclePetVariant()
      } else if (this.scene.hitTest(point.x, point.y)) {
        this.scene.sparkleAffection(1.2)
        void window.desktopPet.interact()
      }

      this.dragPointerId = null
      this.dragStartPoint = null
      this.isDraggingPet = false
      this.canvas.releasePointerCapture(event.pointerId)
    })

    this.canvas.addEventListener('pointercancel', (event) => {
      if (this.dragPointerId !== event.pointerId) {
        return
      }

      if (this.isDraggingPet) {
        window.desktopPet.endPetDrag()
      }

      this.dragPointerId = null
      this.dragStartPoint = null
      this.isDraggingPet = false
    })

    this.canvas.addEventListener('dblclick', (event) => {
      if (this.settings.clickThrough || this.settings.muted) {
        return
      }

      const point = this.toCanvasPoint(event)
      if (this.scene.hitTest(point.x, point.y)) {
        this.scene.sparkleAffection(1.8)
        void window.desktopPet.openGatewayPanel()
      }
    })
  }

  private setControlsVisible(visible: boolean) {
    if (this.hideControlsTimer) {
      window.clearTimeout(this.hideControlsTimer)
      this.hideControlsTimer = null
    }

    if (visible && !this.settings.clickThrough && !this.settings.muted) {
      this.controls.classList.add('visible')
    } else {
      this.controls.classList.remove('visible')
    }
  }

  private scheduleHideControls() {
    if (this.hideControlsTimer) {
      window.clearTimeout(this.hideControlsTimer)
    }

    this.hideControlsTimer = window.setTimeout(() => {
      this.controls.classList.remove('visible')
      this.hideControlsTimer = null
    }, 420)
  }

  private frame(timestamp: number) {
    if (!this.ctx) {
      return
    }

    const deltaSeconds =
      this.lastFrame === 0 ? 1 / 60 : Math.min(0.05, (timestamp - this.lastFrame) / 1_000)

    this.lastFrame = timestamp
    this.scene.update(deltaSeconds)
    this.render(timestamp)
    requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp))
  }

  private handleCommand(command: AppCommand) {
    switch (command.type) {
      case 'sync-pet-state':
        this.scene.setPetState(command.pet)
        break
      case 'sync-settings':
        this.settings = command.settings
        this.scene.setSettings(command.settings)
        if (this.settings.clickThrough || this.settings.muted) {
          this.setControlsVisible(false)
        }
        break
      case 'sync-soul-state':
        this.scene.setSoulState(command.soul)
        break
      case 'sync-gateway-snapshot':
        this.gatewaySnapshot = command.snapshot
        this.scene.setGatewaySnapshot(command.snapshot)
        break
      case 'task-feedback':
        this.scene.playTaskFeedback(command.feedback)
        break
      case 'ceremony-transition':
        // P1: 处理生命周期过渡动画
        this.scene.playCeremonyTransition(command.from, command.to, command.durationMs ?? 600)
        break
      case 'desktop-utterance':
        this.showUtterance(command.utterance)
        break
    }
  }

  private render(now: number) {
    if (!this.ctx) {
      return
    }

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.ctx.clearRect(0, 0, PET_WINDOW_WIDTH, PET_WINDOW_HEIGHT)
    this.ctx.imageSmoothingEnabled = false
    this.scene.render(this.ctx, now)
  }

  private resizeCanvas() {
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.round(PET_WINDOW_WIDTH * this.dpr)
    this.canvas.height = Math.round(PET_WINDOW_HEIGHT * this.dpr)
    this.canvas.style.width = `${PET_WINDOW_WIDTH}px`
    this.canvas.style.height = `${PET_WINDOW_HEIGHT}px`
  }

  private toCanvasPoint(event: MouseEvent | PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * PET_WINDOW_WIDTH
    const y = ((event.clientY - bounds.top) / bounds.height) * PET_WINDOW_HEIGHT

    return { x, y }
  }

  private showUtterance(utterance: {
    sessionKey?: string
    text: string
    kind: 'approval' | 'done' | 'failed' | 'waiting' | 'progress' | 'summary'
    priority: 'critical' | 'important' | 'normal'
    durationMs: number
    canCopy: boolean
    canExpand: boolean
  }) {
    if (this.utteranceTimeout) {
      window.clearTimeout(this.utteranceTimeout)
      this.utteranceTimeout = null
    }

    this.currentUtterance = utterance
    this.renderUtteranceCard()
    this.utteranceCard.style.display = 'block'

    this.utteranceTimeout = window.setTimeout(() => {
      this.hideUtterance()
    }, utterance.durationMs)
  }

  private hideUtterance() {
    this.utteranceCard.style.display = 'none'
    this.currentUtterance = null
    if (this.utteranceTimeout) {
      window.clearTimeout(this.utteranceTimeout)
      this.utteranceTimeout = null
    }
  }

  private renderUtteranceCard() {
    if (!this.currentUtterance) {
      return
    }

    const utterance = this.currentUtterance
    const kindEmoji = {
      approval: '⏸️',
      done: '✅',
      failed: '❌',
      waiting: '⏳',
      progress: '🔄',
      summary: '📋'
    }[utterance.kind]

    const priorityClass = `priority-${utterance.priority}`

    this.utteranceCard.className = `utterance-card ${priorityClass}`
    this.utteranceCard.innerHTML = `
      <div class="utterance-header">
        <span class="utterance-kind">${kindEmoji}</span>
        <span class="utterance-priority">${utterance.priority}</span>
      </div>
      <div class="utterance-text">${this.escapeHtml(utterance.text)}</div>
      <div class="utterance-actions">
        ${utterance.canCopy ? '<button class="utterance-btn" data-action="copy-utterance">📋 复制</button>' : ''}
        ${utterance.canExpand ? '<button class="utterance-btn" data-action="expand-utterance">📖 展开</button>' : ''}
        <button class="utterance-btn" data-action="dismiss-utterance">✕ 关闭</button>
      </div>
    `

    this.attachUtteranceEvents()
  }

  private attachUtteranceEvents() {
    this.utteranceCard.querySelectorAll('.utterance-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const target = event.target as HTMLElement
        const action = target.dataset.action

        if (action === 'copy-utterance' && this.currentUtterance) {
          void window.desktopPet.copyText(this.currentUtterance.text)
        } else if (action === 'expand-utterance') {
          void window.desktopPet.openGatewayPanel()
        } else if (action === 'dismiss-utterance') {
          this.hideUtterance()
        }
      })
    })
  }

  private escapeHtml(input: string): string {
    return input
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  }
}
