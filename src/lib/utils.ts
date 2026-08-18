import type { MenuItem } from '@/types'

/** 旧形式のMenuItemを新形式にマイグレーション */
export function migrateMenuItem(item: MenuItem & { weight?: number; reps?: number; sets?: number }): MenuItem {
  if (item.setGroups && item.setGroups.length > 0) {
    return { id: item.id, name: item.name, setGroups: item.setGroups }
  }
  const weight = item.weight ?? 0
  const reps = item.reps ?? 10
  const sets = item.sets ?? 3
  return {
    id: item.id,
    name: item.name,
    setGroups: [{ weight, reps, sets }],
  }
}

/** ユニークID生成 */
export function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 端末のローカル日付を YYYY-MM-DD で返す（UTC ではなく 0:00 区切り） */
export function toLocalDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 次のローカル 0:00 までのミリ秒 */
export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(1, next.getTime() - now.getTime())
}

/** YYYY-MM-DD形式で今日の日付を取得 */
export function getTodayString(): string {
  return toLocalDateString()
}

/** YYYY-MM-DD形式で昨日の日付を取得 */
export function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalDateString(d)
}

/** 日付文字列から曜日を取得 (0=日, 1=月, ..., 6=土) */
export function getWeekday(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay()
}

/** 日付のフォーマット（例: Mar 8） */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}
