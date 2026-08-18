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

function getCompletedCounts(
  record: DailyRecord,
  itemId: string,
  groupCount: number
): number[] {
  const cm = record.completedMenus.find((m) => m.menuItemId === itemId)
  if (!cm) return Array(groupCount).fill(0)
  if (cm.setGroupCounts?.length) {
    const arr = [...cm.setGroupCounts]
    while (arr.length < groupCount) arr.push(0)
    return arr.slice(0, groupCount)
  }
  const legacy = cm.completedCount ?? 0
  return [legacy, ...Array(Math.max(0, groupCount - 1)).fill(0)]
}

export function isItemFullyCompleted(item: MenuItem, record: DailyRecord): boolean {
  const groups = item.setGroups?.length ? item.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
  const counts = getCompletedCounts(record, item.id, groups.length)
  return groups.every((g, i) => (counts[i] ?? 0) >= Math.max(1, g.sets || 0))
}

function inferPatternFromRecord(
  record: DailyRecord,
  patterns: MenuSchedule[]
): MenuSchedule | undefined {
  if (record.assignedPatternId) {
    return patterns.find((p) => p.id === record.assignedPatternId)
  }
  const ids = new Set(record.completedMenus.map((c) => c.menuItemId))
  return patterns.find((p) => p.menuItems.some((m) => ids.has(m.id)))
}

function getSessionItems(record: DailyRecord, pattern?: MenuSchedule): MenuItem[] {
  const hidden = new Set(record.hiddenScheduleItemIds ?? [])
  const overrides = record.menuOverrides ?? []
  const items: MenuItem[] = []
  const seen = new Set<string>()

  if (pattern) {
    for (const m of pattern.menuItems) {
      if (hidden.has(m.id)) continue
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

  return items
}

/** その日の全メニューでセット完了が揃っているか */
export function isSessionFullyCompleted(record: DailyRecord | null, pattern?: MenuSchedule): boolean {
  if (!record) return false
  const resolved = pattern ?? inferPatternFromRecord(record, getPatternSchedules())
  const items = getSessionItems(record, resolved)
  if (items.length === 0) return false
  return items.every((item) => isItemFullyCompleted(item, record))
}

export function findLastTrainingSession(beforeDate: string): { date: string; record: DailyRecord } | null {
  const records = storage.getDailyRecords()
  const dates = Object.keys(records)
    .filter((d) => d < beforeDate)
    .sort()
    .reverse()
  for (const d of dates) {
    if ((records[d].completedMenus?.length ?? 0) > 0) {
      return { date: d, record: records[d] }
    }
  }
  return null
}

export interface PatternDecision {
  pattern?: MenuSchedule
  lastPattern?: MenuSchedule
  nextPattern?: MenuSchedule
  lastFullyComplete: boolean
  needsChoice: boolean
}

/** 前回が全種目完了なら次のパターン、未完了なら同じパターン＋選択を促す */
export function getPatternDecision(
  dateStr: string,
  record: DailyRecord | null,
  schedules?: MenuSchedule[]
): PatternDecision {
  const patterns = getPatternSchedules(schedules)
  if (patterns.length === 0) {
    return { lastFullyComplete: false, needsChoice: false }
  }

  if (record?.assignedPatternId) {
    const pattern = patterns.find((p) => p.id === record.assignedPatternId) ?? patterns[0]
    const idx = patterns.findIndex((p) => p.id === pattern.id)
    return {
      pattern,
      nextPattern: patterns[(idx + 1) % patterns.length],
      lastFullyComplete: true,
      needsChoice: false,
    }
  }

  const last = findLastTrainingSession(dateStr)
  if (!last) {
    return {
      pattern: patterns[0],
      nextPattern: patterns[patterns.length > 1 ? 1 : 0],
      lastFullyComplete: true,
      needsChoice: false,
    }
  }

  const lastPattern = inferPatternFromRecord(last.record, patterns) ?? patterns[0]
  const lastIndex = patterns.findIndex((p) => p.id === lastPattern.id)
  const idx = lastIndex >= 0 ? lastIndex : 0
  const same = patterns[idx]
  const next = patterns[(idx + 1) % patterns.length]
  const fully = isSessionFullyCompleted(last.record, same)

  return {
    pattern: fully ? next : same,
    lastPattern: same,
    nextPattern: next,
    lastFullyComplete: fully,
    needsChoice: !fully,
  }
}

/** その日に割り当てる回転パターンを解決する */
export function resolvePatternForDate(
  dateStr: string,
  record: DailyRecord | null,
  schedules?: MenuSchedule[]
): MenuSchedule | undefined {
  return getPatternDecision(dateStr, record, schedules).pattern
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
