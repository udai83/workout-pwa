import { useState, useEffect } from 'react'
import type { MenuSchedule, MenuItem, ScheduleType } from '@/types'
import { storage } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import './MenuSettingsScreen.css'

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export default function MenuSettingsScreen() {
  const [schedules, setSchedules] = useState<MenuSchedule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setSchedules(storage.getMenuSchedules())
  }, [])

  const saveSchedules = (newSchedules: MenuSchedule[]) => {
    setSchedules(newSchedules)
    storage.setMenuSchedules(newSchedules)
  }

  const handleAddSchedule = (type: ScheduleType) => {
    const base: MenuSchedule = {
      id: generateId(),
      scheduleType: type,
      menuItems: [],
      createdAt: new Date().toISOString(),
    }
    if (type === 'weekday') {
      base.weekday = 1
    } else {
      base.date = new Date().toISOString().slice(0, 10)
    }
    const newSchedules = [...schedules, base]
    saveSchedules(newSchedules)
    setEditingId(base.id)
    setExpandedId(base.id)
  }

  const handleUpdateSchedule = (id: string, updates: Partial<MenuSchedule>) => {
    saveSchedules(
      schedules.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  const handleDeleteSchedule = (id: string) => {
    saveSchedules(schedules.filter((s) => s.id !== id))
    setEditingId((prev) => (prev === id ? null : prev))
    setExpandedId((prev) => (prev === id ? null : prev))
  }

  const handleAddMenuItem = (scheduleId: string) => {
    const newItem: MenuItem = {
      id: generateId(),
      name: '新規メニュー',
      weight: 0,
      reps: 10,
      sets: 3,
    }
    handleUpdateSchedule(scheduleId, {
      menuItems: [...(schedules.find((s) => s.id === scheduleId)?.menuItems ?? []), newItem],
    })
  }

  const handleUpdateMenuItem = (scheduleId: string, itemId: string, item: MenuItem) => {
    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) return
    handleUpdateSchedule(scheduleId, {
      menuItems: schedule.menuItems.map((m) => (m.id === itemId ? item : m)),
    })
  }

  const handleDeleteMenuItem = (scheduleId: string, itemId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) return
    handleUpdateSchedule(scheduleId, {
      menuItems: schedule.menuItems.filter((m) => m.id !== itemId),
    })
  }

  return (
    <div className="menu-settings-screen">
      <header className="settings-header">
        <h1>メニュー設定</h1>
        <p className="settings-desc">
          曜日または日付にメニューを紐づけて登録します
        </p>
      </header>

      <div className="add-buttons">
        <button
          type="button"
          className="add-schedule-btn"
          onClick={() => handleAddSchedule('weekday')}
        >
          ＋ 曜日指定で追加
        </button>
        <button
          type="button"
          className="add-schedule-btn"
          onClick={() => handleAddSchedule('date')}
        >
          ＋ 日付指定で追加
        </button>
      </div>

      <div className="schedule-list">
        {schedules.length === 0 ? (
          <p className="empty-message">
            メニューがありません。上のボタンから追加してください。
          </p>
        ) : (
          schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              isExpanded={expandedId === schedule.id}
              isEditing={editingId === schedule.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === schedule.id ? null : schedule.id))
              }
              onEdit={() => setEditingId(schedule.id)}
              onSave={() => setEditingId(null)}
              onUpdate={(updates) => handleUpdateSchedule(schedule.id, updates)}
              onDelete={() => handleDeleteSchedule(schedule.id)}
              onAddMenuItem={() => handleAddMenuItem(schedule.id)}
              onUpdateMenuItem={(itemId, item) =>
                handleUpdateMenuItem(schedule.id, itemId, item)
              }
              onDeleteMenuItem={(itemId) =>
                handleDeleteMenuItem(schedule.id, itemId)
              }
            />
          ))
        )}
      </div>
    </div>
  )
}

interface ScheduleCardProps {
  schedule: MenuSchedule
  isExpanded: boolean
  isEditing: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onSave: () => void
  onUpdate: (updates: Partial<MenuSchedule>) => void
  onDelete: () => void
  onAddMenuItem: () => void
  onUpdateMenuItem: (itemId: string, item: MenuItem) => void
  onDeleteMenuItem: (itemId: string) => void
}

function ScheduleCard({
  schedule,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onSave,
  onUpdate,
  onDelete,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}: ScheduleCardProps) {
  const label =
    schedule.scheduleType === 'weekday'
      ? `毎週${WEEKDAY_NAMES[schedule.weekday ?? 0]}曜日`
      : schedule.date ?? ''

  return (
    <article className="schedule-card">
      <div
        className="schedule-header"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <span className="schedule-label">{label}</span>
        <span className="schedule-count">
          {schedule.menuItems.length}種目
        </span>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="schedule-body">
          {isEditing ? (
            <div className="schedule-edit">
              {schedule.scheduleType === 'weekday' ? (
                <div className="edit-row">
                  <label>曜日</label>
                  <select
                    value={schedule.weekday ?? 0}
                    onChange={(e) =>
                      onUpdate({ weekday: parseInt(e.target.value, 10) })
                    }
                    className="edit-select"
                  >
                    {WEEKDAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>
                        {name}曜日
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="edit-row">
                  <label>日付</label>
                  <input
                    type="date"
                    value={schedule.date ?? ''}
                    onChange={(e) => onUpdate({ date: e.target.value })}
                    className="edit-input"
                  />
                </div>
              )}
              <button type="button" className="btn-save" onClick={onSave}>
                保存
              </button>
            </div>
          ) : (
            <div className="schedule-actions">
              <button type="button" className="btn-edit" onClick={onEdit}>
                編集
              </button>
              <button type="button" className="btn-delete" onClick={onDelete}>
                削除
              </button>
            </div>
          )}

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
              ＋ 種目を追加
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

function MenuItemRow({ item, onUpdate, onDelete }: MenuItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [weight, setWeight] = useState(String(item.weight))
  const [reps, setReps] = useState(String(item.reps))
  const [sets, setSets] = useState(String(item.sets))

  const handleSave = () => {
    onUpdate({
      ...item,
      name: name.trim() || item.name,
      weight: Math.max(0, parseFloat(weight) || 0),
      reps: Math.max(1, parseInt(reps, 10) || 1),
      sets: Math.max(1, parseInt(sets, 10) || 1),
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="menu-item-row edit">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => {
            if (name === '新規メニュー') e.target.select()
          }}
          placeholder="メニュー名"
          className="row-input name"
        />
        <input
          type="number"
          min="0"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="重量"
          className="row-input small"
        />
        <input
          type="number"
          min="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="回数"
          className="row-input small"
        />
        <input
          type="number"
          min="1"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="セット"
          className="row-input small"
        />
        <button type="button" className="btn-save-sm" onClick={handleSave}>
          保存
        </button>
        <button type="button" className="btn-cancel-sm" onClick={() => setEditing(false)}>
          キャンセル
        </button>
      </div>
    )
  }

  return (
    <div className="menu-item-row">
      <span className="row-name">{item.name}</span>
      <span className="row-spec">
        {item.weight > 0 ? `${item.weight}kg` : '-'} × {item.reps}回 × {item.sets}セット
      </span>
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
  )
}
