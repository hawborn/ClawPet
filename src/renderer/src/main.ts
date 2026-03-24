import { OpenClawApprovalApp } from './approval-app'
import './styles.css'

import { OpenClawPanelApp } from './panel-app'
import { PixelPetApp } from './pet-app'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Missing #app root element')
}

const appRoot = root

const queryView = new URLSearchParams(window.location.search).get('view')
const view = queryView === 'panel' || queryView === 'approval' ? queryView : 'pet'

let fatalRendered = false

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function renderFatalError(error: unknown) {
  if (fatalRendered) {
    return
  }

  fatalRendered = true

  const title = view === 'panel' ? '对话面板加载失败' : view === 'approval' ? '审批面板加载失败' : 'ClawPet 启动失败'
  const hint = view === 'panel' ? '可先关闭该面板，再重试双击小猫打开。' : '请重启 ClawPet 后再试。'
  const detail = escapeHtml(formatError(error))

  appRoot.className = ''
  appRoot.innerHTML = `
    <div style="height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#fff7e2;color:#5c3f2c;font-family:Monaco, 'Courier New', 'PingFang SC', monospace;">
      <section style="max-width:620px;width:100%;border:3px solid #7b4f32;background:#fff3cd;box-shadow:6px 6px 0 rgba(91,56,33,0.2);padding:16px 18px;">
        <h1 style="margin:0 0 10px;font-size:18px;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 12px;font-size:12px;line-height:1.6;">${escapeHtml(hint)}</p>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.5;padding:10px;border:2px dashed rgba(90,52,31,0.35);background:rgba(255,255,255,0.65);">${detail}</pre>
      </section>
    </div>
  `
}

window.addEventListener('error', (event) => {
  renderFatalError(event.error ?? event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault()
  renderFatalError(event.reason)
})

async function mountView() {
  if (!window.desktopPet) {
    throw new Error('desktopPet bridge is unavailable. preload may have failed to initialize.')
  }

  if (view === 'panel') {
    const app = new OpenClawPanelApp(appRoot)
    await app.mount()
    return
  }

  if (view === 'approval') {
    const app = new OpenClawApprovalApp(appRoot)
    await app.mount()
    return
  }

  const app = new PixelPetApp(appRoot)
  await app.mount()
}

void mountView().catch((error) => {
  renderFatalError(error)
})
