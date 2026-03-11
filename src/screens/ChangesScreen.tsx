import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { storage } from '@/lib/storage'
import { BODY_INFO_FIELDS } from '@/lib/bodyInfoFields'
import { getMenuItemsForDate } from '@/lib/menuUtils'
import { formatDate } from '@/lib/utils'
import type { BodyInfo } from '@/types'
import './ChangesScreen.css'

interface DataPoint {
  date: string
  value: number
}

interface MenuTrendPoint {
  date: string
  weight: number
  reps: number
  completedCount: number
  volume: number
}

export default function ChangesScreen() {
  const location = useLocation()
  const records = useMemo(() => storage.getDailyRecords(), [location.pathname])

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

  const performedMenuNames = useMemo(() => {
    const names = new Set<string>()
    for (const [date, record] of Object.entries(records)) {
      const items = getMenuItemsForDate(date, record)
      const completed = record.completedMenus ?? []
      for (const cm of completed) {
        const counts = cm.setGroupCounts ?? (cm.completedCount != null ? [cm.completedCount] : [])
        const hasAny = counts.some((c) => c > 0)
        if (!hasAny) continue
        const item = items.find((m) => m.id === cm.menuItemId)
        if (item) names.add(item.name)
      }
    }
    return Array.from(names).sort()
  }, [records])

  const [selectedMenuName, setSelectedMenuName] = useState<string>('')

  const menuTrendData = useMemo((): MenuTrendPoint[] => {
    if (!selectedMenuName) return []
    const points: MenuTrendPoint[] = []
    const dates = Object.keys(records).filter(
      (d) => d >= startDate && d <= endDate
    )
    dates.sort()
    for (const date of dates) {
      const record = records[date]
      const items = getMenuItemsForDate(date, record ?? null)
      const completed = record?.completedMenus ?? []
      for (const cm of completed) {
        const item = items.find((m) => m.id === cm.menuItemId)
        if (item?.name !== selectedMenuName) continue
        const setGroups = item.setGroups ?? []
        const counts = cm.setGroupCounts ?? (cm.completedCount != null ? [cm.completedCount] : [])
        let totalVolume = 0
        let maxWeight = 0
        let maxReps = 0
        let totalCompleted = 0
        setGroups.forEach((g, i) => {
          const c = counts[i] ?? 0
          if (c > 0) {
            totalVolume += g.weight * g.reps * c
            maxWeight = Math.max(maxWeight, g.weight)
            maxReps = Math.max(maxReps, g.reps)
            totalCompleted += c
          }
        })
        if (totalCompleted > 0) {
          points.push({
            date,
            weight: maxWeight,
            reps: maxReps,
            completedCount: totalCompleted,
            volume: totalVolume,
          })
        }
      }
    }
    return points
  }, [records, startDate, endDate, selectedMenuName])

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
            <span className="date-label">Start date</span>
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
          Reset period
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

      <section className="menu-trend-section">
        <h2 className="menu-trend-section-title">トレーニングメニューの変化</h2>
        <div className="menu-select-form">
          <label htmlFor="menu-select" className="menu-select-label">
            メニューを選択
          </label>
          <select
            id="menu-select"
            value={selectedMenuName}
            onChange={(e) => setSelectedMenuName(e.target.value)}
            className="menu-select"
            disabled={performedMenuNames.length === 0}
          >
            <option value="">
              {performedMenuNames.length === 0
                ? '実施済みメニューがありません'
                : '選択してください'}
            </option>
            {performedMenuNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {selectedMenuName && (
          <div className="trend-card menu-trend-card">
            <h3 className="trend-title">{selectedMenuName}</h3>
            {menuTrendData.length === 0 ? (
              <p className="no-data-message">
                指定期間にこのメニューの記録がありません。
              </p>
            ) : (
              <>
                <div className="trend-list">
                  {menuTrendData.map(({ date, weight, reps, completedCount, volume }, i) => (
                    <div key={`${date}-${i}`} className="trend-item menu-trend-item">
                      <span className="trend-date">{formatDate(date)}</span>
                      <span className="trend-value">
                        {weight}kg × {reps} reps × {completedCount} sets
                        {volume > 0 && (
                          <span className="menu-volume">（{volume.toLocaleString()}kg）</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {menuTrendData.length > 1 && (
                  <div className="trend-minmax">
                    <span>
                      最大重量: {Math.max(...menuTrendData.map((d) => d.weight))}kg /
                      最大ボリューム: {Math.max(...menuTrendData.map((d) => d.volume)).toLocaleString()}kg
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
