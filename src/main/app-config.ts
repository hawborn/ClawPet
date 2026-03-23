import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

import { MAX_PETS, type PetVariantId } from '@shared/ipc'

import { PET_DEFINITIONS } from '../renderer/src/pet-definitions'

const VALID_VARIANT_IDS = new Set<PetVariantId>(PET_DEFINITIONS.map((definition) => definition.id))

type FeatureToggleKey =
  | 'CLAWPET_ENABLE_PETS'
  | 'CLAWPET_ENABLE_SOUL_BRIDGE'
  | 'CLAWPET_ENABLE_GATEWAY'
  | 'CLAWPET_STARTUP_LOG'

export interface AppConfig {
  enableGatewayClient: boolean
  enablePets: boolean
  enableSoulBridge: boolean
  startupLog: boolean
  maxPets: number
  defaultPets: PetVariantId[]
  dataDir: string
  lineupFileName: string
}

export interface ResolvedAppConfig extends AppConfig {
  lineupFilePath: string
}

export type AppConfigOverrides = Partial<AppConfig>

export interface AppConfigValidationResult {
  errors: string[]
  warnings: string[]
}

function parseBooleanEnv(key: FeatureToggleKey, fallback: boolean) {
  const raw = process.env[key]

  if (!raw) {
    return fallback
  }

  const value = raw.trim().toLowerCase()

  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false
  }

  return fallback
}

function parseNumberEnv(raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseVariantList(raw: string | undefined) {
  if (!raw) {
    return null
  }

  const variants = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is PetVariantId => VALID_VARIANT_IDS.has(value as PetVariantId))

  return variants.length > 0 ? variants : null
}

function expandHomePath(inputPath: string) {
  if (inputPath === '~') {
    return homedir()
  }

  if (inputPath.startsWith('~/')) {
    return join(homedir(), inputPath.slice(2))
  }

  return inputPath
}

function ensureAbsolutePath(inputPath: string) {
  const expandedPath = expandHomePath(inputPath)
  return isAbsolute(expandedPath) ? expandedPath : resolve(expandedPath)
}

export function resolveAppConfig(userDataPath: string, overrides: AppConfigOverrides = {}): ResolvedAppConfig {
  const envDefaultPets = parseVariantList(process.env.CLAWPET_DEFAULT_PETS)
  const envDataDir = process.env.CLAWPET_DATA_DIR?.trim()
  const envLineupFile = process.env.CLAWPET_LINEUP_FILE?.trim()
  const envMaxPets = parseNumberEnv(process.env.CLAWPET_MAX_PETS, MAX_PETS)

  const defaultPets =
    overrides.defaultPets?.filter((value): value is PetVariantId => VALID_VARIANT_IDS.has(value)) ??
    envDefaultPets ??
    ['peach-cat']

  const config: ResolvedAppConfig = {
    enableGatewayClient:
      overrides.enableGatewayClient ?? parseBooleanEnv('CLAWPET_ENABLE_GATEWAY', true),
    enablePets: overrides.enablePets ?? parseBooleanEnv('CLAWPET_ENABLE_PETS', true),
    enableSoulBridge:
      overrides.enableSoulBridge ?? parseBooleanEnv('CLAWPET_ENABLE_SOUL_BRIDGE', true),
    startupLog: overrides.startupLog ?? parseBooleanEnv('CLAWPET_STARTUP_LOG', true),
    maxPets: Math.trunc(overrides.maxPets ?? envMaxPets),
    defaultPets,
    dataDir: ensureAbsolutePath(overrides.dataDir ?? envDataDir ?? userDataPath),
    lineupFileName: overrides.lineupFileName ?? envLineupFile ?? 'pet-lineup.json',
    lineupFilePath: ''
  }

  config.lineupFilePath = join(config.dataDir, config.lineupFileName)

  return config
}

export function validateAppConfig(config: ResolvedAppConfig): AppConfigValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config.enablePets && !config.enableSoulBridge && !config.enableGatewayClient) {
    errors.push('At least one module should be enabled.')
  }

  if (!Number.isInteger(config.maxPets) || config.maxPets < 1 || config.maxPets > MAX_PETS) {
    errors.push(`maxPets must be an integer between 1 and ${MAX_PETS}.`)
  }

  if (config.enablePets && config.defaultPets.length === 0) {
    errors.push('defaultPets cannot be empty when pet module is enabled.')
  }

  if (config.defaultPets.length > config.maxPets) {
    warnings.push('defaultPets count exceeds maxPets and extra entries will be ignored.')
  }

  if (!config.lineupFileName.endsWith('.json')) {
    warnings.push('lineupFileName is usually expected to be a .json file.')
  }

  return {
    errors,
    warnings
  }
}

export function ensureDataDirectory(config: ResolvedAppConfig) {
  if (!existsSync(config.dataDir)) {
    mkdirSync(config.dataDir, { recursive: true })
  }
}

export function logResolvedConfig(config: ResolvedAppConfig) {
  if (!config.startupLog) {
    return
  }

  console.info('[Clawpet] Runtime config', {
    modules: {
      gateway: config.enableGatewayClient,
      pets: config.enablePets,
      soulBridge: config.enableSoulBridge
    },
    dataDir: config.dataDir,
    lineupFilePath: config.lineupFilePath,
    defaultPets: config.defaultPets,
    maxPets: config.maxPets
  })
}
