import { useMemo } from 'react'
import type { MenuItem } from '@/types'
import { storage } from '@/lib/storage'
import { getTodayString, getWeekday } from '@/lib/utils'

/** 当日に適用されるメニューを取得（曜日指定 + 日付指定の両方） */
export function useTodayMenu(): MenuItem[] {
  return useMemo(() => {
    const today = getTodayString()
    const weekday = getWeekday(today)
    const schedules = storage.getMenuSchedules()

    const items: MenuItem[] = []
    for (const s of schedules) {
      if (s.scheduleType === 'weekday' && s.weekday === weekday) {
        items.push(...s.menuItems)
      } else if (s.scheduleType === 'date' && s.date === today) {
        items.push(...s.menuItems)
      }
    }
    return items
  }, [])
}
