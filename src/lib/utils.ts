/** ユニークID生成 */
export function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** YYYY-MM-DD形式で今日の日付を取得 */
export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** YYYY-MM-DD形式で昨日の日付を取得 */
export function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
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
