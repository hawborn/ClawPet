import type {
  AppCommand,
  GatewayActiveRun,
  GatewayApprovalDecision,
  GatewayApprovalSummary,
  GatewayAttachmentSummary,
  GatewayOutgoingAttachment,
  GatewaySessionSummary,
  GatewayTranscriptEntry,
  OpenClawSnapshot,
  PetVariantId
} from '@shared/ipc'

import { DEFAULT_GATEWAY_SNAPSHOT } from '@shared/ipc'
import { PET_DEFINITIONS } from './pet-definitions'

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function relativeTime(timestamp?: number) {
  if (!timestamp) {
    return ''
  }

  const deltaMs = Date.now() - timestamp
  const deltaMinutes = Math.floor(deltaMs / 60_000)

  if (deltaMinutes <= 0) {
    return '刚刚'
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`
  }

  const deltaHours = Math.floor(deltaMinutes / 60)

  if (deltaHours < 24) {
    return `${deltaHours} 小时前`
  }

  return `${Math.floor(deltaHours / 24)} 天前`
}

function gatewayStatusLabel(snapshot: OpenClawSnapshot) {
  if (!snapshot.configured) {
    return '未发现配置'
  }

  if (snapshot.connected) {
    return '已连接'
  }

  return '离线'
}

function runActivityLabel(activityKind: GatewayActiveRun['activityKind']) {
  switch (activityKind) {
    case 'read':
      return '读取上下文'
    case 'write':
      return '生成回复'
    case 'edit':
      return '编辑文件'
    case 'exec':
      return '执行命令'
    case 'attach':
      return '附加资源'
    case 'tool':
      return '调用工具'
    case 'job':
      return '执行任务'
    default:
      return '处理中'
  }
}

function formatSessionSubtitle(session?: GatewaySessionSummary) {
  if (!session) {
    return ''
  }

  return [session.kind, session.lastChannel, relativeTime(session.updatedAt)].filter(Boolean).join(' · ')
}

const COMPOSER_IMAGE_MAX_COUNT = 4
const COMPOSER_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024

function createAttachmentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read clipboard image'))
    reader.readAsDataURL(file)
  })
}

function inferFileName(file: File, fallbackIndex: number) {
  if (file.name && file.name.trim().length > 0) {
    return file.name
  }

  const extension = (file.type.split('/')[1] || 'png').replace(/[^a-z0-9]+/gi, '') || 'png'
  return `pasted-image-${Date.now()}-${fallbackIndex}.${extension}`
}

function dataUrlToBase64(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(',')
  if (separatorIndex === -1) {
    return ''
  }

  return dataUrl.slice(separatorIndex + 1)
}

function isImageClipboardItem(item: DataTransferItem) {
  return item.kind === 'file' && item.type.startsWith('image/')
}

function clampAttachmentAppend(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
): GatewayOutgoingAttachment[] {
  const availableSlots = Math.max(0, COMPOSER_IMAGE_MAX_COUNT - existing.length)
  if (availableSlots === 0) {
    return existing
  }

  return [...existing, ...incoming.slice(0, availableSlots)]
}

function hasReachedAttachmentLimit(existing: GatewayOutgoingAttachment[]) {
  return existing.length >= COMPOSER_IMAGE_MAX_COUNT
}

function isAttachmentOversized(file: File) {
  return file.size > COMPOSER_IMAGE_MAX_SIZE_BYTES
}

function buildPastedAttachment(file: File, dataUrl: string, fallbackIndex: number): GatewayOutgoingAttachment {
  return {
    id: createAttachmentId(),
    fileName: inferFileName(file, fallbackIndex),
    mimeType: file.type || 'image/png',
    contentBase64: dataUrlToBase64(dataUrl),
    previewDataUrl: dataUrl,
    sizeBytes: file.size
  }
}

async function clipboardItemsToAttachments(items: DataTransferItem[]) {
  const attachments: GatewayOutgoingAttachment[] = []

  for (const [index, item] of items.entries()) {
    const file = item.getAsFile()

    if (!file || isAttachmentOversized(file)) {
      continue
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        continue
      }

      attachments.push(buildPastedAttachment(file, dataUrl, index + 1))
    } catch (error) {
      console.error('Failed to parse pasted image:', error)
    }
  }

  return attachments
}

function extractClipboardImageItems(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items || items.length === 0) {
    return []
  }

  return Array.from(items).filter(isImageClipboardItem)
}

function resolveComposerSessionKey(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return textarea.dataset.sessionKey || activeSessionKey || ''
}

function shouldHandleComposerPaste(target: EventTarget | null): target is HTMLTextAreaElement {
  return target instanceof HTMLTextAreaElement && target.name === 'message'
}

function canAppendAttachments(sessionKey: string) {
  return sessionKey.length > 0
}

function pickAppendableAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
): GatewayOutgoingAttachment[] {
  return clampAttachmentAppend(existing, incoming)
}

function hasImageClipboardPayload(event: ClipboardEvent) {
  return extractClipboardImageItems(event).length > 0
}

function buildPastedAttachments(event: ClipboardEvent) {
  return clipboardItemsToAttachments(extractClipboardImageItems(event))
}

function shouldPreventPasteDefault(event: ClipboardEvent) {
  return hasImageClipboardPayload(event)
}

function hasAttachmentsAdded(before: GatewayOutgoingAttachment[], after: GatewayOutgoingAttachment[]) {
  return after.length > before.length
}

function toAttachmentList(items: GatewayOutgoingAttachment[]) {
  return items
}

function appendAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
): GatewayOutgoingAttachment[] {
  return pickAppendableAttachments(existing, incoming)
}

function normalizePastedAttachments(items: GatewayOutgoingAttachment[]) {
  return toAttachmentList(items)
}

function shouldSkipPasteForLimit(existing: GatewayOutgoingAttachment[]) {
  return hasReachedAttachmentLimit(existing)
}

function shouldSkipPasteForSession(sessionKey: string) {
  return !canAppendAttachments(sessionKey)
}

function preparePastedAttachments(items: GatewayOutgoingAttachment[]) {
  return normalizePastedAttachments(items)
}

function resolveIncomingAttachments(items: GatewayOutgoingAttachment[]) {
  return preparePastedAttachments(items)
}

function applyAttachmentAppend(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
): GatewayOutgoingAttachment[] {
  return appendAttachments(existing, resolveIncomingAttachments(incoming))
}

function isImagePasteEvent(event: ClipboardEvent) {
  return shouldPreventPasteDefault(event)
}

function resolvePastedSessionKey(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return resolveComposerSessionKey(textarea, activeSessionKey)
}

function parsePastedAttachments(event: ClipboardEvent) {
  return buildPastedAttachments(event)
}

function hasPastedAttachmentResult(before: GatewayOutgoingAttachment[], after: GatewayOutgoingAttachment[]) {
  return hasAttachmentsAdded(before, after)
}

function finalizeAppendedAttachments(items: GatewayOutgoingAttachment[]) {
  return items
}

function mergePastedAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
): GatewayOutgoingAttachment[] {
  return finalizeAppendedAttachments(applyAttachmentAppend(existing, incoming))
}

function shouldHandlePasteEvent(event: ClipboardEvent) {
  return isImagePasteEvent(event)
}

function parseClipboardAttachments(event: ClipboardEvent) {
  return parsePastedAttachments(event)
}

function resolveSessionForPaste(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return resolvePastedSessionKey(textarea, activeSessionKey)
}

function hasAppendChange(before: GatewayOutgoingAttachment[], after: GatewayOutgoingAttachment[]) {
  return hasPastedAttachmentResult(before, after)
}

function mergeAttachmentsForPaste(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
) {
  return mergePastedAttachments(existing, incoming)
}

function shouldSkipPaste(event: ClipboardEvent) {
  return !shouldHandlePasteEvent(event)
}

function resolvePasteTargetSessionKey(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return resolveSessionForPaste(textarea, activeSessionKey)
}

function resolvePasteAttachments(event: ClipboardEvent) {
  return parseClipboardAttachments(event)
}

function shouldCommitAttachmentAppend(before: GatewayOutgoingAttachment[], after: GatewayOutgoingAttachment[]) {
  return hasAppendChange(before, after)
}

function appendPastedAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
) {
  return mergeAttachmentsForPaste(existing, incoming)
}

function isValidPasteSessionKey(sessionKey: string) {
  return !shouldSkipPasteForSession(sessionKey)
}

function canPasteMoreAttachments(existing: GatewayOutgoingAttachment[]) {
  return !shouldSkipPasteForLimit(existing)
}

function shouldIgnorePaste(event: ClipboardEvent) {
  return shouldSkipPaste(event)
}

function resolveComposerPasteSessionKey(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return resolvePasteTargetSessionKey(textarea, activeSessionKey)
}

function resolveComposerPasteAttachments(event: ClipboardEvent) {
  return resolvePasteAttachments(event)
}

function shouldUpdateComposerAttachments(before: GatewayOutgoingAttachment[], after: GatewayOutgoingAttachment[]) {
  return shouldCommitAttachmentAppend(before, after)
}

function mergeComposerAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
) {
  return appendPastedAttachments(existing, incoming)
}

function isComposerPasteEventIgnored(event: ClipboardEvent) {
  return shouldIgnorePaste(event)
}

function isComposerSessionKeyInvalid(sessionKey: string) {
  return !isValidPasteSessionKey(sessionKey)
}

function isComposerAttachmentLimitReached(existing: GatewayOutgoingAttachment[]) {
  return !canPasteMoreAttachments(existing)
}

function normalizeComposerPastedAttachments(items: GatewayOutgoingAttachment[]) {
  return items
}

function updateComposerAttachmentsForPaste(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
) {
  return mergeComposerAttachments(existing, normalizeComposerPastedAttachments(incoming))
}

function shouldApplyComposerAttachmentUpdate(
  before: GatewayOutgoingAttachment[],
  after: GatewayOutgoingAttachment[]
) {
  return shouldUpdateComposerAttachments(before, after)
}

function isComposerPasteTarget(target: EventTarget | null): target is HTMLTextAreaElement {
  return shouldHandleComposerPaste(target)
}

function resolveClipboardImageAttachments(event: ClipboardEvent) {
  return resolveComposerPasteAttachments(event)
}

function resolvePasteSessionKey(textarea: HTMLTextAreaElement, activeSessionKey?: string) {
  return resolveComposerPasteSessionKey(textarea, activeSessionKey)
}

function shouldSkipComposerPasteEvent(event: ClipboardEvent) {
  return isComposerPasteEventIgnored(event)
}

function shouldSkipComposerPasteForSession(sessionKey: string) {
  return isComposerSessionKeyInvalid(sessionKey)
}

function shouldSkipComposerPasteForLimit(existing: GatewayOutgoingAttachment[]) {
  return isComposerAttachmentLimitReached(existing)
}

function appendComposerPastedAttachments(
  existing: GatewayOutgoingAttachment[],
  incoming: GatewayOutgoingAttachment[]
) {
  return updateComposerAttachmentsForPaste(existing, incoming)
}

function shouldCommitComposerPastedAttachments(
  before: GatewayOutgoingAttachment[],
  after: GatewayOutgoingAttachment[]
) {
  return shouldApplyComposerAttachmentUpdate(before, after)
}

function resolveComposerPasteImages(event: ClipboardEvent) {
  return resolveClipboardImageAttachments(event)
}

export class OpenClawPanelApp {
  private destroySubscription: (() => void) | null = null
  private lastRenderedSessionKey = ''
  private lastRenderedTimelineCursor = ''
  private stickToLatest = true
  private isComposing = false
  private pendingRenderAfterComposition = false
  private pendingRender = false
  private renderRequestId: number | null = null
  private isScrolling = false
  private scrollStopTimer: NodeJS.Timeout | null = null
  private readonly composerDrafts = new Map<string, string>()
  private readonly composerAttachments = new Map<string, GatewayOutgoingAttachment[]>()
  private readonly fallbackComposerSessionKey = '__pending-session__'
  private snapshot: OpenClawSnapshot = { ...DEFAULT_GATEWAY_SNAPSHOT }

  constructor(private readonly root: HTMLDivElement) {}

  async mount() {
    this.snapshot = await window.desktopPet.getGatewaySnapshot()
    this.root.className = 'panel-root'
    this.render()

    this.destroySubscription = window.desktopPet.onCommand((command) => this.handleCommand(command))
    this.attachEvents()
  }

  destroy() {
    if (this.destroySubscription) {
      this.destroySubscription()
      this.destroySubscription = null
    }
    
    if (this.renderRequestId !== null) {
      cancelAnimationFrame(this.renderRequestId)
      this.renderRequestId = null
    }
    
    if (this.scrollStopTimer) {
      clearTimeout(this.scrollStopTimer)
      this.scrollStopTimer = null
    }
  }

  private attachEvents() {
    // Track IME composition events to avoid re-rendering during input method composition
    this.root.addEventListener('compositionstart', () => {
      this.isComposing = true
      this.pendingRenderAfterComposition = false
    })

    this.root.addEventListener('compositionend', () => {
      this.isComposing = false
      // If a render was pending during composition, do it now
      if (this.pendingRenderAfterComposition) {
        this.pendingRenderAfterComposition = false
        this.render()
      }
    })

    this.root.addEventListener('click', (event) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      const actionTarget = target.closest<HTMLElement>('[data-action]')

      if (!actionTarget || !this.root.contains(actionTarget)) {
        return
      }

      const action = actionTarget.dataset.action

      if (action === 'refresh') {
        void window.desktopPet.refreshGateway()
        return
      }

      if (action === 'abort') {
        void window.desktopPet.abortGatewayRun(this.snapshot.activeSessionKey)
        return
      }

      if (action === 'session') {
        const sessionKey = actionTarget.dataset.sessionKey
        if (sessionKey) {
          void window.desktopPet.selectGatewaySession(sessionKey)
        }
        return
      }

      if (action === 'approval') {
        const approvalId = actionTarget.dataset.approvalId
        const decision = actionTarget.dataset.decision as GatewayApprovalDecision | undefined

        if (approvalId && decision) {
          void window.desktopPet.resolveGatewayApproval(approvalId, decision)
        }
        return
      }

      if (action === 'skin-all') {
        const variantId = actionTarget.dataset.variantId
        if (variantId) {
          void window.desktopPet.setAllPetVariant(variantId as PetVariantId)
        }
        return
      }

      if (action === 'skin-random') {
        void window.desktopPet.randomizePetVariants()
      }

      if (action === 'pick-images') {
        void this.handlePickImages()
        return
      }

      if (action === 'remove-attachment') {
        const attachmentId = actionTarget.dataset.attachmentId
        if (attachmentId) {
          this.removeComposerAttachment(attachmentId)
        }
        return
      }

      if (action === 'copy-text') {
        void this.handleCopyText(actionTarget)
        return
      }
    })

    this.root.addEventListener('input', (event) => {
      const target = event.target

      if (!(target instanceof HTMLTextAreaElement) || target.name !== 'message') {
        return
      }

      const sessionKey = target.dataset.sessionKey || this.snapshot.activeSessionKey
      this.setComposerDraft(sessionKey, target.value)
    })

    this.root.addEventListener('paste', (event) => {
      if (!(event instanceof ClipboardEvent)) {
        return
      }

      const target = event.target
      if (!isComposerPasteTarget(target)) {
        return
      }

      void this.handleComposerPaste(event, target)
    })

    this.root.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return
      }

      const target = event.target

      if (!(target instanceof HTMLTextAreaElement) || target.name !== 'message') {
        return
      }

      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing
      ) {
        return
      }

      event.preventDefault()
      target.form?.requestSubmit()
    })

    this.root.addEventListener('submit', (event) => {
      if (!(event.target instanceof HTMLFormElement)) {
        return
      }

      if (event.target.dataset.form !== 'composer') {
        return
      }

      event.preventDefault()
      const textarea = event.target.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
      const sessionKey = textarea?.dataset.sessionKey || this.snapshot.activeSessionKey
      const message = textarea?.value.trim() || ''
      const attachments = this.getComposerAttachments(sessionKey)

      if ((!message && attachments.length === 0) || !this.snapshot.connected || !sessionKey) {
        return
      }

      void window.desktopPet.sendGatewayMessage({ message, sessionKey, attachments })
      if (textarea) {
        textarea.value = ''
        this.setComposerDraft(sessionKey, '')
      }
      this.clearComposerAttachments(sessionKey)
    })
  }

  private handleCommand(command: AppCommand) {
    if (command.type !== 'sync-gateway-snapshot') {
      return
    }

    const newSnapshot = command.snapshot
    
    // Throttle renders aggressively - only update on structural changes, not streaming changes
    // Skip if the content-relevant parts haven't changed
    const hasStructuralChange = 
      this.snapshot.transcript.length !== newSnapshot.transcript.length ||
      this.snapshot.activeRun?.runId !== newSnapshot.activeRun?.runId ||
      this.snapshot.approvals.length !== newSnapshot.approvals.length ||
      this.snapshot.sessions.length !== newSnapshot.sessions.length ||
      this.snapshot.connected !== newSnapshot.connected
    
    // liveTranscript text changes are streaming content - defer until composition settles
    const hasLiveTranscriptChange = this.snapshot.liveTranscript?.text !== newSnapshot.liveTranscript?.text
    
    this.snapshot = newSnapshot
    
    // If we're in the middle of IME composition, defer rendering until composition ends
    if (this.isComposing) {
      this.pendingRenderAfterComposition = true
      return
    }
    
    // Only render on structural changes, skip streaming-only updates
    if (hasStructuralChange) {
      this.render()
    } else if (hasLiveTranscriptChange && !this.isComposing) {
      // For live transcript changes during composition, just mark as pending but don't render yet
      // This prevents rendering interruption while the streaming is happening
      if (!this.pendingRender && this.renderRequestId === null) {
        // Schedule a deferred render after a short delay to batch streaming updates
        setTimeout(() => {
          if (this.renderRequestId === null) {
            this.render()
          }
        }, 200)
      }
    }
  }

  private renderCurrentTask(snapshot: OpenClawSnapshot) {
    const activeRun = snapshot.activeRun
    if (!activeRun) {
      return ''
    }

    const detail = [activeRun.label, activeRun.summary]
      .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
      .join(' ')

    return `
      <section class="panel-section panel-card panel-window panel-current-task">
        <div class="section-title">
          <h2>🎯 当前最重要任务</h2>
          <span>${escapeHtml(runActivityLabel(activeRun.activityKind))}</span>
        </div>
        <div class="current-task-content">
          <p class="task-label">${escapeHtml(detail || '处理中...')}</p>
          <p class="task-time">${escapeHtml(relativeTime(activeRun.updatedAt))}</p>
        </div>
      </section>
    `
  }

  private renderCatchBallArea(snapshot: OpenClawSnapshot) {
    const hasApprovals = snapshot.approvals.length > 0
    const hasItems = hasApprovals

    if (!hasItems) {
      return `
        <section class="panel-section panel-card panel-window panel-catchball">
          <div class="section-title">
            <h2>⚽ 待我接球</h2>
            <span>一切顺畅</span>
          </div>
          <div class="catchball-empty">
            <p>👍 当前没有需要你立即处理的事项</p>
          </div>
        </section>
      `
    }

    const approvalsMarkup = snapshot.approvals.length > 0
      ? snapshot.approvals.map((approval) => `
        <article class="catchball-item approval-item">
          <div class="item-header">
            <strong>📋 ${escapeHtml(approval.command || '待确认执行')}</strong>
            <span>${approval.expiresAtMs ? relativeTime(approval.expiresAtMs) : '等待决策'}</span>
          </div>
          <p>${escapeHtml(approval.cwd || approval.sessionKey || 'OpenClaw 请求你做一个选择')}</p>
          <div class="approval-actions">
            <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-once">允许一次</button>
            <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-always">总是允许</button>
            <button class="danger" data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="deny">拒绝</button>
          </div>
        </article>
      `).join('')
      : ''

    return `
      <section class="panel-section panel-card panel-window panel-catchball">
        <div class="section-title">
          <h2>⚽ 待我接球</h2>
          <span>${hasApprovals ? `${snapshot.approvals.length} 个审批待决` : '一切顺畅'}</span>
        </div>
        <div class="catchball-list">${approvalsMarkup}</div>
      </section>
    `
  }

  private renderApproval(approval: GatewayApprovalSummary) {
    return `
      <article class="panel-card approval-card">
        <div class="panel-card-top">
          <strong>${escapeHtml(approval.command || '待确认执行')}</strong>
          <span>${approval.expiresAtMs ? relativeTime(approval.expiresAtMs) : '等待决策'}</span>
        </div>
        <p>${escapeHtml(approval.cwd || approval.sessionKey || 'OpenClaw 请求你做一个选择')}</p>
        <div class="approval-actions">
          <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-once">允许一次</button>
          <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-always">总是允许</button>
          <button class="danger" data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="deny">拒绝</button>
        </div>
      </article>
    `
  }

  private renderTranscriptEntry(entry: GatewayTranscriptEntry) {
    const roleClass = entry.role === 'user' ? 'user' : entry.role === 'tool' ? 'tool' : 'assistant'
    const kindLabel =
      entry.kind === 'tool-call'
        ? `工具调用 · ${entry.toolName || 'tool'}`
        : entry.kind === 'tool-result'
          ? `工具结果 · ${entry.toolName || 'tool'}`
          : entry.kind === 'thinking'
            ? '思考'
            : entry.kind === 'status'
              ? '状态'
              : entry.role === 'user'
                ? '你'
                : 'OpenClaw'

    const attachmentsMarkup = entry.attachments
      ? entry.attachments
          .map((attachment) => this.renderAttachment(attachment, entry.role === 'user'))
          .join('')
      : ''

    const copyButton =
      entry.text.trim().length > 0
        ? `<button class="copy-button" data-action="copy-text" data-entry-id="${escapeHtml(entry.id)}" title="复制文本">📋</button>`
        : ''

    return `
      <div class="timeline-item ${roleClass} transcript-${entry.kind}">
        <div class="timeline-rail"><span class="timeline-dot"></span></div>
        <article class="message-bubble ${roleClass} transcript-${entry.kind}">
          <header>${escapeHtml(kindLabel)} <span>${relativeTime(entry.timestamp)}</span>${copyButton}</header>
          ${attachmentsMarkup}
          <p>${escapeHtml(entry.text)}</p>
        </article>
      </div>
    `
  }

  private renderActiveRun(activeRun: GatewayActiveRun) {
    const detail = [activeRun.label, activeRun.summary]
      .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
      .join('\n')

    return `
      <div class="timeline-item assistant transcript-status active-run">
        <div class="timeline-rail"><span class="timeline-dot"></span></div>
        <article class="message-bubble assistant transcript-status active-run-bubble">
          <header>执行中 · ${escapeHtml(runActivityLabel(activeRun.activityKind))} <span>${relativeTime(activeRun.updatedAt)}</span></header>
          <p>${escapeHtml(detail || 'OpenClaw 正在处理当前会话')}</p>
        </article>
      </div>
    `
  }

  private isNearTimelineBottom(timeline: HTMLElement) {
    return timeline.scrollHeight - timeline.clientHeight - timeline.scrollTop <= 56
  }

  private wireTimelineScroll(timeline: HTMLElement) {
    if (timeline.dataset.scrollBound === '1') {
      return
    }

    timeline.dataset.scrollBound = '1'
    timeline.addEventListener(
      'scroll',
      () => {
        // Mark as scrolling to prevent renders during scroll
        this.isScrolling = true
        this.stickToLatest = this.isNearTimelineBottom(timeline)
        
        // Clear existing timeout
        if (this.scrollStopTimer) {
          clearTimeout(this.scrollStopTimer)
        }
        
        // Set timeout to mark scrolling as stopped after 150ms of no scroll events
        this.scrollStopTimer = setTimeout(() => {
          this.isScrolling = false
          this.scrollStopTimer = null
          
          // If there's a pending render after scroll stops, render now
          if (this.pendingRender) {
            this.pendingRender = false
            this.render()
          }
        }, 150)
      },
      { passive: true }
    )
  }

  private getComposerDraftKey(sessionKey?: string) {
    const normalized = sessionKey?.trim() || ''
    return normalized || this.fallbackComposerSessionKey
  }

  private setComposerDraft(sessionKey: string | undefined, value: string) {
    const key = this.getComposerDraftKey(sessionKey)

    if (value.length === 0) {
      this.composerDrafts.delete(key)
      return
    }

    this.composerDrafts.set(key, value)
  }

  private getComposerDraft(sessionKey?: string) {
    return this.composerDrafts.get(this.getComposerDraftKey(sessionKey)) || ''
  }

  private getComposerAttachments(sessionKey?: string): GatewayOutgoingAttachment[] {
    const key = this.getComposerDraftKey(sessionKey)
    return this.composerAttachments.get(key) || []
  }

  private setComposerAttachments(sessionKey: string | undefined, attachments: GatewayOutgoingAttachment[]) {
    const key = this.getComposerDraftKey(sessionKey)
    if (attachments.length === 0) {
      this.composerAttachments.delete(key)
    } else {
      this.composerAttachments.set(key, attachments)
    }
    this.render()
  }

  private clearComposerAttachments(sessionKey?: string) {
    const key = this.getComposerDraftKey(sessionKey)
    this.composerAttachments.delete(key)
  }

  private removeComposerAttachment(attachmentId: string) {
    const sessionKey = this.snapshot.activeSessionKey
    const attachments = this.getComposerAttachments(sessionKey)
    const filtered = attachments.filter((a) => a.id !== attachmentId)
    this.setComposerAttachments(sessionKey, filtered)
  }

  private async handlePickImages() {
    try {
      const attachments = await window.desktopPet.pickGatewayImages()
      if (attachments.length > 0) {
        const sessionKey = this.snapshot.activeSessionKey
        const existing = this.getComposerAttachments(sessionKey)
        const merged = clampAttachmentAppend(existing, attachments)

        if (merged.length > existing.length) {
          this.setComposerAttachments(sessionKey, merged)
        }
      }
    } catch (error) {
      console.error('Failed to pick images:', error)
    }
  }

  private async handleComposerPaste(event: ClipboardEvent, textarea: HTMLTextAreaElement) {
    if (shouldSkipComposerPasteEvent(event)) {
      return
    }

    const sessionKey = resolvePasteSessionKey(textarea, this.snapshot.activeSessionKey)
    if (shouldSkipComposerPasteForSession(sessionKey)) {
      return
    }

    const existing = this.getComposerAttachments(sessionKey)
    if (shouldSkipComposerPasteForLimit(existing)) {
      return
    }

    event.preventDefault()

    const pasted = await resolveComposerPasteImages(event)
    if (pasted.length === 0) {
      return
    }

    const merged = appendComposerPastedAttachments(existing, pasted)
    if (!shouldCommitComposerPastedAttachments(existing, merged)) {
      return
    }

    this.setComposerAttachments(sessionKey, merged)
  }

  private resolveTranscriptText(entryId?: string) {
    if (!entryId) {
      return ''
    }

    const transcriptEntry = this.snapshot.transcript.find((entry) => entry.id === entryId)
    if (transcriptEntry?.text) {
      return transcriptEntry.text
    }

    if (this.snapshot.liveTranscript?.id === entryId) {
      return this.snapshot.liveTranscript.text || ''
    }

    return ''
  }

  private async handleCopyText(actionTarget: HTMLElement) {
    const entryId = actionTarget.dataset.entryId
    const text = this.resolveTranscriptText(entryId)

    if (!text.trim()) {
      return
    }

    let copied = false

    try {
      copied = await window.desktopPet.copyText(text)
    } catch {
      copied = false
    }

    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        copied = false
      }
    }

    const original = actionTarget.textContent || '📋'
    actionTarget.textContent = copied ? '✅' : '⚠️'

    window.setTimeout(() => {
      actionTarget.textContent = original
    }, 900)
  }

  private renderAttachment(attachment: GatewayAttachmentSummary, isUserMessage: boolean): string {
    if (attachment.kind === 'image' && attachment.previewDataUrl) {
      return `
        <div class="attachment-preview ${isUserMessage ? 'user-attachment' : 'assistant-attachment'}">
          <img src="${escapeHtml(attachment.previewDataUrl)}" alt="${escapeHtml(attachment.fileName || '图片')}" />
        </div>
      `
    }
    return ''
  }

  private renderComposerAttachments(sessionKey: string): string {
    const attachments = this.getComposerAttachments(sessionKey)
    if (attachments.length === 0) {
      return ''
    }

    const attachmentItems = attachments
      .map(
        (attachment) => `
      <div class="composer-attachment-item">
        <img src="${escapeHtml(attachment.previewDataUrl || '')}" alt="${escapeHtml(attachment.fileName)}" />
        <button type="button" class="remove-attachment" data-action="remove-attachment" data-attachment-id="${escapeHtml(attachment.id)}" title="移除附件">✕</button>
      </div>
    `
      )
      .join('')

    return `<div class="composer-attachments">${attachmentItems}</div>`
  }

  private render() {
    // If user is actively scrolling, defer render to avoid interrupting scroll
    if (this.isScrolling) {
      this.pendingRender = true
      return
    }

    // Use requestAnimationFrame to batch rendering and avoid blocking scroll events
    if (this.renderRequestId !== null) {
      // Already scheduled, just mark as pending
      this.pendingRender = true
      return
    }

    this.renderRequestId = requestAnimationFrame(() => {
      this.renderRequestId = null
      
      // Double-check not scrolling before rendering
      if (this.isScrolling) {
        this.pendingRender = true
        return
      }
      
      this.performRender()
      
      // If another render was requested while we were rendering, render again
      if (this.pendingRender) {
        this.pendingRender = false
        this.render()
      }
    })
  }

  private performRender() {
    const previousTimeline = this.root.querySelector<HTMLElement>('.conversation-timeline')
    const wasNearBottom = previousTimeline ? this.isNearTimelineBottom(previousTimeline) : true
    const previousTimelineScrollTop = previousTimeline?.scrollTop ?? 0
    const previousComposer = this.root.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
    const wasComposerFocused = previousComposer ? document.activeElement === previousComposer : false
    const previousSelectionStart = previousComposer?.selectionStart ?? null
    const previousSelectionEnd = previousComposer?.selectionEnd ?? null

    if (previousComposer) {
      this.setComposerDraft(
        previousComposer.dataset.sessionKey || this.lastRenderedSessionKey || this.snapshot.activeSessionKey,
        previousComposer.value
      )
    }

    const activeSession =
      this.snapshot.sessions.find((session) => session.key === this.snapshot.activeSessionKey) ??
      this.snapshot.sessions[0]
    const activeSessionKey = activeSession?.key || this.snapshot.activeSessionKey
    const activeRunForSession =
      this.snapshot.activeRun && this.snapshot.activeRun.sessionKey === activeSessionKey
        ? this.snapshot.activeRun
        : null
    const canSend = Boolean(this.snapshot.connected && activeSessionKey)
    const runSummary = this.snapshot.activeRun
      ? `${runActivityLabel(this.snapshot.activeRun.activityKind)} · ${this.snapshot.activeRun.label}`
      : this.snapshot.lastError || '直接对 OpenClaw 说一句话吧'
    const sessionSubtitle = formatSessionSubtitle(activeSession) || '从左侧选择会话后开始对话'
    const conversationSubtitle = activeRunForSession
      ? `${runActivityLabel(activeRunForSession.activityKind)} · ${activeRunForSession.label}`
      : sessionSubtitle
    const conversationChips = [
      activeSession?.model,
      activeSession?.modelProvider,
      activeSession?.originLabel || activeSession?.lastChannel,
      activeSession?.totalTokens ? `${activeSession.totalTokens} tokens` : ''
    ]
      .filter(Boolean)
      .map((label) => `<span class="info-chip">${escapeHtml(label || '')}</span>`)
      .join('')
    const sessionsMarkup =
      this.snapshot.sessions.length > 0
        ? this.snapshot.sessions
            .map((session) => {
              const active = session.key === activeSession?.key ? 'active' : ''
              // CP-008: 会话列表轻量化 - 只显示会话名和最后活动时间
              const lastActivity = relativeTime(session.updatedAt)

              return `
                <button class="session-pill ${active}" data-action="session" data-session-key="${escapeHtml(session.key)}">
                  <strong>${escapeHtml(session.displayName)}</strong>
                  <span>${escapeHtml(lastActivity)}</span>
                </button>
              `
            })
            .join('')
        : '<div class="panel-empty">还没有可见会话</div>'

    const transcriptEntries = this.snapshot.transcript
      .filter((entry) => entry.sessionKey === activeSessionKey)
      .slice(-120)
    const activeLiveTranscript =
      this.snapshot.liveTranscript && this.snapshot.liveTranscript.sessionKey === activeSessionKey
        ? this.snapshot.liveTranscript
        : null
    const shouldRenderLiveTranscript =
      activeLiveTranscript && (activeLiveTranscript.text !== '...' || !activeRunForSession)
    const lastTranscriptEntry = transcriptEntries[transcriptEntries.length - 1]
    const timelineCursor = [
      activeSessionKey,
      transcriptEntries.length,
      lastTranscriptEntry?.id || '',
      lastTranscriptEntry?.timestamp || '',
      activeRunForSession?.runId || '',
      activeRunForSession?.updatedAt || '',
      shouldRenderLiveTranscript && activeLiveTranscript
        ? `${activeLiveTranscript.id}:${activeLiveTranscript.timestamp || ''}:${activeLiveTranscript.text}`
        : ''
    ].join('|')
    const transcriptMarkup =
      transcriptEntries.length > 0 || shouldRenderLiveTranscript || activeRunForSession
        ? [
            ...transcriptEntries.map((entry) => this.renderTranscriptEntry(entry)),
            activeRunForSession ? this.renderActiveRun(activeRunForSession) : '',
            shouldRenderLiveTranscript && activeLiveTranscript
              ? this.renderTranscriptEntry(activeLiveTranscript)
              : ''
          ].join('')
        : '<div class="panel-empty">这里会显示当前会话的完整上下文和工具过程</div>'

    const wardrobeMarkup = PET_DEFINITIONS.map(
      (definition) => `
        <button class="wardrobe-pill" data-action="skin-all" data-variant-id="${escapeHtml(definition.id)}">
          <span class="swatch swatch-${escapeHtml(definition.id)}"></span>
          <strong>${escapeHtml(definition.name)}</strong>
        </button>
      `
    ).join('')

    const currentTaskMarkup = this.renderCurrentTask(this.snapshot)
    const catchBallMarkup = this.renderCatchBallArea(this.snapshot)

    this.root.innerHTML = `
      <div class="panel-shell">
        <div class="panel-layout">
          <aside class="panel-sidebar">
            <!-- CP-008: 面板信息架构重构 - 简化头部，强化核心任务卡片 -->
            <section class="panel-card panel-window panel-summary-card">
              <div class="panel-summary-top">
                <div>
                  <p class="eyebrow">OpenClaw</p>
                  <h1>Desktop Pet</h1>
                </div>
                <div class="hero-status ${this.snapshot.connected ? 'online' : 'offline'} pixel-chip">
                  ${escapeHtml(gatewayStatusLabel(this.snapshot))}
                </div>
              </div>
              <!-- CP-008: 隐藏冗长的元数据，只保留网关地址 -->
              <div class="panel-summary-meta">
                <span>${escapeHtml(this.snapshot.gatewayUrl || this.snapshot.sourcePath || '等待网关地址')}</span>
              </div>
            </section>

            <!-- CP-008: 重点卡片 1 - 当前最重要任务 -->
            ${currentTaskMarkup}

            <!-- CP-008: 重点卡片 2 - 待接球动作 -->
            ${catchBallMarkup}

            <!-- CP-008: 会话列表保持轻量 -->
            <section class="panel-section panel-card panel-window panel-sessions">
              <div class="section-title">
                <h2>🎯 切换会话</h2>
              </div>
              <div class="session-list">${sessionsMarkup}</div>
            </section>

            <!-- CP-008: 像素衣橱 - 作为次要功能保留 -->
            <section class="panel-section panel-card panel-window panel-wardrobe">
              <div class="section-title">
                <h2>👗 像素衣橱</h2>
              </div>
              <div class="wardrobe-list">
                ${wardrobeMarkup}
                <button class="wardrobe-pill wardrobe-random" data-action="skin-random">
                  <span class="swatch swatch-random"></span>
                  <strong>随机换肤</strong>
                </button>
              </div>
            </section>
          </aside>

          <!-- CP-008: 对话区域 - 强化优先级 -->
          <section class="panel-card panel-window panel-conversation">
            <div class="conversation-header">
              <div>
                <p class="eyebrow">📖 实时对话</p>
                <h2>${escapeHtml(activeSession?.displayName || activeSessionKey || '未选会话')}</h2>
                <p class="conversation-subtitle">${escapeHtml(conversationSubtitle)}</p>
              </div>
              <div class="conversation-badges">
                ${conversationChips || '<span class="info-chip muted">模型 · 供应商 · 来源</span>'}
              </div>
            </div>

            <div class="message-list transcript-list conversation-timeline">${transcriptMarkup}</div>

            <form class="composer-card composer-dock" data-form="composer">
              <div class="panel-card-top">
                <strong>直接对当前会话说话</strong>
                <span>${escapeHtml(activeRunForSession ? runActivityLabel(activeRunForSession.activityKind) : 'Enter 发送，Shift+Enter 换行')}</span>
              </div>
              ${this.renderComposerAttachments(activeSessionKey)}
              <textarea
                name="message"
                data-session-key="${escapeHtml(activeSessionKey)}"
                rows="3"
                placeholder="${escapeHtml(
                  activeSessionKey
                    ? '把新消息发进这条会话，agent 过程会直接并进上方时间线...'
                    : '先从左侧选择一个会话，再开始说话...'
                )}"
              ></textarea>
              <div class="composer-actions">
                <button type="button" data-action="pick-images" class="attachment-button" ${canSend ? '' : 'disabled'}>📎 添加图片</button>
                <button type="submit" class="primary" ${canSend ? '' : 'disabled'}>发送</button>
                <button type="button" data-action="abort" ${activeRunForSession ? '' : 'disabled'}>停止</button>
                <button type="button" data-action="refresh">刷新</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    `

    const composer = this.root.querySelector<HTMLTextAreaElement>('textarea[name="message"]')

    if (composer) {
      const draft = this.getComposerDraft(activeSessionKey)
      composer.value = draft

      if (wasComposerFocused) {
        composer.focus()

        if (previousSelectionStart !== null && previousSelectionEnd !== null) {
          const safeStart = Math.min(previousSelectionStart, draft.length)
          const safeEnd = Math.min(previousSelectionEnd, draft.length)
          composer.setSelectionRange(safeStart, safeEnd)
        }
      }
    }

    const timeline = this.root.querySelector<HTMLElement>('.conversation-timeline')

    if (timeline) {
      this.wireTimelineScroll(timeline)

      const hasTimelineUpdate = timelineCursor !== this.lastRenderedTimelineCursor
      const shouldSnapToLatest =
        activeSessionKey !== this.lastRenderedSessionKey ||
        this.stickToLatest ||
        (wasNearBottom && hasTimelineUpdate)

      if (shouldSnapToLatest) {
        timeline.scrollTop = timeline.scrollHeight
      } else {
        const maxScrollTop = Math.max(0, timeline.scrollHeight - timeline.clientHeight)
        timeline.scrollTop = Math.min(previousTimelineScrollTop, maxScrollTop)
      }

      this.stickToLatest = this.isNearTimelineBottom(timeline)
    }

    this.lastRenderedSessionKey = activeSessionKey
    this.lastRenderedTimelineCursor = timelineCursor
  }
}
