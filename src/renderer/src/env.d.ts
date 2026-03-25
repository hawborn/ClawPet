import type {
  AppCommand,
  AppSettings,
  GatewayApprovalDecision,
  GatewayOutgoingAttachment,
  GatewaySendMessagePayload,
  OpenClawSnapshot,
  PetVariantId,
  PetSnapshot
} from '@shared/ipc'

export {}

declare global {
  interface Window {
    desktopPet: {
      abortGatewayRun: (sessionKey?: string) => Promise<OpenClawSnapshot>
      cyclePetVariant: () => Promise<void>
      endPetDrag: () => void
      getGatewaySnapshot: () => Promise<OpenClawSnapshot>
      getSnapshot: () => Promise<PetSnapshot>
      copyText: (text: string) => Promise<boolean>
      interact: () => Promise<void>
      movePetDrag: (screenX: number, screenY: number) => void
      onCommand: (listener: (command: AppCommand) => void) => () => void
      openGatewayPanel: () => Promise<void>
      randomizePetVariants: () => Promise<void>
      pickGatewayImages: () => Promise<GatewayOutgoingAttachment[]>
      refreshGateway: () => Promise<OpenClawSnapshot>
      revealWindow: () => Promise<void>
      resolveGatewayApproval: (
        id: string,
        decision: GatewayApprovalDecision
      ) => Promise<OpenClawSnapshot>
      selectGatewaySession: (sessionKey: string) => Promise<OpenClawSnapshot>
      sendGatewayMessage: (payload: GatewaySendMessagePayload) => Promise<OpenClawSnapshot>
      setAllPetVariant: (variantId: PetVariantId) => Promise<void>
      startPetDrag: (screenX: number, screenY: number) => void
      toggleClickThrough: () => Promise<AppSettings>
      togglePause: () => Promise<AppSettings>
      toggleSoulMode: () => Promise<AppSettings>
      setMuted: (muted: boolean) => Promise<AppSettings>
    }
  }
}
