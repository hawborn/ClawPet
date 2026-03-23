import { OpenClawApprovalApp } from './approval-app'
import './styles.css'

import { OpenClawPanelApp } from './panel-app'
import { PixelPetApp } from './pet-app'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Missing #app root element')
}

const view = new URLSearchParams(window.location.search).get('view')

if (view === 'panel') {
  const app = new OpenClawPanelApp(root)
  void app.mount()
} else if (view === 'approval') {
  const app = new OpenClawApprovalApp(root)
  void app.mount()
} else {
  const app = new PixelPetApp(root)
  void app.mount()
}
