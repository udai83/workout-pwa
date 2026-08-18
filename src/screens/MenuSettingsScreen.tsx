import { useState, useEffect, useMemo } from 'react'
import type { MenuSchedule, MenuItem, SetGroup, RoutineMode } from '@/types'
import { storage } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import {
  createPatternSchedule,
  ensureDefaultPatterns,
  getPatternSchedules,
  nextPatternName,
} from '@/lib/menuUtils'
import './MenuSettingsScreen.css'

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const MAX_SET_GROUPS = 5

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
  const [mode, setMode] = useState<RoutineMode>('weekday')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const weekdaySchedules = useMemo(
    () => getWeekdaySchedules(schedules),
    [schedules]
  )
  const patternSchedules = useMemo(
    () => getPatternSchedules(schedules),
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
    const loadedMode = storage.getRoutineSettings().mode
    setMode(loadedMode)
    if (loadedMode === 'pattern' && getPatternSchedules(toSave).length === 0) {
      const withDefaults = ensureDefaultPatterns(toSave)
      storage.setMenuSchedules(withDefaults)
      setSchedules(withDefaults)
    } else {
      setSchedules(toSave)
    }
  }, [])

  const saveSchedules = (newSchedules: MenuSchedule[]) => {
    setSchedules(newSchedules)
    storage.setMenuSchedules(newSchedules)
  }

  const findSchedule = (scheduleId: string) =>
    schedules.find((s) => s.id === scheduleId) ??
    weekdaySchedules.find((s) => s.id === scheduleId) ??
    patternSchedules.find((s) => s.id === scheduleId)

  const handleModeChange = (nextMode: RoutineMode) => {
    setMode(nextMode)
    storage.setRoutineSettings({ mode: nextMode })
    if (nextMode === 'pattern' && getPatternSchedules(schedules).length === 0) {
      const withDefaults = ensureDefaultPatterns(schedules)
      saveSchedules(withDefaults)
    }
  }

  const handleUpdateSchedule = (scheduleId: string, updates: Partial<MenuSchedule>) => {
    const schedule = findSchedule(scheduleId)
    if (!schedule) return
    const updated = { ...schedule, ...updates }
    const exists = schedules.some((s) => s.id === scheduleId)
    saveSchedules(exists
      ? schedules.map((s) => (s.id === scheduleId ? updated : s))
      : [...schedules, updated])
  }

  const handleClearRoutine = (scheduleId: string) => {
    handleUpdateSchedule(scheduleId, { menuItems: [] })
  }

  const handleAddMenuItem = (scheduleId: string) => {
    const schedule = findSchedule(scheduleId)
    if (!schedule) return
    const newItem: MenuItem = {
      id: generateId(),
      name: '',
      setGroups: [{ weight: 0, reps: 0, sets: 0 }],
    }
    handleUpdateSchedule(scheduleId, {
      menuItems: [...schedule.menuItems, newItem],
    })
  }

  const handleUpdateMenuItem = (scheduleId: string, itemId: string, item: MenuItem) => {
    const schedule = findSchedule(scheduleId)
    if (!schedule) return
    handleUpdateSchedule(scheduleId, {
      menuItems: schedule.menuItems.map((m) => (m.id === itemId ? item : m)),
    })
  }

  const handleDeleteMenuItem = (scheduleId: string, itemId: string) => {
    const schedule = findSchedule(scheduleId)
    if (!schedule) return
    handleUpdateSchedule(scheduleId, {
      menuItems: schedule.menuItems.filter((m) => m.id !== itemId),
    })
  }

  const handleMoveMenuItem = (scheduleId: string, itemId: string, direction: 'up' | 'down') => {
    const schedule = findSchedule(scheduleId)
    if (!schedule) return
    const items = [...schedule.menuItems]
    const idx = items.findIndex((m) => m.id === itemId)
    if (idx < 0) return
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1
    if (nextIdx < 0 || nextIdx >= items.length) return
    ;[items[idx], items[nextIdx]] = [items[nextIdx], items[idx]]
    handleUpdateSchedule(scheduleId, { menuItems: items })
  }

  const handleAddPattern = () => {
    const next = createPatternSchedule(
      nextPatternName(patternSchedules),
      patternSchedules.length
    )
    saveSchedules([...schedules, next])
    setExpandedId(next.id)
  }

  const handleRenamePattern = (scheduleId: string, name: string) => {
    handleUpdateSchedule(scheduleId, { patternName: name })
  }

  const handleDeletePattern = (scheduleId: string) => {
    if (patternSchedules.length <= 1) return
    const remaining = getPatternSchedules(schedules.filter((s) => s.id !== scheduleId))
      .map((s, i) => ({ ...s, patternOrder: i }))
    const others = schedules.filter((s) => s.scheduleType !== 'pattern')
    saveSchedules([...others, ...remaining])
    if (expandedId === scheduleId) setExpandedId(null)
  }

  const handleMovePattern = (scheduleId: string, direction: 'up' | 'down') => {
    const items = [...patternSchedules]
    const idx = items.findIndex((s) => s.id === scheduleId)
    if (idx < 0) return
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1
    if (nextIdx < 0 || nextIdx >= items.length) return
    ;[items[idx], items[nextIdx]] = [items[nextIdx], items[idx]]
    const reordered = items.map((s, i) => ({ ...s, patternOrder: i }))
    const others = schedules.filter((s) => s.scheduleType !== 'pattern')
    saveSchedules([...others, ...reordered])
  }

  const visibleSchedules = mode === 'weekday' ? weekdaySchedules : patternSchedules

  return (
    <div className="menu-settings-screen">
      <header className="settings-header">
        <h1>Set Menu設定</h1>
        <p className="settings-desc">
          {mode === 'weekday'
            ? '各曜日のトレーニングルーティンを構成・管理しましょう'
            : 'ABCなどのパターンを順番に回します。休んだ日はスキップされます。'}
        </p>
      </header>

      <div className="mode-toggle" role="tablist" aria-label="ルーティン方式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'weekday'}
          className={`mode-toggle-btn ${mode === 'weekday' ? 'active' : ''}`}
          onClick={() => handleModeChange('weekday')}
        >
          曜日ごと
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'pattern'}
          className={`mode-toggle-btn ${mode === 'pattern' ? 'active' : ''}`}
          onClick={() => handleModeChange('pattern')}
        >
          パターン
        </button>
      </div>

      <div className="schedule-list">
        {visibleSchedules.map((schedule, idx) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            label={
              mode === 'weekday'
                ? `${WEEKDAY_NAMES[schedule.weekday ?? idx]}曜日`
                : schedule.patternName || `パターン${idx + 1}`
            }
            isExpanded={expandedId === schedule.id}
            onToggleExpand={() =>
              setExpandedId((prev) => (prev === schedule.id ? null : schedule.id))
            }
            onClearRoutine={() => handleClearRoutine(schedule.id)}
            onAddMenuItem={() => handleAddMenuItem(schedule.id)}
            onUpdateMenuItem={(itemId, item) =>
              handleUpdateMenuItem(schedule.id, itemId, item)
            }
            onDeleteMenuItem={(itemId) =>
              handleDeleteMenuItem(schedule.id, itemId)
            }
            onMoveMenuItem={(itemId, dir) =>
              handleMoveMenuItem(schedule.id, itemId, dir)
            }
            nameEditable={mode === 'pattern'}
            onRename={
              mode === 'pattern'
                ? (name) => handleRenamePattern(schedule.id, name)
                : undefined
            }
            onDeleteSchedule={
              mode === 'pattern' ? () => handleDeletePattern(schedule.id) : undefined
            }
            canDeleteSchedule={mode === 'pattern' && patternSchedules.length > 1}
            onMoveSchedule={
              mode === 'pattern'
                ? (dir) => handleMovePattern(schedule.id, dir)
                : undefined
            }
            canMoveUp={mode === 'pattern' && idx > 0}
            canMoveDown={mode === 'pattern' && idx < patternSchedules.length - 1}
          />
        ))}
      </div>

      {mode === 'pattern' && (
        <button type="button" className="add-pattern-btn" onClick={handleAddPattern}>
          ＋ パターンを追加
        </button>
      )}
    </div>
  )
}

