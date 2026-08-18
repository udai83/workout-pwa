import type { MenuItem, DailyRecord, MenuSchedule, RoutineMode } from '@/types'
import { storage } from '@/lib/storage'
import { getWeekday, migrateMenuItem, generateId } from '@/lib/utils'

const DEFAULT_PATTERN_NAMES = ['A', 'B', 'C']

/** 指定日のメニューから menuItemId に一致する項目を取得 */
export function findMenuItem(
  menuItemId: string,
  dateStr: string,
  record: DailyRecord | null
): MenuItem | undefined {
  const fromDate = getMenuItemsForDate(dateStr, record).find((m) => m.id === menuItemId)
  if (fromDate) return fromDate

  for (const s of storage.getMenuSchedules()) {
    const found = s.menuItems.find((m) => m.id === menuItemId)
    if (found) return migrateMenuItem(found as MenuItem & { weight?: number; reps?: number; sets?: number })
  }

  const override = record?.menuOverrides?.find((o) => o.item.id === menuItemId)
  return override
    ? migrateMenuItem(override.item as MenuItem & { weight?: number; reps?: number; sets?: number })
    : undefined
}

export function getRoutineMode(): RoutineMode {
  return storage.getRoutineSettings().mode
}

export function getPatternSchedules(schedules?: MenuSchedule[]): MenuSchedule[] {
  const list = schedules ?? storage.getMenuSchedules()
  return list
    .filter((s) => s.scheduleType === 'pattern')
    .slice()
    .sort((a, b) => (a.patternOrder ?? 0) - (b.patternOrder ?? 0))
}

export function nextPatternName(existing: MenuSchedule[]): string {
  const names = new Set(existing.map((s) => s.patternName ?? ''))
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const ch of letters) {
    if (!names.has(ch)) return ch
  }
  return `パターン${existing.length + 1}`
}

export function createPatternSchedule(name: string, order: number): MenuSchedule {
  return {
    id: generateId(),
    scheduleType: 'pattern',
    patternName: name,
    patternOrder: order,
    menuItems: [],
    createdAt: new Date().toISOString(),
  }
}

/** パターンが未作成なら A/B/C を追加して返す */
export function ensureDefaultPatterns(schedules: MenuSchedule[]): MenuSchedule[] {
  if (getPatternSchedules(schedules).length > 0) return schedules
  const created = DEFAULT_PATTERN_NAMES.map((name, i) => createPatternSchedule(name, i))
  return [...schedules, ...created]
}

/** その日に割り当てる回転パターンを解決する */
export function resolvePatternForDate(
  dateStr: string,
  record: DailyRecord | null,
  schedules?: MenuSchedule[]
): MenuSchedule | undefined {
  const patterns = getPatternSchedules(schedules)
  if (patterns.length === 0) return undefined

  if (record?.assignedPatternId) {
    return patterns.find((p) => p.id === record.assignedPatternId) ?? patterns[0]
  }

  const records = storage.getDailyRecords()
  const previousDates = Object.keys(records)
    .filter((d) => d < dateStr)
    .sort()
    .reverse()

  for (const d of previousDates) {
    const prev = records[d]
    const hasWorkout = (prev?.completedMenus?.length ?? 0) > 0
    const lastIndex = prev?.assignedPatternId
      ? patterns.findIndex((p) => p.id === prev.assignedPatternId)
      : -1

    if (hasWorkout) {
      if (lastIndex >= 0) {
        return patterns[(lastIndex + 1) % patterns.length]
      }
      break
    }

    if (lastIndex >= 0) {
      return patterns[lastIndex]
    }
  }

  const completedBefore = Object.values(records).filter(
    (r) => r.date < dateStr && (r.completedMenus?.length ?? 0) > 0
  ).length
  return patterns[completedBefore % patterns.length]
}

function matchesSchedule(
  schedule: MenuSchedule,
  dateStr: string,
  weekday: number,
  mode: RoutineMode,
  assignedPatternId?: string
): boolean {
  if (schedule.scheduleType === 'date' && schedule.date === dateStr) return true
  if (mode === 'weekday') {
    return schedule.scheduleType === 'weekday' && schedule.weekday === weekday
  }
  return schedule.scheduleType === 'pattern' && schedule.id === assignedPatternId
}

/** 指定日のメニュー一覧を取得（スケジュール + オーバーライド + 並び順、ID重複排除） */
export function getMenuItemsForDate(
  dateStr: string,
  record: DailyRecord | null
): MenuItem[] {
  const weekday = getWeekday(dateStr)
  const schedules = storage.getMenuSchedules()
  const mode = getRoutineMode()
  const assignedPatternId = mode === 'pattern'
    ? resolvePatternForDate(dateStr, record, schedules)?.id
    : undefined
  const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
  const overrides = record?.menuOverrides ?? []
  const order = record?.menuItemOrder

  const seen = new Set<string>()
  const items: MenuItem[] = []

  for (const s of schedules) {
    if (!matchesSchedule(s, dateStr, weekday, mode, assignedPatternId)) continue

    for (const m of s.menuItems) {
      if (hiddenIds.has(m.id)) continue
      const ov = overrides.find((o) => o.replacesId === m.id)
      const item = migrateMenuItem(ov ? ov.item : (m as MenuItem & { weight?: number; reps?: number; sets?: number }))
      if (!seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    }
  }

  for (const ov of overrides) {
    if (!ov.replacesId && !seen.has(ov.item.id)) {
      seen.add(ov.item.id)
      items.push(migrateMenuItem(ov.item as MenuItem & { weight?: number; reps?: number; sets?: number }))
    }
  }

  if (order && order.length > 0) {
    const byId = new Map(items.map((m) => [m.id, m]))
    const ordered: MenuItem[] = []
    for (const id of order) {
      const m = byId.get(id)
      if (m) {
        ordered.push(m)
        byId.delete(id)
      }
    }
    byId.forEach((m) => ordered.push(m))
    return ordered
  }

  return items
}
