import type {
  AppSettings,
  GatewayActivityKind,
  OpenClawSnapshot,
  PetActivity,
  PetWindowState,
  SoulState,
  SoulStatus,
  TaskLifecyclePhase
} from '@shared/ipc'
import {
  DEFAULT_GATEWAY_SNAPSHOT,
  PET_WINDOW_HEIGHT,
  PET_WINDOW_WIDTH,
  SOUL_STATUS_LABELS,
  TASK_LIFECYCLE_LABELS,
  TASK_LIFECYCLE_EMOTION
} from '@shared/ipc'

import {
  getPetDefinition,
  type AnimationName,
  type PetAccessory,
  type PetBehavior,
  type CatPose,
  type PetDefinition
} from './pet-definitions'

const GRID_SIZE = 20
const PIXEL_SCALE = 4
const PET_SIZE = GRID_SIZE * PIXEL_SCALE
const PET_CENTER_X = PET_WINDOW_WIDTH / 2
const PET_BASE_Y = PET_WINDOW_HEIGHT - 24

const SOUL_STATUS_COLORS: Record<SoulStatus, string> = {
  idle: 'rgba(163, 176, 194, 0.34)',
  thinking: 'rgba(255, 205, 104, 0.42)',
  coding: 'rgba(113, 210, 255, 0.42)',
  running: 'rgba(123, 240, 168, 0.42)',
  waiting: 'rgba(190, 166, 245, 0.42)',
  error: 'rgba(255, 122, 122, 0.44)'
}

const GATEWAY_ACTIVITY_COLORS: Record<GatewayActivityKind, string> = {
  idle: 'rgba(201, 209, 220, 0.34)',
  job: 'rgba(255, 191, 118, 0.4)',
  tool: 'rgba(166, 191, 255, 0.42)',
  read: 'rgba(255, 209, 120, 0.46)',
  write: 'rgba(111, 209, 255, 0.44)',
  edit: 'rgba(118, 230, 214, 0.44)',
  exec: 'rgba(116, 235, 161, 0.44)',
  attach: 'rgba(217, 172, 255, 0.44)'
}

const GATEWAY_ACTIVITY_LABELS: Record<GatewayActivityKind, string> = {
  idle: '空闲',
  job: '任务',
  tool: '工具',
  read: '读取',
  write: '写入',
  edit: '编辑',
  exec: '执行',
  attach: '附加'
}

interface AffectionParticle {
  driftX: number
  life: number
  size: number
  speedY: number
  x: number
  y: number
}

// P1: 生命周期过渡动画状态
interface CeremonyTransitionState {
  fromPhase: TaskLifecyclePhase
  toPhase: TaskLifecyclePhase
  durationMs: number
  startedAt: number
  expiresAt: number
}

