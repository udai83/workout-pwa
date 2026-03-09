import type { MenuSchedule, DailyRecord, MenuItem } from '@/types'
import { migrateMenuItem } from '@/lib/utils'

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

function migrateMenuItems(items: MenuItem[]): MenuItem[] {
  return items.map((m) => migrateMenuItem(m as MenuItem & { weight?: number; reps?: number; sets?: number }))
}

function migrateSchedules(schedules: MenuSchedule[]): MenuSchedule[] {
  return schedules.map((s) => ({
    ...s,
    menuItems: migrateMenuItems(s.menuItems),
  }))
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  getMenuSchedules(): MenuSchedule[] {
    const raw = getItem<MenuSchedule[]>(STORAGE_KEYS.MENU_SCHEDULES, [])
    return migrateSchedules(raw)
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
