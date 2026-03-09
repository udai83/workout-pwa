import { useState, useEffect, useMemo } from 'react'
import type { MenuSchedule, MenuItem, SetGroup } from '@/types'
import { storage } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import './MenuSettingsScreen.css'

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

/** 7曜日分のスケジュールを取得。不足分は作成する */
function getWeekdaySchedules(existing: MenuSchedule[]): MenuSchedule[] {
  const byWeekday = new Map<number, MenuSchedule>()
  for (const s of existing) {
    if (s.scheduleType === 'weekday' && s.weekday != null) {
      byWeekday.set(s.weekday, s)
    }
  }
  return WEEKDAY_NAMES.map((_, i) => {
    const existingSchedule = byWeekday.get(i)
    if (existingSchedule) return existingSchedule
    return {
      id: generateId(),
      scheduleType: 'weekday' as const,
      weekday: i,
      menuItems: [],
      createdAt: new Date().toISOString(),
    }
  })
}

export default function MenuSettingsScreen() {
  const [schedules, setSchedules] = useState<MenuSchedule[]>([])
  const [expandedWeekday, setExpandedWeekday] = useState<number | null>(null)

  const weekdaySchedules = useMemo(
    () => getWeekdaySchedules(schedules),
    [schedules]
  )

  useEffect(() => {
    const raw = storage.getMenuSchedules()
    const merged = getWeekdaySchedules(raw)
    const toSave: MenuSchedule[] = raw.filter((r) => r.scheduleType !== 'weekday')
    for (const s of merged) {
      const existing = raw.find((r) => r.scheduleType === 'weekday' && r.weekday === s.weekday)
      toSave.push(existing ?? s)
    }
    storage.setMenuSchedules(toSave)
    setSchedules(toSave)
  }, [])

  const saveSchedules = (newSchedules: MenuSchedule[]) => {
    setSchedules(newSchedules)
    storage.setMenuSchedules(newSchedules)
  }

  const handleUpdateSchedule = (weekday: number, updates: Partial<MenuSchedule>) => {
    const schedule = weekdaySchedules[weekday]
    if (!schedule) return
    const updated = { ...schedule, ...updates }
    const others = schedules.filter((s) => s.scheduleType !== 'weekday' || s.weekday !== weekday)
    saveSchedules([...others, updated])
  }

  const handleClearRoutine = (weekday: number) => {
    handleUpdateSchedule(weekday, { menuItems: [] })
  }

  const handleAddMenuItem = (weekday: number) => {
    const schedule = weekdaySchedules[weekday]
    if (!schedule) return
    const newItem: MenuItem = {
      id: generateId(),
      name: '',
      setGroups: [{ weight: 0, reps: 0, sets: 0 }],
    }
    handleUpdateSchedule(weekday, {
      menuItems: [...schedule.menuItems, newItem],
    })
  }

  const handleUpdateMenuItem = (weekday: number, itemId: string, item: MenuItem) => {
    const schedule = weekdaySchedules[weekday]
    if (!schedule) return
    handleUpdateSchedule(weekday, {
      menuItems: schedule.menuItems.map((m) => (m.id === itemId ? item : m)),
    })
  }

  const handleDeleteMenuItem = (weekday: number, itemId: string) => {
    const schedule = weekdaySchedules[weekday]
    if (!schedule) return
    handleUpdateSchedule(weekday, {
      menuItems: schedule.menuItems.filter((m) => m.id !== itemId),
    })
  }

  return (
    <div className="menu-settings-screen">
      <header className="settings-header">
        <h1>Set Menu設定</h1>
        <p className="settings-desc">
          各曜日のトレーニングルーティンを構成・管理しましょう
        </p>
      </header>

      <div className="schedule-list">
        {weekdaySchedules.map((schedule, idx) => {
          const weekday = schedule.weekday ?? idx
          return (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              weekday={weekday}
              isExpanded={expandedWeekday === weekday}
              onToggleExpand={() =>
                setExpandedWeekday((prev) => (prev === weekday ? null : weekday))
              }
              onClearRoutine={() => handleClearRoutine(weekday)}
              onAddMenuItem={() => handleAddMenuItem(weekday)}
              onUpdateMenuItem={(itemId, item) =>
                handleUpdateMenuItem(weekday, itemId, item)
              }
              onDeleteMenuItem={(itemId) =>
                handleDeleteMenuItem(weekday, itemId)
              }
            />
          )
        })}
      </div>
    </div>
  )
}

interface ScheduleCardProps {
  schedule: MenuSchedule
  weekday: number
  isExpanded: boolean
  onToggleExpand: () => void
  onClearRoutine: () => void
  onAddMenuItem: () => void
  onUpdateMenuItem: (itemId: string, item: MenuItem) => void
  onDeleteMenuItem: (itemId: string) => void
}

