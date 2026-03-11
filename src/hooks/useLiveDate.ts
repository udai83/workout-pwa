import { useState, useEffect } from 'react'

/** 現在の日付（YYYY-MM-DD）。24時を過ぎると自動更新 */
export function useLiveDate(): string {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const update = () => {
      const next = new Date().toISOString().slice(0, 10)
      setDate((prev) => (prev !== next ? next : prev))
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  return date
}
