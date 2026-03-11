import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { storage } from '@/lib/storage'
import { getWeekday, formatDate } from '@/lib/utils'
import { findMenuItem } from '@/lib/menuUtils'
import { BODY_INFO_FIELDS } from '@/lib/bodyInfoFields'
import type { DailyRecord } from '@/types'
import './CalendarScreen.css'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarScreen() {
  const location = useLocation()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startOffset = first.getDay()
    const daysInMonth = last.getDate()

    const days: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [year, month])

  const records = useMemo(() => storage.getDailyRecords(), [currentDate, location.pathname])

  const prevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  const nextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))

  const selectedRecord = selectedDate ? records[selectedDate] : null

  useEffect(() => {
    if (selectedDate) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedDate])

  return (
    <div className="calendar-screen">
      <header className="calendar-header">
        <h1>カレンダー</h1>
        <div className="month-nav">
          <button type="button" onClick={prevMonth} aria-label="Previous month">
            ‹
          </button>
          <span className="month-label">
            {year}/{month + 1}
          </span>
          <button type="button" onClick={nextMonth} aria-label="Next month">
            ›
          </button>
        </div>
      </header>

      <section className="calendar-grid">
        <div className="weekday-headers">
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} className="weekday-header">
              {name}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="day-cell empty" />
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const record = records[dateStr]
            const hasData = record && (record.completedMenus.length > 0 || record.memo || Object.values(record.bodyInfo).some(Boolean))
            const isSelected = selectedDate === dateStr

            return (
              <button
                key={dateStr}
                type="button"
                className={`day-cell ${hasData ? 'has-data' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate((prev) => (prev === dateStr ? null : dateStr))}
              >
                <span className="day-num">{day}</span>
                {record?.completedMenus && record.completedMenus.length > 0 && (
                  <span className="day-dot" title="Workout done" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {selectedDate && (
        <div
          className="day-detail-overlay"
          onClick={() => setSelectedDate(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setSelectedDate(null)}
        >
          <div
            className="day-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{formatDate(selectedDate)}（{WEEKDAY_NAMES[getWeekday(selectedDate)]}）</h3>
            {selectedRecord ? (
              <DayDetailContent record={selectedRecord} dateStr={selectedDate} />
            ) : (
              <p className="no-data">記録がありません</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getCompletedMenusWithWeight(
  record: DailyRecord,
  dateStr: string
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const cm of record.completedMenus) {
    const menuItem = findMenuItem(cm.menuItemId, dateStr, record)
    if (!menuItem) continue
    const setGroups = menuItem.setGroups ?? []
    const counts = cm.setGroupCounts ?? (cm.completedCount != null ? [cm.completedCount] : [])
    let total = 0
    setGroups.forEach((g, i) => {
      const c = counts[i] ?? 0
      total += g.weight * g.reps * c
    })
    if (total > 0) {
      result[menuItem.name] = (result[menuItem.name] ?? 0) + total
    }
  }
  return result
}

interface DayDetailContentProps {
  record: DailyRecord
  dateStr: string
}

function DayDetailContent({ record, dateStr }: DayDetailContentProps) {
  const completedWithWeight = getCompletedMenusWithWeight(record, dateStr)
  const totalWeight = Object.values(completedWithWeight).reduce((a, b) => a + b, 0)

  return (
    <div className="day-detail-content">
      {record.completedMenus.length > 0 && (
        <div className="detail-section">
          <h4>完了メニュー</h4>
          <ul className="completed-list">
            {Object.entries(completedWithWeight).map(([name, weight]) => (
              <li key={name}>
                {name}: {weight}kg
              </li>
            ))}
          </ul>
          <p className="total-weight">総重量: {totalWeight}kg</p>
        </div>
      )}
      {Object.values(record.bodyInfo ?? {}).some((v) => v != null) && (
        <div className="detail-section">
          <h4>身体情報</h4>
          <div className="body-info">
            {BODY_INFO_FIELDS.filter((f) => record.bodyInfo![f.key] != null).map(
              (f) => (
                <span key={f.key}>
                  {f.label}: {record.bodyInfo![f.key]}{f.unit}
                </span>
              )
            )}
          </div>
        </div>
      )}
      {record.memo && (
        <div className="detail-section">
          <h4>メモ</h4>
          <p className="memo-text">{record.memo}</p>
        </div>
      )}
    </div>
  )
}
