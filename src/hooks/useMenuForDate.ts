import { useMemo } from 'react'
import type { MenuItem } from '@/types'
import { storage } from '@/lib/storage'
import { getWeekday } from '@/lib/utils'

/** 指定日に適用されるメニューを取得（曜日指定 + 日付指定の両方）。IDで重複排除 */
export function useMenuForDate(dateStr: string): MenuItem[] {
  return useMemo(() => {
    const weekday = getWeekday(dateStr)
    const schedules = storage.getMenuSchedules()
    const record = storage.getDailyRecord(dateStr)
    const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
    const overrides = record?.menuOverrides ?? []

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
        const item = ov ? ov.item : m
        if (!seen.has(item.id)) {
          seen.add(item.id)
          items.push(item)
        }
      }
    }
    for (const ov of overrides) {
      if (!ov.replacesId && !seen.has(ov.item.id)) {
        seen.add(ov.item.id)
        items.push(ov.item)
      }
    }
    return items
  }, [dateStr])
}
