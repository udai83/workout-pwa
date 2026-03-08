import { useState, useMemo } from 'react'
import { storage } from '@/lib/storage'
import { BODY_INFO_FIELDS } from '@/lib/bodyInfoFields'
import { formatDate } from '@/lib/utils'
import type { BodyInfo } from '@/types'
import './ChangesScreen.css'

interface DataPoint {
  date: string
  value: number
}

export default function ChangesScreen() {
  const records = useMemo(() => storage.getDailyRecords(), [])

  const { firstDate, lastDate } = useMemo(() => {
    const datesWithData = Object.entries(records)
      .filter(([, r]) => Object.values(r.bodyInfo ?? {}).some((v) => v != null))
      .map(([date]) => date)
    if (datesWithData.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      return { firstDate: today, lastDate: today }
    }
    datesWithData.sort()
    return {
      firstDate: datesWithData[0],
      lastDate: datesWithData[datesWithData.length - 1],
    }
  }, [records])

  const [startDate, setStartDate] = useState(firstDate)
  const [endDate, setEndDate] = useState(lastDate)

  const trendData = useMemo(() => {
    const result: Record<string, DataPoint[]> = {}
    for (const field of BODY_INFO_FIELDS) {
      result[field.key] = []
    }
    const dates = Object.keys(records).filter(
      (d) => d >= startDate && d <= endDate
    )
    dates.sort()
    for (const date of dates) {
      const bodyInfo = records[date]?.bodyInfo as BodyInfo | undefined
      if (!bodyInfo) continue
      for (const field of BODY_INFO_FIELDS) {
        const v = bodyInfo[field.key]
        if (v != null && typeof v === 'number') {
          result[field.key].push({ date, value: v })
        }
      }
    }
    return result
  }, [records, startDate, endDate])

  const hasAnyData = Object.values(trendData).some((arr) => arr.length > 0)

  return (
    <div className="changes-screen">
      <header className="changes-header">
        <h1>変化</h1>
        <p className="changes-desc">
          身体情報の推移を確認できます
        </p>
      </header>

      <section className="date-range-section">
        <div className="date-range-row">
          <label>
            <span className="date-label">開始日</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </label>
          <span className="date-separator">〜</span>
          <label>
            <span className="date-label">終了日</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </label>
        </div>
        <button
          type="button"
          className="reset-range-btn"
          onClick={() => {
            setStartDate(firstDate)
            setEndDate(lastDate)
          }}
        >
          期間をリセット
        </button>
      </section>

      {!hasAnyData ? (
        <p className="no-data-message">
          指定期間に身体情報の記録がありません。
          <br />
          今日のメニューで身体情報を入力してください。
        </p>
      ) : (
        <section className="trend-section">
          {BODY_INFO_FIELDS.map((field) => {
            const data = trendData[field.key]
            if (data.length === 0) return null
            return (
              <div key={field.key} className="trend-card">
                <h3 className="trend-title">
                  {field.label}（{field.unit}）
                </h3>
                <div className="trend-list">
                  {data.map(({ date, value }) => (
                    <div key={date} className="trend-item">
                      <span className="trend-date">{formatDate(date)}</span>
                      <span className="trend-value">{value}{field.unit}</span>
                    </div>
                  ))}
                </div>
                <div className="trend-minmax">
                  {data.length > 1 && (
                    <span>
                      最小: {Math.min(...data.map((d) => d.value))}{field.unit} / 最大: {Math.max(...data.map((d) => d.value))}{field.unit}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
