import type { PetVariantId } from '@shared/ipc'

export type AnimationName = 'idle' | 'walk' | 'greet' | 'sleep'
export type EyeMode = 'open' | 'happy' | 'sleep'

export interface CatPose {
  bodyShiftY: number
  headShiftY: number
  frontPawLift: number
  backPawLift: number
  tailLift: number
  tailSwing: number
  earFlick: number
  hopHeight: number
  eyeMode: EyeMode
}

export interface PetPalette {
  accessory: string
  accent: string
  blush: string
  eye: string
  fur: string
  innerEar: string
  outline: string
  shadow: string
  shine: string
}

export type PetAccessory = 'bell' | 'flower' | 'scarf' | 'star' | 'ribbon' | 'none'

export interface PetBehavior {
  affectionCooldown: number
  greetChance: number
  idleChance: number
  sleepChance: number
  walkSpeedMax: number
  walkSpeedMin: number
}

export interface PetDefinition {
  accessory: PetAccessory
  behavior: PetBehavior
  id: PetVariantId
  name: string
  messages: string[]
  palette: PetPalette
  poses: Record<AnimationName, CatPose[]>
}

const basePoses: Record<AnimationName, CatPose[]> = {
  greet: [
    {
      bodyShiftY: 2,
      headShiftY: 1,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 1,
      tailSwing: -1,
      earFlick: 0,
      hopHeight: 0,
      eyeMode: 'happy'
    },
    {
      bodyShiftY: -1,
      headShiftY: -2,
      frontPawLift: 3,
      backPawLift: 2,
      tailLift: 3,
      tailSwing: 1,
      earFlick: -1,
      hopHeight: 4,
      eyeMode: 'happy'
    },
    {
      bodyShiftY: -4,
      headShiftY: -5,
      frontPawLift: 5,
      backPawLift: 4,
      tailLift: 5,
      tailSwing: 2,
      earFlick: 0,
      hopHeight: 8,
      eyeMode: 'happy'
    },
    {
      bodyShiftY: 0,
      headShiftY: -1,
      frontPawLift: 2,
      backPawLift: 1,
      tailLift: 2,
      tailSwing: 1,
      earFlick: 1,
      hopHeight: 2,
      eyeMode: 'happy'
    }
  ],
  idle: [
    {
      bodyShiftY: 0,
      headShiftY: 0,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 0,
      tailSwing: 0,
      earFlick: 0,
      hopHeight: 0,
      eyeMode: 'open'
    },
    {
      bodyShiftY: 1,
      headShiftY: 1,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 1,
      tailSwing: 1,
      earFlick: 1,
      hopHeight: 0,
      eyeMode: 'open'
    },
    {
      bodyShiftY: 1,
      headShiftY: 0,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 1,
      tailSwing: 1,
      earFlick: 1,
      hopHeight: 0,
      eyeMode: 'happy'
    },
    {
      bodyShiftY: 0,
      headShiftY: -1,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 2,
      tailSwing: -1,
      earFlick: -1,
      hopHeight: 0,
      eyeMode: 'open'
    }
  ],
  sleep: [
    {
      bodyShiftY: 1,
      headShiftY: 1,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 0,
      tailSwing: -1,
      earFlick: 1,
      hopHeight: 0,
      eyeMode: 'sleep'
    },
    {
      bodyShiftY: 1,
      headShiftY: 1,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 0,
      tailSwing: 0,
      earFlick: 1,
      hopHeight: 0,
      eyeMode: 'sleep'
    },
    {
      bodyShiftY: 2,
      headShiftY: 2,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 0,
      tailSwing: 1,
      earFlick: 0,
      hopHeight: 0,
      eyeMode: 'sleep'
    }
  ],
  walk: [
    {
      bodyShiftY: 1,
      headShiftY: 0,
      frontPawLift: 0,
      backPawLift: 0,
      tailLift: 1,
      tailSwing: 2,
      earFlick: -1,
      hopHeight: 0,
      eyeMode: 'open'
    },
    {
      bodyShiftY: -1,
      headShiftY: -1,
      frontPawLift: 3,
      backPawLift: 1,
      tailLift: 2,
      tailSwing: 1,
      earFlick: -1,
      hopHeight: 2,
      eyeMode: 'open'
    },
    {
      bodyShiftY: 1,
      headShiftY: 0,
      frontPawLift: 0,
      backPawLift: 2,
      tailLift: 1,
      tailSwing: -1,
      earFlick: 1,
      hopHeight: 0,
      eyeMode: 'open'
    },
    {
      bodyShiftY: -1,
      headShiftY: -1,
      frontPawLift: 1,
      backPawLift: 3,
      tailLift: 2,
      tailSwing: -2,
      earFlick: 1,
      hopHeight: 2,
      eyeMode: 'open'
    }
  ]
}

export const DEFAULT_PET_VARIANT: PetVariantId = 'peach-cat'

