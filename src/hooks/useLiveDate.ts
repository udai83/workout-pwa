import { useState, useEffect } from 'react'
import { getTodayString, msUntilNextLocalMidnight } from '@/lib/utils'

/** 現在のローカル日付（YYYY-MM-DD）。0:00 に当日へ切り替わる */
export function useLiveDate(): string {
  const [date, setDate] = useState(() => getTodayString())

  useEffect(() => {
    let midnightTimer: number

    const update = () => {
      const next = getTodayString()
      setDate((prev) => (prev !== next ? next : prev))
    }

    const scheduleMidnight = () => {
      midnightTimer = window.setTimeout(() => {
        update()
        scheduleMidnight()
      }, msUntilNextLocalMidnight())
    }

    update()
    scheduleMidnight()
    const intervalId = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)

    return () => {
      window.clearTimeout(midnightTimer)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
    }
  }, [])

  return date
}
