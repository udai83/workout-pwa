/** ユニークID生成 */
export function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** YYYY-MM-DD形式で今日の日付を取得 */
export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 日付文字列から曜日を取得 (0=日, 1=月, ..., 6=土) */
export function getWeekday(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay()
}

/** 日付のフォーマット（例: 3月8日） */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
