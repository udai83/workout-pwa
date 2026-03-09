import type { MenuItem, DailyRecord } from '@/types'
import { storage } from '@/lib/storage'
import { getWeekday, migrateMenuItem } from '@/lib/utils'

/** 指定日のメニューから menuItemId に一致する項目を取得 */
export function findMenuItem(
  menuItemId: string,
  dateStr: string,
  record: DailyRecord | null
): MenuItem | undefined {
  const items = getMenuItemsForDate(dateStr, record)
  return items.find((m) => m.id === menuItemId)
}

/** 指定日に適用されるメニュー一覧を取得（曜日指定 + 日付指定の両方） */
export function getMenuItemsForDate(
  dateStr: string,
  record: DailyRecord | null
): MenuItem[] {
  const weekday = getWeekday(dateStr)
  const schedules = storage.getMenuSchedules()
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
      const item = ov ? ov.item : m
      items.push(migrateMenuItem(item))
    }
  }
  for (const ov of overrides) {
    if (!ov.replacesId) items.push(migrateMenuItem(ov.item))
  }
  return items
}
