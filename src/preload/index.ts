import type {
  AppCommand,
  AppSettings,
  GatewayApprovalDecision,
  OpenClawSnapshot,
  PetVariantId,
  PetSnapshot
} from '@shared/ipc'
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc'

const desktopPet = {
  abortGatewayRun: (sessionKey?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.gatewayAbortRun, { sessionKey }) as Promise<OpenClawSnapshot>,
  cyclePetVariant: () => ipcRenderer.invoke(IPC_CHANNELS.petCycleVariant) as Promise<void>,
  endPetDrag: () => ipcRenderer.send(IPC_CHANNELS.petDragEnd),
  getGatewaySnapshot: () =>
    ipcRenderer.invoke(IPC_CHANNELS.gatewayGetSnapshot) as Promise<OpenClawSnapshot>,
  getSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.getSnapshot) as Promise<PetSnapshot>,
  interact: () => ipcRenderer.invoke(IPC_CHANNELS.interact) as Promise<void>,
  movePetDrag: (screenX: number, screenY: number) =>
    ipcRenderer.send(IPC_CHANNELS.petDragMove, { screenX, screenY }),
  onCommand: (listener: (command: AppCommand) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: AppCommand) => listener(command)
    ipcRenderer.on(IPC_CHANNELS.command, handler)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.command, handler)
    }
  },
  openGatewayPanel: () => ipcRenderer.invoke(IPC_CHANNELS.gatewayOpenPanel) as Promise<void>,
  randomizePetVariants: () =>
    ipcRenderer.invoke(IPC_CHANNELS.petRandomizeVariants) as Promise<void>,
  refreshGateway: () => ipcRenderer.invoke(IPC_CHANNELS.gatewayRefresh) as Promise<OpenClawSnapshot>,
  revealWindow: () => ipcRenderer.invoke(IPC_CHANNELS.revealWindow) as Promise<void>,
  resolveGatewayApproval: (id: string, decision: GatewayApprovalDecision) =>
    ipcRenderer.invoke(IPC_CHANNELS.gatewayResolveApproval, {
      id,
      decision
    }) as Promise<OpenClawSnapshot>,
  selectGatewaySession: (sessionKey: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.gatewaySelectSession, sessionKey) as Promise<OpenClawSnapshot>,
  sendGatewayMessage: (message: string, sessionKey?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.gatewaySendMessage, {
      message,
      sessionKey
    }) as Promise<OpenClawSnapshot>,
  setAllPetVariant: (variantId: PetVariantId) =>
    ipcRenderer.invoke(IPC_CHANNELS.petSetAllVariant, variantId) as Promise<void>,
  startPetDrag: (screenX: number, screenY: number) =>
    ipcRenderer.send(IPC_CHANNELS.petDragStart, { screenX, screenY }),
  toggleClickThrough: () =>
    ipcRenderer.invoke(IPC_CHANNELS.toggleClickThrough) as Promise<AppSettings>,
  togglePause: () => ipcRenderer.invoke(IPC_CHANNELS.togglePause) as Promise<AppSettings>,
  toggleSoulMode: () => ipcRenderer.invoke(IPC_CHANNELS.toggleSoulMode) as Promise<AppSettings>
}

contextBridge.exposeInMainWorld('desktopPet', desktopPet)
