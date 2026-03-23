import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { PetVariantId } from '@shared/ipc'

export interface StoredPetEntry {
  variantId: PetVariantId
  x?: number
  y?: number
}

interface StoredLineupFile {
  pets: StoredPetEntry[]
  version: 1
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStoredEntry(input: unknown): StoredPetEntry | null {
  if (!isObject(input) || typeof input.variantId !== 'string') {
    return null
  }

  return {
    variantId: input.variantId as PetVariantId,
    x: typeof input.x === 'number' ? input.x : undefined,
    y: typeof input.y === 'number' ? input.y : undefined
  }
}

export async function loadStoredLineup(filePath: string) {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    if (!isObject(parsed) || parsed.version !== 1 || !Array.isArray(parsed.pets)) {
      return null
    }

    const pets = parsed.pets
      .map((entry) => normalizeStoredEntry(entry))
      .filter((entry): entry is StoredPetEntry => Boolean(entry))

    return pets.length > 0 ? pets : null
  } catch {
    return null
  }
}

export async function saveStoredLineup(filePath: string, pets: StoredPetEntry[]) {
  const payload: StoredLineupFile = {
    pets,
    version: 1
  }

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}
