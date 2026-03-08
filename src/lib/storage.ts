import type { MenuSchedule, DailyRecord } from '@/types'

const STORAGE_KEYS = {
  MENU_SCHEDULES: 'workout_menu_schedules',
  DAILY_RECORDS: 'workout_daily_records',
} as const

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  getMenuSchedules(): MenuSchedule[] {
    return getItem(STORAGE_KEYS.MENU_SCHEDULES, [])
  },

  setMenuSchedules(schedules: MenuSchedule[]): void {
    setItem(STORAGE_KEYS.MENU_SCHEDULES, schedules)
  },

  getDailyRecords(): Record<string, DailyRecord> {
    return getItem(STORAGE_KEYS.DAILY_RECORDS, {})
  },

  setDailyRecords(records: Record<string, DailyRecord>): void {
    setItem(STORAGE_KEYS.DAILY_RECORDS, records)
  },

  getDailyRecord(date: string): DailyRecord | null {
    const records = this.getDailyRecords()
    return records[date] ?? null
  },

  saveDailyRecord(record: DailyRecord): void {
    const records = this.getDailyRecords()
    records[record.date] = record
    this.setDailyRecords(records)
  },
}
