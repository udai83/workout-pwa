import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import type { MenuItem, DailyRecord, BodyInfo, CompletedSet, RoutineMode } from '@/types'
import { storage } from '@/lib/storage'
import { getMenuItemsForDate, getPatternSchedules, getRoutineMode, getPatternDecision } from '@/lib/menuUtils'
import { getWeekday, generateId } from '@/lib/utils'
import { useLiveDate } from '@/hooks/useLiveDate'
import { useOverlayViewport } from '@/hooks/useOverlayViewport'
import MenuItemCard from '@/components/MenuItemCard'
import DailyRecordForm from '@/components/DailyRecordForm'
import './HomeScreen.css'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function createEmptyRecord(date: string): DailyRecord {
  return { date, completedMenus: [], memo: '', bodyInfo: {} }
}

export default function HomeScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = useLiveDate()
  const selectedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today
  const prevTodayRef = useRef(today)

  useEffect(() => {
    if (prevTodayRef.current === today) return
    const previousToday = prevTodayRef.current
    prevTodayRef.current = today
    if (!dateParam || dateParam === previousToday) {
      setSearchParams({})
    }
  }, [today, dateParam, setSearchParams])

  const [record, setRecord] = useState<DailyRecord | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [routineMode, setRoutineMode] = useState<RoutineMode>(() => getRoutineMode())

  useEffect(() => {
    const r = storage.getDailyRecord(selectedDate)
    setRecord(r ?? createEmptyRecord(selectedDate))
    setEditingItemId(null)
    setRoutineMode(getRoutineMode())
  }, [selectedDate])

  useOverlayViewport(Boolean(editingItemId))

  const baseRecord = record ?? createEmptyRecord(selectedDate)
  const menuItems = getMenuItemsForDate(selectedDate, record)
  const editingItem = editingItemId ? menuItems.find((m) => m.id === editingItemId) : undefined
  const patternSchedules = routineMode === 'pattern' ? getPatternSchedules() : []
  const patternDecision = routineMode === 'pattern'
    ? getPatternDecision(selectedDate, record)
    : undefined
  const currentPattern = patternDecision?.pattern
  const nextPattern = patternDecision?.nextPattern
  const needsPatternChoice = Boolean(patternDecision?.needsChoice)

  const saveRecord = useCallback((updates: Partial<DailyRecord>) => {
    const next: DailyRecord = { ...baseRecord, ...updates }
    setRecord(next)
    storage.saveDailyRecord(next)
  }, [baseRecord])

  const getCompletedSetGroupCounts = useCallback((itemId: string, setGroupCount: number): number[] => {
    const cm = baseRecord.completedMenus.find((m) => m.menuItemId === itemId)
    if (!cm) return Array(setGroupCount).fill(0)
    if (cm.setGroupCounts?.length) {
      const arr = [...cm.setGroupCounts]
      while (arr.length < setGroupCount) arr.push(0)
      return arr.slice(0, setGroupCount)
    }
    const legacy = cm.completedCount ?? 0
    return [legacy, ...Array(Math.max(0, setGroupCount - 1)).fill(0)]
  }, [baseRecord])

  const handleSetComplete = useCallback((itemId: string, setGroupIndex: number, setNum: number) => {
    const item = menuItems.find((m) => m.id === itemId)
    if (!item) return
    const setGroups = item.setGroups?.length ? item.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
    const currentCounts = getCompletedSetGroupCounts(itemId, setGroups.length)
    const current = currentCounts[setGroupIndex] ?? 0
    const next = setNum <= current ? current - 1 : current + 1
    const newCounts = [...currentCounts]
    newCounts[setGroupIndex] = Math.max(0, next)

    const allZero = newCounts.every((c) => c === 0)
    const newCompleted = allZero
      ? baseRecord.completedMenus.filter((m) => m.menuItemId !== itemId)
      : (() => {
          const idx = baseRecord.completedMenus.findIndex((m) => m.menuItemId === itemId)
          const entry: CompletedSet = { menuItemId: itemId, setGroupCounts: newCounts }
          if (idx >= 0) {
            return baseRecord.completedMenus.map((m, i) => (i === idx ? entry : m))
          }
          return [...baseRecord.completedMenus, entry]
        })()

    saveRecord({
      completedMenus: newCompleted,
      assignedPatternId: currentPattern?.id ?? baseRecord.assignedPatternId,
    })
  }, [menuItems, baseRecord, currentPattern, getCompletedSetGroupCounts, saveRecord])

  const handleAddMenu = useCallback(() => {
    const newItem: MenuItem = { id: generateId(), name: '', setGroups: [{ weight: 0, reps: 0, sets: 0 }] }
    const overrides = [...(baseRecord.menuOverrides ?? []), { item: newItem }]
    const order = baseRecord.menuItemOrder?.length ? baseRecord.menuItemOrder : menuItems.map((m) => m.id)
    saveRecord({ menuOverrides: overrides, menuItemOrder: [...order, newItem.id] })
    setEditingItemId(newItem.id)
  }, [baseRecord, menuItems, saveRecord])

  const handleUpdateMenuItem = useCallback((updated: MenuItem) => {
    const overrides = baseRecord.menuOverrides ?? []
    const idx = overrides.findIndex((o) => o.item.id === updated.id)
    if (idx >= 0) {
      const next = [...overrides]
      next[idx] = { ...next[idx], item: updated }
      saveRecord({ menuOverrides: next })
      return
    }
    const newItem = { ...updated, id: generateId() }
    const nextOverrides = [...overrides, { item: newItem, replacesId: updated.id }]
    const order = baseRecord.menuItemOrder ?? menuItems.map((m) => m.id)
    const nextOrder = order.map((id) => (id === updated.id ? newItem.id : id))
    saveRecord({ menuOverrides: nextOverrides, menuItemOrder: nextOrder })
  }, [baseRecord, menuItems, saveRecord])

  const handleRemoveMenuItem = useCallback((itemId: string) => {
    const overrides = baseRecord.menuOverrides ?? []
    const isFromOverride = overrides.some((o) => o.item.id === itemId)
    const newOverrides = overrides.filter((o) => o.item.id !== itemId && o.replacesId !== itemId)
    const newHidden = !isFromOverride
      ? [...(baseRecord.hiddenScheduleItemIds ?? []), itemId]
      : (baseRecord.hiddenScheduleItemIds ?? [])
    const newCompleted = baseRecord.completedMenus.filter((m) => m.menuItemId !== itemId)
    const newOrder = (baseRecord.menuItemOrder ?? []).filter((id) => id !== itemId)
    saveRecord({
      menuOverrides: newOverrides,
      hiddenScheduleItemIds: newHidden,
      completedMenus: newCompleted,
      menuItemOrder: newOrder.length ? newOrder : undefined,
    })
    if (editingItemId === itemId) setEditingItemId(null)
  }, [baseRecord, editingItemId, saveRecord])

  const handleRecordChange = useCallback((memo: string, bodyInfo: BodyInfo) => {
    saveRecord({ memo, bodyInfo })
  }, [saveRecord])

  const handleMoveMenuItem = useCallback((itemId: string, direction: 'up' | 'down') => {
    const ids = menuItems.map((m) => m.id)
    const idx = ids.indexOf(itemId)
    if (idx < 0) return
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1
    if (nextIdx < 0 || nextIdx >= ids.length) return
    ;[ids[idx], ids[nextIdx]] = [ids[nextIdx], ids[idx]]
    saveRecord({ menuItemOrder: ids })
  }, [menuItems, saveRecord])

  const handleDateChange = (newDate: string) => {
    if (newDate === today) setSearchParams({})
    else setSearchParams({ date: newDate })
  }
  const handleEditStart = (id: string) => setEditingItemId(id)
  const handleEditEnd = () => setEditingItemId(null)
  const [overlayArmed, setOverlayArmed] = useState(false)
  useEffect(() => {
    if (!editingItemId) {
      setOverlayArmed(false)
      return
    }
    const t = window.setTimeout(() => setOverlayArmed(true), 400)
    return () => window.clearTimeout(t)
  }, [editingItemId])

  const handleChoosePattern = (patternId: string) => {
    setEditingItemId(null)
    if (baseRecord.assignedPatternId === patternId) return
    const switching = currentPattern?.id !== patternId
    saveRecord({
      assignedPatternId: patternId,
      menuItemOrder: switching ? undefined : baseRecord.menuItemOrder,
    })
  }

  return (
    <div className="home-screen">
      <header className="home-header">
        <h1>今日のメニュー</h1>
        <div className="date-selector-row">
          <div className="date-input-wrapper">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="home-date-input"
              aria-label="Select date"
            />
            <span className="date-weekday">（{WEEKDAY_NAMES[getWeekday(selectedDate)]}）</span>
          </div>
          <button type="button" className="today-btn" onClick={() => handleDateChange(today)}>
            今日
          </button>
        </div>
        {routineMode === 'pattern' && patternSchedules.length > 0 && (
            <div className="pattern-selector">
              <div className="pattern-selector-main">
                <span className="pattern-selector-label">今日のパターン</span>
                <div className="pattern-pills" role="tablist" aria-label="パターン切り替え">
                  {patternSchedules.map((p) => {
                    const active = currentPattern?.id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`pattern-pill ${active ? 'active' : ''}`}
                        onClick={() => handleChoosePattern(p.id)}
                      >
                        {p.patternName || 'パターン'}
                      </button>
                    )
                  })}
                </div>
                {!needsPatternChoice && patternDecision?.lastPattern && currentPattern && patternDecision.lastPattern.id !== currentPattern.id && (
                  <span className="pattern-selector-next">
                    前回 {patternDecision.lastPattern.patternName} 完了 → 今日は {currentPattern.patternName}
                  </span>
                )}
                {!needsPatternChoice && !patternDecision?.lastPattern && nextPattern && nextPattern.id !== currentPattern?.id && (
                  <span className="pattern-selector-next">
                    全種目完了後は {nextPattern.patternName}
                  </span>
                )}
                {needsPatternChoice && patternDecision?.lastPattern && (
                  <span className="pattern-selector-next">
                    前回の「{patternDecision.lastPattern.patternName}」は未完了です。続けるか、別のパターンに切り替えてください。
                  </span>
                )}
              </div>
            </div>
        )}
      </header>

      <section className="menu-section">
        <div className="menu-list">
          {menuItems.length === 0 ? (
            <p className="empty-message">
              {routineMode === 'pattern'
                ? 'メニューがありません。メニュー設定でパターンを登録するか、下のボタンから追加してください。'
                : 'メニューがありません。メニュー設定で登録するか、下のボタンから追加してください。'}
            </p>
          ) : (
            menuItems
              .filter((item) => editingItemId !== item.id)
              .map((item) => {
                const index = menuItems.findIndex((m) => m.id === item.id)
                const setGroups = item.setGroups?.length ? item.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
                return (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    completedSetGroupCounts={getCompletedSetGroupCounts(item.id, setGroups.length)}
                    onSetComplete={(g, n) => handleSetComplete(item.id, g, n)}
                    onUpdate={handleUpdateMenuItem}
                    onRemove={handleRemoveMenuItem}
                    onMoveUp={index > 0 ? () => handleMoveMenuItem(item.id, 'up') : undefined}
                    onMoveDown={index < menuItems.length - 1 ? () => handleMoveMenuItem(item.id, 'down') : undefined}
                    canMoveUp={index > 0}
                    canMoveDown={index < menuItems.length - 1}
                    canRemove
                    isEditing={false}
                    onEditStart={() => handleEditStart(item.id)}
                    onEditEnd={handleEditEnd}
                  />
                )
              })
          )}
        </div>

        {editingItem && createPortal(
          <div
            className="edit-overlay"
            onClick={(e) => overlayArmed && e.target === e.currentTarget && handleEditEnd()}
            role="presentation"
            onKeyDown={(e) => e.key === 'Escape' && handleEditEnd()}
          >
            <div className="edit-overlay-content">
              <MenuItemCard
                key={editingItem.id}
                item={editingItem}
                completedSetGroupCounts={getCompletedSetGroupCounts(
                  editingItem.id,
                  (editingItem.setGroups?.length ? editingItem.setGroups : [{ weight: 0, reps: 10, sets: 3 }]).length
                )}
                onSetComplete={(g, n) => handleSetComplete(editingItem.id, g, n)}
                onUpdate={handleUpdateMenuItem}
                onRemove={handleRemoveMenuItem}
                canRemove
                isEditing
                onEditStart={() => {}}
                onEditEnd={handleEditEnd}
              />
            </div>
          </div>,
          document.body
        )}
        <button type="button" className="add-menu-btn" onClick={handleAddMenu} aria-label="Add menu">
          ＋ メニューを追加
        </button>
      </section>

      <section className="daily-record-section">
        <DailyRecordForm
          memo={baseRecord.memo}
          bodyInfo={baseRecord.bodyInfo ?? {}}
          onChange={handleRecordChange}
        />
      </section>
    </div>
  )
}
