import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { AppSettings } from '@shared/ipc'

interface StoredAppState {
  settings: AppSettings
  version: 1
}

const DEFAULT_SETTINGS: AppSettings = {
  clickThrough: false,
  paused: false,
  soulMode: true
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeAppSettings(input: unknown): AppSettings | null {
  if (!isObject(input)) {
    return null
  }

  return {
    clickThrough: typeof input.clickThrough === 'boolean' ? input.clickThrough : DEFAULT_SETTINGS.clickThrough,
    paused: typeof input.paused === 'boolean' ? input.paused : DEFAULT_SETTINGS.paused,
    soulMode: typeof input.soulMode === 'boolean' ? input.soulMode : DEFAULT_SETTINGS.soulMode
  }
}

export async function loadAppSettings(dataDir: string): Promise<AppSettings> {
  const filePath = join(dataDir, 'app-state.json')

  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.settings)) {
      return { ...DEFAULT_SETTINGS }
    }

    const settings = normalizeAppSettings(parsed.settings)
    return settings || { ...DEFAULT_SETTINGS }
  } catch {
    // File doesn't exist or is invalid, return defaults
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveAppSettings(dataDir: string, settings: AppSettings): Promise<void> {
  const filePath = join(dataDir, 'app-state.json')
  const payload: StoredAppState = {
    settings,
    version: 1
  }

  try {
    await mkdir(dataDir, { recursive: true })
    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  } catch (error) {
    try {
      console.error('[ClawPet] Failed to save app settings:', error)
    } catch {
      // Ignore stdio write failures to keep persistence errors non-fatal.
    }
  }
}
