import type { AppCommand, GatewayApprovalDecision, OpenClawSnapshot } from '@shared/ipc'

import { DEFAULT_GATEWAY_SNAPSHOT } from '@shared/ipc'

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function remainingTime(expiresAtMs?: number) {
  if (!expiresAtMs) {
    return '等待决策'
  }

  const delta = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000))

  if (delta < 60) {
    return `${delta}s 内决策`
  }

  return `${Math.ceil(delta / 60)} 分钟内决策`
}

function getRiskLevel(command?: string): { level: 'low' | 'medium' | 'high'; label: string; icon: string } {
  if (!command) {
    return { level: 'medium', label: '中等风险', icon: '⚠️' }
  }

  const lowerCmd = command.toLowerCase()

  // High risk keywords: rm, delete, kill, drop, truncate, etc.
  if (
    /\b(rm|del|delete|remove|kill|drop|truncate|format|wipe|destroy)\b/.test(lowerCmd) ||
    lowerCmd.includes('sudo') ||
    lowerCmd.includes('&&') ||
    lowerCmd.includes(';')
  ) {
    return { level: 'high', label: '高风险', icon: '🔴' }
  }

  // Low risk keywords: list, show, cat, echo, etc.
  if (/\b(ls|list|show|cat|echo|pwd|cd|grep|find|which|who)\b/.test(lowerCmd)) {
    return { level: 'low', label: '低风险', icon: '✅' }
  }

  return { level: 'medium', label: '中等风险', icon: '⚠️' }
}

export class OpenClawApprovalApp {
  private destroySubscription: (() => void) | null = null
  private snapshot: OpenClawSnapshot = { ...DEFAULT_GATEWAY_SNAPSHOT }

  constructor(private readonly root: HTMLDivElement) {}

  async mount() {
    this.snapshot = await window.desktopPet.getGatewaySnapshot()
    this.root.className = 'approval-root'
    this.render()

    this.destroySubscription = window.desktopPet.onCommand((command) => this.handleCommand(command))
    this.attachEvents()
  }

  private attachEvents() {
    this.root.addEventListener('click', (event) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      const action = target.dataset.action

      if (action === 'open-panel') {
        void window.desktopPet.openGatewayPanel()
        return
      }

      if (action !== 'approval') {
        return
      }

      const approvalId = target.dataset.approvalId
      const decision = target.dataset.decision as GatewayApprovalDecision | undefined

      if (!approvalId || !decision) {
        return
      }

      void window.desktopPet.resolveGatewayApproval(approvalId, decision)
    })
  }

  private handleCommand(command: AppCommand) {
    if (command.type !== 'sync-gateway-snapshot') {
      return
    }

    this.snapshot = command.snapshot
    this.render()
  }

  private render() {
    const approval = this.snapshot.approvals[0]

    if (!approval) {
      this.root.innerHTML = `
        <div class="approval-shell">
          <section class="approval-card panel-window">
            <p class="approval-kicker">OpenClaw</p>
            <h1>当前没有待审批请求</h1>
          </section>
        </div>
      `
      return
    }

    const summary = approval.command || 'OpenClaw 请求执行一条命令'
    const secondary = approval.cwd || approval.sessionKey || '等待你接手这个动作'
    const extraCount =
      this.snapshot.approvals.length > 1 ? `另有 ${this.snapshot.approvals.length - 1} 条待处理请求` : ''
    const riskLevel = getRiskLevel(approval.command)

    this.root.innerHTML = `
      <div class="approval-shell">
        <section class="approval-card panel-window" data-risk="${riskLevel.level}">
          <div class="approval-header">
            <p class="approval-kicker">OpenClaw</p>
            <span class="approval-risk-badge">${riskLevel.icon} ${riskLevel.label}</span>
          </div>
          <h1>OpenClaw 想执行这个动作</h1>
          <div class="approval-command">
            <p class="approval-summary" title="${escapeHtml(summary)}">${escapeHtml(summary)}</p>
            ${secondary ? `<p class="approval-secondary">${escapeHtml(secondary)}</p>` : ''}
          </div>
          <div class="approval-meta">
            <span>${escapeHtml(remainingTime(approval.expiresAtMs))}</span>
            <span>${escapeHtml(extraCount || '等你点头')}</span>
          </div>
          <div class="approval-actions">
            <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="deny" class="danger">拒绝</button>
            <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-once">允许一次</button>
            <button data-action="approval" data-approval-id="${escapeHtml(approval.id)}" data-decision="allow-always" class="primary">总是允许</button>
          </div>
        </section>
      </div>
    `
  }
}
