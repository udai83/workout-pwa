import type { BodyInfo } from '@/types'

export interface BodyInfoFieldConfig {
  key: keyof BodyInfo
  label: string
  unit: string
  min?: number
  max?: number
  step?: number
}

export const BODY_INFO_FIELDS: BodyInfoFieldConfig[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', min: 0, step: 0.1 },
  { key: 'bodyFat', label: 'Body fat', unit: '%', min: 0, max: 100, step: 0.1 },
  { key: 'muscleMass', label: 'Muscle mass', unit: 'kg', min: 0, step: 0.1 },
]
