import type { MenuItem, DailyRecord } from '@/types'
import { storage } from '@/lib/storage'
import { getWeekday, migrateMenuItem } from '@/lib/utils'

/** 指定日のメニューから menuItemId に一致する項目を取得 */
export function findMenuItem(
  menuItemId: string,
  dateStr: string,
  record: DailyRecord | null
): MenuItem | undefined {
  return getMenuItemsForDate(dateStr, record).find((m) => m.id === menuItemId)
}

/** 指定日のメニュー一覧を取得（スケジュール + オーバーライド + 並び順、ID重複排除） */
export function getMenuItemsForDate(
  dateStr: string,
  record: DailyRecord | null
): MenuItem[] {
  const weekday = getWeekday(dateStr)
  const schedules = storage.getMenuSchedules()
  const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
  const overrides = record?.menuOverrides ?? []
  const order = record?.menuItemOrder

  const seen = new Set<string>()
  const items: MenuItem[] = []

  for (const s of schedules) {
    const matches =
      (s.scheduleType === 'weekday' && s.weekday === weekday) ||
      (s.scheduleType === 'date' && s.date === dateStr)
    if (!matches) continue

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
