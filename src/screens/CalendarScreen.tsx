import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { storage } from '@/lib/storage'
import { getWeekday, formatDate } from '@/lib/utils'
import { findMenuItem, getPatternSchedules } from '@/lib/menuUtils'
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
      document.documentElement.classList.add('overlay-open')
      return () => {
        document.body.style.overflow = ''
        document.documentElement.classList.remove('overlay-open')
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
            <h3>
              {formatDate(selectedDate)}（{WEEKDAY_NAMES[getWeekday(selectedDate)]}）
              {selectedRecord?.assignedPatternId && (
                <span className="day-pattern-label">
                  {' '}
                  {getPatternSchedules().find((p) => p.id === selectedRecord.assignedPatternId)?.patternName}
                </span>
              )}
            </h3>
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

interface PerformedSet {
  id: string
  text: string
}

interface PerformedExercise {
  id: string
  name: string
  sets: PerformedSet[]
}

function formatSetWeight(weight: number, reps: number): string {
  if (weight > 0) return `${weight}kg × ${reps}回`
  return `${reps}回`
}

function getPerformedExercises(record: DailyRecord, dateStr: string): PerformedExercise[] {
  const exercises: PerformedExercise[] = []
  for (const cm of record.completedMenus) {
    const menuItem = findMenuItem(cm.menuItemId, dateStr, record)
    if (!menuItem) continue
    const setGroups = menuItem.setGroups ?? []
    const counts = cm.setGroupCounts ?? (cm.completedCount != null ? [cm.completedCount] : [])
    const sets: PerformedSet[] = []
    setGroups.forEach((g, i) => {
      const done = counts[i] ?? 0
      if (done <= 0 || g.reps <= 0) return
      const text = formatSetWeight(g.weight, g.reps)
      for (let s = 0; s < done; s += 1) {
        sets.push({ id: `${menuItem.id}-${i}-${s}`, text })
      }
    })
    if (sets.length > 0) {
      exercises.push({
        id: menuItem.id,
        name: menuItem.name || '（未設定）',
        sets,
      })
    }
  }
  return exercises
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(ta)
  }
}

interface DayDetailContentProps {
  record: DailyRecord
  dateStr: string
}

function DayDetailContent({ record, dateStr }: DayDetailContentProps) {
  const exercises = getPerformedExercises(record, dateStr)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [dateStr])

  const handleCopy = async () => {
    if (exercises.length === 0) return
    const text = exercises
      .map((ex) => [ex.name, ...ex.sets.map((s, i) => `${i + 1}. ${s.text}`)].join('\n'))
      .join('\n\n')
    const ok = await copyToClipboard(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (exercises.length === 0) {
    return <p className="no-data">トレーニング記録がありません</p>
  }

  return (
    <div className="day-detail-content">
      <div className="detail-toolbar">
        <button type="button" className="copy-day-btn" onClick={handleCopy}>
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <ul className="completed-exercises">
        {exercises.map((ex) => (
          <li key={ex.id} className="completed-exercise">
            <p className="completed-exercise-name">{ex.name}</p>
            <ul className="completed-sets">
              {ex.sets.map((set, i) => (
                <li key={set.id}>
                  <span className="set-index">{i + 1}</span>
                  {set.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