interface ScheduleCardProps {
  schedule: MenuSchedule
  label: string
  isExpanded: boolean
  onToggleExpand: () => void
  onClearRoutine: () => void
  onAddMenuItem: () => void
  onUpdateMenuItem: (itemId: string, item: MenuItem) => void
  onDeleteMenuItem: (itemId: string) => void
  onMoveMenuItem: (itemId: string, direction: 'up' | 'down') => void
  nameEditable?: boolean
  onRename?: (name: string) => void
  onDeleteSchedule?: () => void
  canDeleteSchedule?: boolean
  onMoveSchedule?: (direction: 'up' | 'down') => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

function ScheduleCard({
  schedule,
  label,
  isExpanded,
  onToggleExpand,
  onClearRoutine,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onMoveMenuItem,
  nameEditable,
  onRename,
  onDeleteSchedule,
  canDeleteSchedule,
  onMoveSchedule,
  canMoveUp,
  canMoveDown,
}: ScheduleCardProps) {
  const [nameDraft, setNameDraft] = useState(label)

  useEffect(() => {
    setNameDraft(label)
  }, [label])

  const commitRename = () => {
    const next = nameDraft.trim()
    if (next && next !== label) onRename?.(next)
    else setNameDraft(label)
  }

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
          {nameEditable && (
            <div className="pattern-rename-block">
              <label className="pattern-rename-label" htmlFor={`pattern-name-${schedule.id}`}>
                パターン名
              </label>
              <input
                id={`pattern-name-${schedule.id}`}
                type="text"
                className="edit-input pattern-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                    ;(e.target as HTMLInputElement).blur()
                  }
                  if (e.key === 'Escape') {
                    setNameDraft(label)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                placeholder="パターン名（A, 胸 など）"
                aria-label="パターン名"
              />
            </div>
          )}
          {(canMoveUp || canMoveDown || schedule.menuItems.length > 0 || canDeleteSchedule) && (
          <div className="schedule-actions">
            {onMoveSchedule && canMoveUp && (
              <button type="button" className="btn-move-sm" onClick={() => onMoveSchedule('up')}>
                上へ
              </button>
            )}
            {onMoveSchedule && canMoveDown && (
              <button type="button" className="btn-move-sm" onClick={() => onMoveSchedule('down')}>
                下へ
              </button>
            )}
            {schedule.menuItems.length > 0 && (
              <button type="button" className="btn-delete" onClick={onClearRoutine}>
                ルーティンをクリア
              </button>
            )}
            {canDeleteSchedule && (
              <button type="button" className="btn-delete" onClick={onDeleteSchedule}>
                パターンを削除
              </button>
            )}
          </div>
          )}

          <div className="menu-items">
            {schedule.menuItems.map((item, index) => (
              <MenuItemRow
                key={item.id}
                item={item}
                index={index}
                total={schedule.menuItems.length}
                onUpdate={(updated) => onUpdateMenuItem(item.id, updated)}
                onDelete={() => onDeleteMenuItem(item.id)}
                onMoveUp={() => onMoveMenuItem(item.id, 'up')}
                onMoveDown={() => onMoveMenuItem(item.id, 'down')}
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
  index: number
  total: number
  onUpdate: (item: MenuItem) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
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

function MenuItemRow({ item, index, total, onUpdate, onDelete, onMoveUp, onMoveDown }: MenuItemRowProps) {
  const isNew = isNewEmptyItem(item)
  const [editing, setEditing] = useState(isNew)
  const [name, setName] = useState(item.name)
  const [groupInputs, setGroupInputs] = useState<SetGroupInputs[]>(() =>
    (item.setGroups.length > 0 ? item.setGroups : [{ weight: 0, reps: 0, sets: 0 }]).map(toInputStrings)
  )

  const handleAddSetGroup = () => {
    if (groupInputs.length >= MAX_SET_GROUPS) return
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
        {groupInputs.length < MAX_SET_GROUPS && (
          <button type="button" className="add-set-btn" onClick={handleAddSetGroup}>
            ＋ セットを追加（最大{MAX_SET_GROUPS}まで）
          </button>
        )}
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
        {index > 0 && (
          <button type="button" className="btn-move-sm" onClick={onMoveUp} aria-label="上へ">
            ↑
          </button>
        )}
        {index < total - 1 && (
          <button type="button" className="btn-move-sm" onClick={onMoveDown} aria-label="下へ">
            ↓
          </button>
        )}
        <button
          type="button"
          className="btn-edit-sm"
          onClick={() => setEditing(true)}
          aria-label="edit"
        >
          edit
        </button>
        <button
          type="button"
          className="btn-delete-sm"
          onClick={onDelete}
          aria-label="delete"
        >
          delete
        </button>
      </div>
    </div>
  )
}