function activitySpeed(activity: PetActivity) {
  switch (activity) {
    case 'greet':
      return 7
    case 'sleep':
      return 2
    case 'walk':
      return 6
    default:
      return 2.5
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fillStyle = fill
  ctx.fill()

  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function drawCat(
  ctx: CanvasRenderingContext2D,
  definition: PetDefinition,
  x: number,
  baseY: number,
  facing: -1 | 1,
  pose: CatPose
) {
  const left = -PET_SIZE / 2
  const unit = PIXEL_SCALE
  const spriteTop = baseY - PET_SIZE - pose.hopHeight * unit
  const { palette } = definition
  const bodyY = 10 + pose.bodyShiftY
  const headY = 4 + pose.headShiftY
  const tailX = 2 + pose.tailSwing
  const tailY = 11 - pose.tailLift
  const frontPawY = 17 - pose.frontPawLift
  const backPawY = 17 - pose.backPawLift

  ctx.save()
  ctx.translate(Math.round(x), Math.round(spriteTop))
  if (facing === -1) {
    ctx.scale(-1, 1)
  }

  const rect = (gridX: number, gridY: number, width: number, height: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(left + gridX * unit, gridY * unit, width * unit, height * unit)
  }

  rect(tailX, tailY + 1, 2, 6, palette.outline)
  rect(tailX + 1, tailY + 2, 1, 4, palette.fur)
  rect(tailX + 1, tailY, 4, 2, palette.outline)
  rect(tailX + 2, tailY + 1, 2, 1, palette.fur)

  rect(5, bodyY, 11, 8, palette.outline)
  rect(6, bodyY + 1, 9, 6, palette.fur)
  rect(8, bodyY + 2, 5, 4, palette.accent)
  rect(7, bodyY, 6, 1, palette.shine)

  rect(6, headY, 10, 8, palette.outline)
  rect(7, headY + 1, 8, 6, palette.fur)
  rect(8, headY + 1, 1, 1, palette.shine)
  rect(7, headY - 1 + pose.earFlick, 2, 2, palette.outline)
  rect(8, headY - 2 + pose.earFlick, 1, 1, palette.outline)
  rect(8, headY, 1, 1, palette.innerEar)
  rect(13, headY - 1 + pose.earFlick, 2, 2, palette.outline)
  rect(14, headY - 2 + pose.earFlick, 1, 1, palette.outline)
  rect(14, headY, 1, 1, palette.innerEar)

  rect(7, backPawY, 2, 2, palette.outline)
  rect(8, backPawY, 1, 1, palette.fur)
  rect(13, backPawY, 2, 2, palette.outline)
  rect(13, backPawY, 1, 1, palette.fur)
  rect(9, frontPawY, 2, 2, palette.outline)
  rect(10, frontPawY, 1, 1, palette.fur)
  rect(11, frontPawY, 2, 2, palette.outline)
  rect(11, frontPawY, 1, 1, palette.fur)

  switch (pose.eyeMode) {
    case 'happy':
      rect(9, headY + 4, 2, 1, palette.eye)
      rect(13, headY + 4, 2, 1, palette.eye)
      break
    case 'sleep':
      rect(9, headY + 4, 2, 1, palette.outline)
      rect(13, headY + 4, 2, 1, palette.outline)
      break
    default:
      rect(10, headY + 3, 1, 2, palette.eye)
      rect(13, headY + 3, 1, 2, palette.eye)
      rect(10, headY + 3, 1, 1, palette.shine)
      rect(13, headY + 3, 1, 1, palette.shine)
  }

  rect(11, headY + 5, 1, 1, palette.accent)
  rect(9, headY + 6, 2, 1, palette.blush)
  rect(13, headY + 6, 2, 1, palette.blush)

  drawAccessory(ctx, definition.accessory, palette.accessory, left, unit, headY, bodyY)

  ctx.restore()
}

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: PetAccessory,
  color: string,
  left: number,
  unit: number,
  headY: number,
  bodyY: number
) {
  const rect = (gridX: number, gridY: number, width: number, height: number, fill: string) => {
    ctx.fillStyle = fill
    ctx.fillRect(left + gridX * unit, gridY * unit, width * unit, height * unit)
  }

  switch (accessory) {
    case 'bell':
      rect(10, bodyY + 7, 2, 1, color)
      rect(11, bodyY + 8, 1, 1, '#fff5bf')
      break
    case 'flower':
      rect(6, headY + 1, 1, 1, color)
      rect(7, headY, 1, 1, '#fff3a8')
      rect(7, headY + 2, 1, 1, '#fff3a8')
      rect(8, headY + 1, 1, 1, '#fff3a8')
      rect(7, headY + 1, 1, 1, color)
      break
    case 'scarf':
      rect(9, bodyY + 6, 4, 1, color)
      rect(12, bodyY + 7, 1, 2, color)
      break
    case 'star':
      rect(14, headY + 1, 1, 1, color)
      rect(13, headY + 2, 3, 1, color)
      rect(14, headY + 3, 1, 1, color)
      break
    case 'ribbon':
      rect(13, headY + 1, 1, 1, color)
      rect(14, headY + 1, 1, 1, color)
      rect(14, headY + 2, 1, 1, '#fff2e2')
      break
    default:
      break
  }
}

export class SinglePetScene {
  private affectionParticles: AffectionParticle[] = []
  private animationClock = Math.random() * 4
  private feedbackText: string | null = null
  private feedbackExpiresAt = 0
  private gateway: OpenClawSnapshot
  private hoverAffectionCooldown = 0
  private hovered = false
  private introExpiresAt = performance.now() + 10_000
  private pet: PetWindowState
  private settings: AppSettings
  private soul: SoulState
  private speechExpiresAt = 0
  // P1: 生命周期过渡动画
  private ceremonyTransition: CeremonyTransitionState | null = null

  constructor(
    settings: AppSettings,
    pet: PetWindowState,
    soul: SoulState,
    gateway: OpenClawSnapshot
  ) {
    this.settings = { ...settings }
    this.pet = { ...pet }
    this.soul = { ...soul }
    this.gateway = { ...gateway }
    this.speechExpiresAt =
      pet.speechText.length > 0 ? performance.now() + pet.speechDurationMs : 0
  }

  private getBehavior(): PetBehavior {
    return getPetDefinition(this.pet.variantId).behavior
  }

  hitTest(x: number, y: number) {
    const left = PET_CENTER_X - PET_SIZE / 2
    const top = PET_BASE_Y - PET_SIZE

    return x >= left && x <= left + PET_SIZE && y >= top && y <= top + PET_SIZE
  }

  setHovered(hovered: boolean) {
    this.hovered = hovered
  }

  setGatewaySnapshot(snapshot: OpenClawSnapshot) {
    this.gateway = { ...snapshot }
  }

  setPetState(nextPet: PetWindowState) {
    const now = performance.now()
    const didActivityChange =
      this.pet.activity !== nextPet.activity || this.pet.facing !== nextPet.facing

    this.pet = { ...nextPet }

    if (didActivityChange) {
      this.animationClock = 0
    }

    this.speechExpiresAt = nextPet.speechText.length > 0 ? now + nextPet.speechDurationMs : 0
  }

  setSettings(settings: AppSettings) {
    this.settings = { ...settings }
  }

  setSoulState(soul: SoulState) {
    this.soul = { ...soul }
  }

  playTaskFeedback(feedback: { type: 'completion' | 'failure'; message: string; durationMs: number }) {
    const now = performance.now()
    this.feedbackText = feedback.message
    this.feedbackExpiresAt = now + feedback.durationMs

    if (feedback.type === 'completion') {
      // Completion: sparkle effect and brief animation reset
      this.sparkleAffection(1.5)
      // Reset animation clock to show celebration pose smoothly
      this.animationClock = 0
    } else {
      // Failure: subtle visual feedback via particles
      // Keep the current activity but add visual feedback
      this.affectionParticles.push({
        driftX: (Math.random() - 0.5) * 4,
        life: 0.8,
        size: 1,
        speedY: 5,
        x: PET_CENTER_X + (Math.random() - 0.5) * 20,
        y: PET_BASE_Y - 40 + Math.random() * 8
      })
    }
  }

  // P1: 处理任务生命周期过渡
  playCeremonyTransition(from: TaskLifecyclePhase, to: TaskLifecyclePhase, durationMs: number) {
    const now = performance.now()
    this.ceremonyTransition = {
      fromPhase: from,
      toPhase: to,
      durationMs,
      startedAt: now,
      expiresAt: now + durationMs
    }

    // 根据过渡类型播放相应的反馈
    switch (to) {
      case 'done':
      case 'task-received':
        this.sparkleAffection(1.2)
        this.animationClock = 0
        break
      case 'executing':
      case 'thinking':
        // 轻微重置以显示过渡
        this.animationClock = Math.max(0, this.animationClock - 0.3)
        break
      case 'failed':
        // 失败效果 - 添加粒子
        for (let i = 0; i < 2; i++) {
          this.affectionParticles.push({
            driftX: (Math.random() - 0.5) * 3,
            life: 0.6,
            size: 1,
            speedY: 4,
            x: PET_CENTER_X + (Math.random() - 0.5) * 15,
            y: PET_BASE_Y - 30
          })
        }
        break
      default:
        break
    }
  }

  sparkleAffection(intensity = 1) {
    const count = Math.max(2, Math.round(3 * intensity))

    for (let index = 0; index < count; index += 1) {
      this.affectionParticles.push({
        driftX: (Math.random() - 0.5) * 12,
        life: randomBetween(0.8, 1.3),
        size: Math.random() > 0.55 ? 2 : 1,
        speedY: randomBetween(10, 20),
        x: PET_CENTER_X + (Math.random() - 0.5) * 26,
        y: PET_BASE_Y - 64 + Math.random() * 12
      })
    }
  }

  update(deltaSeconds: number) {
    const behavior = this.getBehavior()

    this.affectionParticles = this.affectionParticles
      .map((particle) => ({
        ...particle,
        life: particle.life - deltaSeconds,
        x: particle.x + particle.driftX * deltaSeconds,
        y: particle.y - particle.speedY * deltaSeconds
      }))
      .filter((particle) => particle.life > 0)

    this.hoverAffectionCooldown = Math.max(0, this.hoverAffectionCooldown - deltaSeconds)

    if (this.hovered && this.hoverAffectionCooldown === 0) {
      this.sparkleAffection(0.8)
      this.hoverAffectionCooldown = behavior.affectionCooldown
    }

    // P1: 清理过期的生命周期过渡动画
    if (this.ceremonyTransition && performance.now() >= this.ceremonyTransition.expiresAt) {
      this.ceremonyTransition = null
    }

    if (this.settings.paused) {
      return
    }

    this.animationClock += deltaSeconds
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
    const definition = getPetDefinition(this.pet.variantId)
    const poseFrames = definition.poses[this.pet.activity as AnimationName]
    const poseIndex =
      Math.floor(this.animationClock * activitySpeed(this.pet.activity)) % poseFrames.length
    const pose = poseFrames[poseIndex]

    this.renderAmbient(ctx, now)
    this.renderGatewayMarks(ctx, now)

    if (this.settings.soulMode) {
      this.renderSoulAura(ctx, now)
      this.renderSoulStatusMarks(ctx, now)
    }

    // P1: 渲染生命周期过渡指示器
    if (this.ceremonyTransition) {
      this.renderCeremonyTransition(ctx, now)
    }

    const shadowHopOffset = Math.max(0, pose.hopHeight)
    const shadowRadiusX = Math.max(10, 24 - shadowHopOffset * 1.4)
    const shadowRadiusY = Math.max(4, 8 - shadowHopOffset * 0.35)

    ctx.save()
    ctx.fillStyle = definition.palette.shadow
    ctx.beginPath()
    ctx.ellipse(PET_CENTER_X, PET_BASE_Y + 4, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    drawCat(ctx, definition, PET_CENTER_X, PET_BASE_Y, this.pet.facing, pose)
    this.renderPetActivityFlair(ctx, now, definition)
    this.renderAffectionParticles(ctx)

    if (this.pet.speechText.length > 0 && now < this.speechExpiresAt) {
      this.drawSpeechBubble(ctx, this.pet.speechText)
    } else if (this.feedbackText && now < this.feedbackExpiresAt) {
      this.drawSpeechBubble(ctx, this.feedbackText)
    }

    this.drawStatusChips(ctx, now)
  }

  private currentGatewayActivity() {
    if (this.gateway.approvals.length > 0) {
      return {
        badge: '审批',
        color: 'rgba(255, 142, 142, 0.5)',
        detail: this.gateway.approvals[0]?.command || '等待你确认执行请求',
        kind: 'exec' as GatewayActivityKind
      }
    }

    if (!this.gateway.connected || !this.gateway.activeRun) {
      return null
    }

    return {
      badge: GATEWAY_ACTIVITY_LABELS[this.gateway.activeRun.activityKind],
      color: GATEWAY_ACTIVITY_COLORS[this.gateway.activeRun.activityKind],
      detail: this.gateway.activeRun.label,
      kind: this.gateway.activeRun.activityKind
    }
  }

  private formatSessionChipLabel(sessionName: string, isHighPriority: boolean) {
    const trimmed = sessionName.trim()
    const normalized = trimmed.toLowerCase() === 'clawpet' ? 'ClawPet' : trimmed
    const safeName = normalized.length > 0 ? normalized : 'Session'
    const maxChars = 12
    const displayName =
      safeName.length <= maxChars ? safeName : `${safeName.slice(0, maxChars - 1)}…`

    return isHighPriority ? `⚡ ${displayName}` : displayName
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, bubbleText: string) {
    ctx.save()
    ctx.font = '12px "Avenir Next", "PingFang SC", sans-serif'
    const bubbleWidth = Math.max(86, ctx.measureText(bubbleText).width + 22)
    const bubbleHeight = 28
    const bubbleX = clamp(PET_CENTER_X - bubbleWidth / 2, 10, PET_WINDOW_WIDTH - bubbleWidth - 10)
    const bubbleY = 18

    drawRoundedPill(
      ctx,
      bubbleX,
      bubbleY,
      bubbleWidth,
      bubbleHeight,
      14,
      'rgba(255, 251, 245, 0.95)',
      'rgba(84, 72, 89, 0.12)'
    )

    ctx.beginPath()
    ctx.moveTo(PET_CENTER_X - 4, bubbleY + bubbleHeight - 2)
    ctx.lineTo(PET_CENTER_X + 2, bubbleY + bubbleHeight + 8)
    ctx.lineTo(PET_CENTER_X + 8, bubbleY + bubbleHeight - 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 251, 245, 0.95)'
    ctx.fill()

    ctx.fillStyle = '#3a3244'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(bubbleText, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 1)
    ctx.restore()
  }

  private drawStatusChips(ctx: CanvasRenderingContext2D, now: number) {
    const chips: string[] = []
    const gatewayActivity = this.currentGatewayActivity()

    // P1-CP-007: 显示会话和优先级信息
    if (this.pet.sessionBinding && this.pet.priorityInfo) {
      const isHighPriority = this.pet.priorityInfo.priority === 'high'
      chips.push(this.formatSessionChipLabel(this.pet.sessionBinding.sessionName, isHighPriority))
    } else if (gatewayActivity) {
      chips.push(`OpenClaw·${gatewayActivity.badge}`)
    } else if (this.settings.soulMode && this.soul.active && this.soul.status !== 'idle') {
      chips.push(
        this.soul.active ? `灵魂·${SOUL_STATUS_LABELS[this.soul.status]}` : '灵魂待接线'
      )
    }

    if (now < this.introExpiresAt) {
      chips.push('双击可开面板')
    }

    if (this.settings.paused) {
      chips.push('暂停中')
    }

    if (this.settings.clickThrough) {
      chips.push('穿透')
    }

    if (chips.length === 0) {
      return
    }

    ctx.save()
    ctx.font = '11px "Avenir Next", "PingFang SC", sans-serif'
    ctx.textBaseline = 'middle'

    let top = PET_WINDOW_HEIGHT - 54

    for (const chip of chips.slice(0, 2)) {
      const width = Math.ceil(ctx.measureText(chip).width + 18)
      drawRoundedPill(ctx, 12, top, width, 24, 12, 'rgba(255, 248, 241, 0.78)')
      ctx.fillStyle = '#4f4556'
      ctx.fillText(chip, 21, top + 12)
      top += 28
    }

    ctx.restore()
  }

  private renderAmbient(ctx: CanvasRenderingContext2D, now: number) {
    ctx.save()

    const gatewayActivity = this.currentGatewayActivity()
    const soulColor =
      this.settings.soulMode && this.soul.active ? SOUL_STATUS_COLORS[this.soul.status] : ''
    const ambientColor = gatewayActivity?.color || soulColor

    for (let index = 0; index < 4; index += 1) {
      const x = 28 + index * 34
      const y = 12 + (index % 2) * 18

      if (ambientColor) {
        ctx.fillStyle = ambientColor
      } else {
        const alpha = 0.1 + (Math.sin(now / 900 + index) + 1) * 0.06
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
      }

      ctx.fillRect(x, y, 2, 2)
      ctx.fillRect(x + 3, y + 3, 1, 1)
    }

    ctx.restore()
  }

  private renderGatewayMarks(ctx: CanvasRenderingContext2D, now: number) {
    const gatewayActivity = this.currentGatewayActivity()

    if (!gatewayActivity) {
      return
    }

    ctx.save()
    ctx.fillStyle = gatewayActivity.color
    ctx.strokeStyle = gatewayActivity.color
    ctx.lineWidth = 2

    switch (gatewayActivity.kind) {
      case 'read': {
        const scanX = PET_CENTER_X - 22 + ((Math.sin(now / 260) + 1) / 2) * 44
        ctx.fillRect(scanX, PET_BASE_Y - 72, 2, 38)
        ctx.fillRect(scanX - 6, PET_BASE_Y - 62, 4, 2)
        ctx.fillRect(scanX + 4, PET_BASE_Y - 46, 4, 2)
        break
      }
      case 'write':
      case 'edit': {
        const offset = (Math.sin(now / 220) + 1) * 4
        ctx.fillRect(PET_CENTER_X + 26, PET_BASE_Y - 52 + offset, 3, 3)
        ctx.fillRect(PET_CENTER_X + 32, PET_BASE_Y - 44 + offset / 2, 2, 2)
        ctx.fillRect(PET_CENTER_X + 24, PET_BASE_Y - 38 + offset / 3, 2, 2)
        break
      }
      case 'exec': {
        const dashOffset = (now / 60) % 18
        for (let index = 0; index < 3; index += 1) {
          ctx.fillRect(PET_CENTER_X - 24 + index * 16 + dashOffset, PET_BASE_Y + 16, 8, 2)
        }
        break
      }
      case 'attach': {
        ctx.beginPath()
        ctx.arc(PET_CENTER_X + 28, PET_BASE_Y - 60, 8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillRect(PET_CENTER_X + 35, PET_BASE_Y - 68, 4, 14)
        break
      }
      case 'tool': {
        const pulse = (Math.sin(now / 180) + 1) / 2
        const centerX = PET_CENTER_X - 30
        const centerY = PET_BASE_Y - 52
        const wing = Math.round(5 + pulse * 3)
        ctx.fillRect(centerX - wing, centerY - 1, wing * 2, 2)
        ctx.fillRect(centerX - 1, centerY - wing, 2, wing * 2)
        ctx.fillRect(centerX + 6, centerY + 6, 3, 3)
        break
      }
      case 'job': {
        const progress = Math.floor(now / 220) % 5
        for (let index = 0; index < 5; index += 1) {
          const fillWidth = index <= progress ? 4 : 2
          const y = PET_BASE_Y - 68 + index * 6
          ctx.fillRect(PET_CENTER_X + 22, y, fillWidth, 3)
        }
        break
      }
      default: {
        ctx.fillRect(PET_CENTER_X - 4, PET_BASE_Y - 70, 8, 3)
        ctx.fillRect(PET_CENTER_X - 10, PET_BASE_Y - 62, 20, 3)
        break
      }
    }

    ctx.restore()
  }

  private renderAffectionParticles(ctx: CanvasRenderingContext2D) {
    if (this.affectionParticles.length === 0) {
      return
    }

    ctx.save()

    for (const particle of this.affectionParticles) {
      const alpha = Math.max(0.16, Math.min(1, particle.life))
      const x = Math.round(particle.x)
      const y = Math.round(particle.y)

      ctx.fillStyle = `rgba(255, 121, 150, ${alpha.toFixed(3)})`
      ctx.fillRect(x, y, particle.size * 2, particle.size)
      ctx.fillRect(x - particle.size, y + particle.size, particle.size * 4, particle.size)
      ctx.fillRect(x, y + particle.size * 2, particle.size * 2, particle.size * 2)
    }

    ctx.restore()
  }

  private renderPetActivityFlair(ctx: CanvasRenderingContext2D, now: number, definition: PetDefinition) {
    ctx.save()
    ctx.fillStyle = definition.palette.accent

    switch (this.pet.activity) {
      case 'walk': {
        const stride = Math.floor((now / 90) % 20)
        const direction = this.pet.facing === 1 ? 1 : -1
        for (let index = 0; index < 3; index += 1) {
          const x = PET_CENTER_X - direction * (12 + index * 9) + stride * direction
          const y = PET_BASE_Y + 7 - (index % 2) * 2
          ctx.fillRect(Math.round(x), y, 3, 2)
          ctx.fillRect(Math.round(x) + 1, y + 2, 2, 1)
        }
        break
      }
      case 'greet': {
        const pulse = (Math.sin(now / 160) + 1) / 2
        const flare = Math.round(3 + pulse * 2)
        const anchors = [
          { x: PET_CENTER_X - 26, y: PET_BASE_Y - 64 },
          { x: PET_CENTER_X + 22, y: PET_BASE_Y - 56 },
          { x: PET_CENTER_X - 4, y: PET_BASE_Y - 72 }
        ]

        for (const anchor of anchors) {
          ctx.fillRect(anchor.x - flare, anchor.y, flare * 2, 1)
          ctx.fillRect(anchor.x, anchor.y - flare, 1, flare * 2)
        }
        break
      }
      case 'sleep': {
        const rise = (now / 220) % 28
        for (let index = 0; index < 3; index += 1) {
          const x = PET_CENTER_X + 16 + index * 8
          const y = PET_BASE_Y - 54 - ((rise + index * 8) % 28)
          ctx.fillRect(x, Math.round(y), 4, 1)
          ctx.fillRect(x + 3, Math.round(y) + 1, 1, 3)
          ctx.fillRect(x, Math.round(y) + 3, 4, 1)
        }
        break
      }
      default: {
        if (Math.floor(now / 320) % 2 === 0) {
          const x = this.pet.facing === 1 ? PET_CENTER_X - 30 : PET_CENTER_X + 26
          const y = PET_BASE_Y - 44 + Math.round(Math.sin(now / 180) * 2)
          ctx.fillRect(x - 2, y, 5, 1)
          ctx.fillRect(x, y - 2, 1, 5)
        }
      }
    }

    ctx.restore()
  }

  // P1: 渲染生命周期过渡的视觉指示器
  private renderCeremonyTransition(ctx: CanvasRenderingContext2D, now: number) {
    if (!this.ceremonyTransition) {
      return
    }

    const elapsed = Math.min(1, (now - this.ceremonyTransition.startedAt) / this.ceremonyTransition.durationMs)
    const emotion = TASK_LIFECYCLE_EMOTION[this.ceremonyTransition.toPhase]

    // 根据目标情感状态选择颜色
    let transitionColor = 'rgba(200, 200, 200, 0.3)' // 默认中立
    switch (emotion) {
      case 'excited':
        transitionColor = `rgba(255, 200, 100, ${0.2 + elapsed * 0.3})`
        break
      case 'focused':
        transitionColor = `rgba(100, 180, 255, ${0.2 + elapsed * 0.3})`
        break
      case 'concerned':
        transitionColor = `rgba(255, 150, 150, ${0.2 + elapsed * 0.3})`
        break
      case 'completed':
        transitionColor = `rgba(100, 240, 100, ${0.2 + elapsed * 0.3})`
        break
      case 'failed':
        transitionColor = `rgba(255, 100, 100, ${0.2 + elapsed * 0.3})`
        break
    }

    ctx.save()
    ctx.fillStyle = transitionColor

    // 绘制过渡指示光环
    const pulse = Math.sin(elapsed * Math.PI) * 0.5 + 0.5
    const radiusX = 35 + pulse * 8
    const radiusY = 12 + pulse * 4

    ctx.beginPath()
    ctx.ellipse(PET_CENTER_X, PET_BASE_Y + 2, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private renderSoulStatusMarks(ctx: CanvasRenderingContext2D, now: number) {
    if (!this.soul.active || this.soul.status === 'idle') {
      return
    }

    if (this.currentGatewayActivity()) {
      return
    }

    ctx.save()
    ctx.fillStyle = SOUL_STATUS_COLORS[this.soul.status]

    switch (this.soul.status) {
      case 'thinking': {
        const orbit = now / 260
        const x = PET_CENTER_X + Math.cos(orbit) * 20
        const y = PET_BASE_Y - 58 + Math.sin(orbit) * 8
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3)
        ctx.fillRect(Math.round(x) + 4, Math.round(y) + 3, 2, 2)
        break
      }
      case 'coding': {
        const wave = Math.round((Math.sin(now / 190) + 1) * 2)
        const y = PET_BASE_Y - 66 + wave
        ctx.fillRect(PET_CENTER_X - 28, y, 3, 12)
        ctx.fillRect(PET_CENTER_X - 24, y + 2, 2, 2)
        ctx.fillRect(PET_CENTER_X - 20, y + 8, 2, 2)
        ctx.fillRect(PET_CENTER_X + 20, y, 3, 12)
        ctx.fillRect(PET_CENTER_X + 24, y + 3, 2, 2)
        ctx.fillRect(PET_CENTER_X + 28, y + 8, 2, 2)
        break
      }
      case 'running': {
        const streak = Math.floor((now / 90) % 16)
        for (let index = 0; index < 4; index += 1) {
          ctx.fillRect(PET_CENTER_X - 32 + streak + index * 10, PET_BASE_Y - 28 - index * 4, 6, 2)
        }
        break
      }
      case 'waiting': {
        const blink = Math.floor(now / 240) % 3
        for (let index = 0; index < 3; index += 1) {
          if (index > blink) {
            continue
          }
          ctx.fillRect(PET_CENTER_X - 10 + index * 8, PET_BASE_Y - 66, 4, 4)
        }
        break
      }
      case 'error': {
        const pulse = Math.round((Math.sin(now / 130) + 1) * 2)
        const size = 10 + pulse
        const centerX = PET_CENTER_X + 30
        const centerY = PET_BASE_Y - 64
        ctx.fillRect(centerX - Math.round(size / 2), centerY - 1, size, 2)
        ctx.fillRect(centerX - 1, centerY - Math.round(size / 2), 2, size)
        break
      }
    }

    ctx.restore()
  }

  private renderSoulAura(ctx: CanvasRenderingContext2D, now: number) {
    if (!this.soul.active) {
      return
    }

    const gatewayActivity = this.currentGatewayActivity()
    const pulse = (Math.sin(now / 320) + 1) / 2
    const radiusX = 30 + pulse * 6
    const radiusY = 11 + pulse * 2

    ctx.save()
    ctx.strokeStyle = gatewayActivity?.color || SOUL_STATUS_COLORS[this.soul.status]
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(PET_CENTER_X, PET_BASE_Y + 2, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}
