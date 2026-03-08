import type { MenuItem, DailyRecord } from '@/types'
import { storage } from './storage'
import { getWeekday } from './utils'

/** 指定日付の有効なメニュー項目を取得（スケジュール + オーバーライド） */
export function getMenuItemsForDate(dateStr: string): MenuItem[] {
  const weekday = getWeekday(dateStr)
  const schedules = storage.getMenuSchedules()
  const record = storage.getDailyRecord(dateStr)
  const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
  const overrides = record?.menuOverrides ?? []
  const items: MenuItem[] = []

  for (const s of schedules) {
    const matches =
      (s.scheduleType === 'weekday' && s.weekday === weekday) ||
      (s.scheduleType === 'date' && s.date === dateStr)
    if (!matches) continue

    for (const m of s.menuItems) {
      if (hiddenIds.has(m.id)) continue
      const ov = overrides.find((o) => o.replacesId === m.id)
      items.push(ov ? ov.item : m)
    }
  }

  for (const ov of overrides) {
    if (!ov.replacesId) items.push(ov.item)
  }

  return items
}

/** メニューIDから項目を検索（指定日の記録 + スケジュール） */
export function findMenuItem(
  itemId: string,
  dateStr: string,
  record: DailyRecord | null
): MenuItem | null {
  const ov = record?.menuOverrides?.find((o) => o.item.id === itemId)
  if (ov) return ov.item

  const items = getMenuItemsForDate(dateStr)
  return items.find((m) => m.id === itemId) ?? null
}