function ScheduleCard({
  schedule,
  weekday,
  isExpanded,
  onToggleExpand,
  onClearRoutine,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}: ScheduleCardProps) {
  const label = `${WEEKDAY_NAMES[weekday]}曜日`

  return (
    <article className={`schedule-card ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="schedule-header"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <span className="schedule-label">{label}</span>
        <span className="schedule-count">
          {schedule.menuItems.length}メニュー
        </span>
        <span className="expand-icon">›</span>
      </div>

      {isExpanded && (
        <div className="schedule-body">
          <div className="schedule-actions">
            {schedule.menuItems.length > 0 && (
              <button type="button" className="btn-delete" onClick={onClearRoutine}>
                ルーティンをクリア
              </button>
            )}
          </div>

          <div className="menu-items">
            {schedule.menuItems.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                onUpdate={(updated) => onUpdateMenuItem(item.id, updated)}
                onDelete={() => onDeleteMenuItem(item.id)}
              />
            ))}
            <button
              type="button"
              className="add-item-btn"
              onClick={onAddMenuItem}
            >
              ＋ メニューを追加
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

interface MenuItemRowProps {
  item: MenuItem
  onUpdate: (item: MenuItem) => void
  onDelete: () => void
}

function isNewEmptyItem(item: MenuItem): boolean {
  return (
    item.name === '' &&
    item.setGroups.length === 1 &&
    item.setGroups[0].weight === 0 &&
    item.setGroups[0].reps === 0 &&
    item.setGroups[0].sets === 0
  )
}

interface SetGroupInputs {
  weightStr: string
  repsStr: string
  setsStr: string
}

function toInputStrings(g: SetGroup): SetGroupInputs {
  const isEmpty = g.weight === 0 && g.reps === 0 && g.sets === 0
  return {
    weightStr: isEmpty ? '' : String(g.weight),
    repsStr: isEmpty ? '' : String(g.reps),
    setsStr: isEmpty ? '' : String(g.sets),
  }
}

function MenuItemRow({ item, onUpdate, onDelete }: MenuItemRowProps) {
  const isNew = isNewEmptyItem(item)
  const [editing, setEditing] = useState(isNew)
  const [name, setName] = useState(item.name)
  const [groupInputs, setGroupInputs] = useState<SetGroupInputs[]>(() =>
    (item.setGroups.length > 0 ? item.setGroups : [{ weight: 0, reps: 0, sets: 0 }]).map(toInputStrings)
  )

  const handleAddSetGroup = () => {
    setGroupInputs((prev) => [...prev, { weightStr: '', repsStr: '', setsStr: '' }])
  }

  const handleUpdateGroupInput = (index: number, field: keyof SetGroupInputs, value: string) => {
    setGroupInputs((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    )
  }

  const handleRemoveSetGroup = (index: number) => {
    if (groupInputs.length <= 1) return
    setGroupInputs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const setGroups: SetGroup[] = groupInputs.map((g) => ({
      weight: Math.max(0, Number(g.weightStr) || 0),
      reps: Math.max(1, parseInt(g.repsStr, 10) || 1),
      sets: Math.max(1, parseInt(g.setsStr, 10) || 1),
    }))
    onUpdate({
      ...item,
      name: name.trim() || item.name || '未設定',
      setGroups,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setName(item.name)
    setGroupInputs(
      (item.setGroups.length > 0 ? item.setGroups : [{ weight: 0, reps: 0, sets: 0 }]).map(toInputStrings)
    )
    setEditing(false)
  }

  if (editing) {
    return (
      <>
        <div
          className="edit-focus-overlay"
          onClick={handleCancel}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
          aria-label="編集をキャンセル"
        />
        <div className="menu-item-row edit edit-focus-zoom">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="種目名"
          className="row-input name"
        />
        <div className="set-groups-list">
          {groupInputs.map((g, idx) => (
            <div key={idx} className="set-group-row">
              <div className="row-spec-inputs">
                <input
                  type="text"
                  inputMode="decimal"
                  value={g.weightStr}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
                    handleUpdateGroupInput(idx, 'weightStr', v)
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="重さ"
                  className="row-input small input-placeholder"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={g.repsStr}
                  onChange={(e) => handleUpdateGroupInput(idx, 'repsStr', e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  placeholder="回数"
                  className="row-input small input-placeholder"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={g.setsStr}
                  onChange={(e) => handleUpdateGroupInput(idx, 'setsStr', e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  placeholder="セット"
                  className="row-input small input-placeholder"
                />
                {groupInputs.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove-set"
                    onClick={() => handleRemoveSetGroup(idx)}
                    aria-label="このセットを削除"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="add-set-btn" onClick={handleAddSetGroup}>
          ＋ セットを追加
        </button>
        <div className="row-edit-actions menu-save-actions">
          <button type="button" className="btn-save-sm" onClick={handleSave}>
            保存
          </button>
          <button type="button" className="btn-cancel-sm" onClick={handleCancel}>
            キャンセル
          </button>
        </div>
      </div>
      </>
    )
  }

  const specText = item.setGroups
    .filter((g) => g.reps > 0 && g.sets > 0)
    .map((g) =>
      g.weight > 0 ? `${g.weight}kg × ${g.reps}回 × ${g.sets}セット` : `${g.reps}回 × ${g.sets}セット`
    )
    .join(' / ') || '（未入力）'

  return (
    <div className="menu-item-row">
      <div className="row-main">
        <span className="row-name">{item.name || '（未設定）'}</span>
        <span className="row-spec">{specText}</span>
      </div>
      <div className="row-actions">
        <button
          type="button"
          className="btn-edit-sm"
          onClick={() => setEditing(true)}
          aria-label="編集"
        >
          ✏️
        </button>
        <button
          type="button"
          className="btn-delete-sm"
          onClick={onDelete}
          aria-label="削除"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