export const PET_DEFINITIONS: PetDefinition[] = [
  {
    accessory: 'bell',
    behavior: {
      affectionCooldown: 1.35,
      greetChance: 0.2,
      idleChance: 0.28,
      sleepChance: 0.12,
      walkSpeedMax: 40,
      walkSpeedMin: 22
    },
    id: 'peach-cat',
    name: '蜜桃猫',
    messages: ['喵呜，你今天超可爱', '让我陪你把这段也做完', '摸摸我，我就给你好运', '你写东西的时候最有魅力啦'],
    palette: {
      accessory: '#ffad7a',
      accent: '#f6d7bf',
      blush: '#ef7f87',
      eye: '#2e2533',
      fur: '#f9cbb5',
      innerEar: '#ffdfd2',
      outline: '#6d4a52',
      shadow: 'rgba(109, 74, 82, 0.24)',
      shine: '#fff7ea'
    },
    poses: basePoses
  },
  {
    accessory: 'scarf',
    behavior: {
      affectionCooldown: 1.8,
      greetChance: 0.15,
      idleChance: 0.24,
      sleepChance: 0.12,
      walkSpeedMax: 38,
      walkSpeedMin: 20
    },
    id: 'mint-cat',
    name: '薄荷猫',
    messages: ['我在巡逻，也在偷偷夸你', '薄荷加油包送达，请立刻元气满满', '别紧张，你已经做得很好了', '再坚持一下，我想看你赢'],
    palette: {
      accessory: '#6dbf97',
      accent: '#d6f0e0',
      blush: '#78c4ad',
      eye: '#223238',
      fur: '#bde4d1',
      innerEar: '#e6fff4',
      outline: '#40605a',
      shadow: 'rgba(64, 96, 90, 0.24)',
      shine: '#f7fff9'
    },
    poses: basePoses
  },
  {
    accessory: 'star',
    behavior: {
      affectionCooldown: 1.65,
      greetChance: 0.12,
      idleChance: 0.22,
      sleepChance: 0.22,
      walkSpeedMax: 34,
      walkSpeedMin: 18
    },
    id: 'midnight-cat',
    name: '夜空猫',
    messages: ['夜里最亮的是你，不是屏幕', '再推进一点点，我陪你熬过去', '累了我就替你守着进度', '你一认真，我就想贴过来'],
    palette: {
      accessory: '#f7d67f',
      accent: '#7268c8',
      blush: '#a38cf6',
      eye: '#f6f0ff',
      fur: '#443d72',
      innerEar: '#9e95df',
      outline: '#231f3d',
      shadow: 'rgba(35, 31, 61, 0.3)',
      shine: '#d7cff9'
    },
    poses: basePoses
  },
  {
    accessory: 'ribbon',
    behavior: {
      affectionCooldown: 1.1,
      greetChance: 0.28,
      idleChance: 0.22,
      sleepChance: 0.08,
      walkSpeedMax: 42,
      walkSpeedMin: 24
    },
    id: 'butter-cat',
    name: '奶油猫',
    messages: ['今天这身奶油色，是专门穿给你看的', '我已经准备好负责可爱了', '来吧，让我把今天调成甜一点', '你认真时，我会在旁边发光'],
    palette: {
      accessory: '#ff8f6b',
      accent: '#ffe0a3',
      blush: '#ffb07a',
      eye: '#3a2a24',
      fur: '#ffe9bf',
      innerEar: '#fff2d8',
      outline: '#7b6151',
      shadow: 'rgba(123, 97, 81, 0.22)',
      shine: '#fffaf0'
    },
    poses: basePoses
  },
  {
    accessory: 'flower',
    behavior: {
      affectionCooldown: 0.95,
      greetChance: 0.32,
      idleChance: 0.22,
      sleepChance: 0.08,
      walkSpeedMax: 44,
      walkSpeedMin: 24
    },
    id: 'sakura-cat',
    name: '樱花猫',
    messages: ['樱花色的我，负责把你今天变温柔', '我想贴在你旁边，给你一点好运气', '今天请优先夸夸自己，也夸夸我', '只要你回头，我就在这里眨眼'],
    palette: {
      accessory: '#ff6f96',
      accent: '#ffd7e5',
      blush: '#ff8fb2',
      eye: '#3b2431',
      fur: '#ffc7da',
      innerEar: '#ffe7ef',
      outline: '#7d4d64',
      shadow: 'rgba(125, 77, 100, 0.22)',
      shine: '#fff4f8'
    },
    poses: basePoses
  },
  {
    accessory: 'bell',
    behavior: {
      affectionCooldown: 2.2,
      greetChance: 0.1,
      idleChance: 0.3,
      sleepChance: 0.2,
      walkSpeedMax: 32,
      walkSpeedMin: 16
    },
    id: 'cocoa-cat',
    name: '可可猫',
    messages: ['可可味桌宠报道，今天也想黏着你', '如果你累了，我就变成热可可陪你', '这点进度让我陪你一起啃掉', '我负责可爱，你负责发光'],
    palette: {
      accessory: '#f3d26f',
      accent: '#d1a176',
      blush: '#d88d72',
      eye: '#fff3df',
      fur: '#7a574b',
      innerEar: '#c99683',
      outline: '#37251f',
      shadow: 'rgba(55, 37, 31, 0.28)',
      shine: '#c88f73'
    },
    poses: basePoses
  }
]

export function getPetDefinition(variantId: PetVariantId) {
  return PET_DEFINITIONS.find((definition) => definition.id === variantId) ?? PET_DEFINITIONS[0]
}

export function nextPetVariant(currentVariantId: PetVariantId) {
  const currentIndex = PET_DEFINITIONS.findIndex((definition) => definition.id === currentVariantId)

  if (currentIndex < 0) {
    return PET_DEFINITIONS[0].id
  }

  return PET_DEFINITIONS[(currentIndex + 1) % PET_DEFINITIONS.length].id
}
