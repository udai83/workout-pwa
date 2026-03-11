import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MenuItem, DailyRecord, BodyInfo, CompletedSet } from '@/types'
import { storage } from '@/lib/storage'
import { getMenuItemsForDate } from '@/lib/menuUtils'
import { getWeekday, generateId } from '@/lib/utils'
import { useLiveDate } from '@/hooks/useLiveDate'
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

  const [record, setRecord] = useState<DailyRecord | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  useEffect(() => {
    const r = storage.getDailyRecord(selectedDate)
    setRecord(r ?? createEmptyRecord(selectedDate))
    setEditingItemId(null)
  }, [selectedDate])

  useEffect(() => {
    if (editingItemId) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [editingItemId])

  const baseRecord = record ?? createEmptyRecord(selectedDate)
  const menuItems = getMenuItemsForDate(selectedDate, record)

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

    saveRecord({ completedMenus: newCompleted })
  }, [menuItems, baseRecord, getCompletedSetGroupCounts, saveRecord])

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

  const handleDateChange = (newDate: string) => setSearchParams({ date: newDate })
  const handleEditStart = (id: string) => setEditingItemId(id)
  const handleEditEnd = () => setEditingItemId(null)

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
      </header>

      <section className="menu-section">
        <div className="menu-list">
          {menuItems.length === 0 ? (
            <p className="empty-message">
              メニューがありません。メニュー設定で登録するか、下のボタンから追加してください。
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

        {editingItemId && (() => {
          const editingItem = menuItems.find((m) => m.id === editingItemId)
          if (!editingItem) return null
          const setGroups = editingItem.setGroups?.length ? editingItem.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
          return (
            <div
              className="edit-overlay"
              onClick={(e) => e.target === e.currentTarget && handleEditEnd()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Escape' && handleEditEnd()}
            >
              <div className="edit-overlay-content">
                <MenuItemCard
                  key={editingItem.id}
                  item={editingItem}
                  completedSetGroupCounts={getCompletedSetGroupCounts(editingItem.id, setGroups.length)}
                  onSetComplete={(g, n) => handleSetComplete(editingItem.id, g, n)}
                  onUpdate={handleUpdateMenuItem}
                  onRemove={handleRemoveMenuItem}
                  canRemove
                  isEditing
                  onEditStart={() => {}}
                  onEditEnd={handleEditEnd}
                />
              </div>
            </div>
          )
        })()}
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
