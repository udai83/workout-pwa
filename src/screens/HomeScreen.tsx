import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MenuItem, DailyRecord, BodyInfo, CompletedSet } from '@/types'
import { storage } from '@/lib/storage'
import { getWeekday, generateId } from '@/lib/utils'
import { useMenuForDate } from '@/hooks/useMenuForDate'
import { useLiveDate } from '@/hooks/useLiveDate'
import MenuItemCard from '@/components/MenuItemCard'
import DailyRecordForm from '@/components/DailyRecordForm'
import './HomeScreen.css'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HomeScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = useLiveDate()
  const selectedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today

  const weekday = getWeekday(selectedDate)
  const scheduledItems = useMenuForDate(selectedDate)
  const [record, setRecord] = useState<DailyRecord | null>(null)

  useEffect(() => {
    const r = storage.getDailyRecord(selectedDate)
    setRecord(r ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} })
    setEditingItemId(null)
  }, [selectedDate])

  const menuItems = useMemo(() => {
    const overrides = record?.menuOverrides ?? []
    const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
    const order = record?.menuItemOrder ?? []
    const seen = new Set<string>()
    const result: MenuItem[] = []

    for (const s of scheduledItems) {
      if (hiddenIds.has(s.id)) continue
      const ov = overrides.find((o) => o.replacesId === s.id)
      const item = ov ? ov.item : s
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
    for (const ov of overrides) {
      if (!ov.replacesId && !seen.has(ov.item.id)) {
        seen.add(ov.item.id)
        result.push(ov.item)
      }
    }
    if (order.length > 0) {
      const byId = new Map(result.map((m) => [m.id, m]))
      const ordered: MenuItem[] = []
      for (const id of order) {
        const m = byId.get(id)
        if (m) {
          ordered.push(m)
          byId.delete(id)
        }
      }
      byId.forEach((m) => ordered.push(m))
      return ordered
    }
    return result
  }, [record, scheduledItems])

  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const handleEditStart = useCallback((id: string) => {
    setEditingItemId(id)
  }, [])

  const handleEditEnd = useCallback(() => {
    setEditingItemId(null)
  }, [])

  const getCompletedSetGroupCounts = (itemId: string, setGroupCount: number): number[] => {
    const cm = record?.completedMenus.find((m) => m.menuItemId === itemId)
    if (!cm) return Array(setGroupCount).fill(0)
    if (cm.setGroupCounts && cm.setGroupCounts.length > 0) {
      const arr = [...cm.setGroupCounts]
      while (arr.length < setGroupCount) arr.push(0)
      return arr.slice(0, setGroupCount)
    }
    const legacy = cm.completedCount ?? 0
    return [legacy, ...Array(Math.max(0, setGroupCount - 1)).fill(0)]
  }

  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate })
  }

  const handleSetComplete = (itemId: string, setGroupIndex: number, setNum: number) => {
    const item = menuItems.find((m) => m.id === itemId)
    if (!item) return
    const setGroups = item.setGroups?.length ? item.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
    const currentCounts = getCompletedSetGroupCounts(itemId, setGroups.length)
    const current = currentCounts[setGroupIndex] ?? 0
    const next = setNum <= current ? current - 1 : current + 1

    const newCounts = [...currentCounts]
    newCounts[setGroupIndex] = Math.max(0, next)

    const allZero = newCounts.every((c) => c === 0)
    let newCompleted: CompletedSet[]

    if (allZero) {
      newCompleted = (record?.completedMenus ?? []).filter(
        (m) => m.menuItemId !== itemId
      )
    } else {
      const idx = (record?.completedMenus ?? []).findIndex(
        (m) => m.menuItemId === itemId
      )
      const newEntry: CompletedSet = {
        menuItemId: itemId,
        setGroupCounts: newCounts,
      }
      if (idx >= 0) {
        newCompleted = (record?.completedMenus ?? []).map((m, i) =>
          i === idx ? newEntry : m
        )
      } else {
        newCompleted = [...(record?.completedMenus ?? []), newEntry]
      }
    }

    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      completedMenus: newCompleted,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleAddMenu = () => {
    const newItem: MenuItem = {
      id: generateId(),
      name: '',
      setGroups: [{ weight: 0, reps: 0, sets: 0 }],
    }
    const overrides = record?.menuOverrides ?? []
    const order = record?.menuItemOrder?.length ? record.menuItemOrder : menuItems.map((m) => m.id)
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: [...overrides, { item: newItem }],
      menuItemOrder: [...order, newItem.id],
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
    setEditingItemId(newItem.id)
  }

  const handleUpdateMenuItem = (updated: MenuItem) => {
    const overrides = record?.menuOverrides ?? []
    const idx = overrides.findIndex((o) => o.item.id === updated.id)
    if (idx >= 0) {
      const newOverrides = [...overrides]
      newOverrides[idx] = { ...newOverrides[idx], item: updated }
      const newRecord: DailyRecord = {
        ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
        menuOverrides: newOverrides,
      }
      setRecord(newRecord)
      storage.saveDailyRecord(newRecord)
      return
    }
    const newItem = { ...updated, id: generateId() }
    const newOverrides = [...(record?.menuOverrides ?? []), { item: newItem, replacesId: updated.id }]
    const order = record?.menuItemOrder ?? menuItems.map((m) => m.id)
    const newOrder = order.map((id) => (id === updated.id ? newItem.id : id))
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: newOverrides,
      menuItemOrder: newOrder.length > 0 ? newOrder : undefined,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleRemoveMenuItem = (itemId: string) => {
    const overrides = record?.menuOverrides ?? []
    const isFromOverride = overrides.some((o) => o.item.id === itemId)
    const newOverrides = overrides.filter(
      (o) => o.item.id !== itemId && o.replacesId !== itemId
    )
    const newHidden = !isFromOverride
      ? [...(record?.hiddenScheduleItemIds ?? []), itemId]
      : (record?.hiddenScheduleItemIds ?? [])
    const newCompleted = (record?.completedMenus ?? []).filter(
      (m) => m.menuItemId !== itemId
    )
    const newOrder = (record?.menuItemOrder ?? []).filter((id) => id !== itemId)
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: newOverrides,
      hiddenScheduleItemIds: newHidden,
      completedMenus: newCompleted,
      menuItemOrder: newOrder.length > 0 ? newOrder : undefined,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
    if (editingItemId === itemId) setEditingItemId(null)
  }

  const handleRecordChange = (memo: string, bodyInfo: BodyInfo) => {
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      memo,
      bodyInfo,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleMoveMenuItem = (itemId: string, direction: 'up' | 'down') => {
    const ids = menuItems.map((m) => m.id)
    const idx = ids.indexOf(itemId)
    if (idx < 0) return
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1
    if (nextIdx < 0 || nextIdx >= ids.length) return
    ;[ids[idx], ids[nextIdx]] = [ids[nextIdx], ids[idx]]
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuItemOrder: ids,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
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
            <span className="date-weekday">（{WEEKDAY_NAMES[weekday]}）</span>
          </div>
          <button
            type="button"
            className="today-btn"
            onClick={() => handleDateChange(today)}
          >
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
                    onSetComplete={(groupIdx, setNum) => handleSetComplete(item.id, groupIdx, setNum)}
                    onUpdate={handleUpdateMenuItem}
                    onRemove={handleRemoveMenuItem}
                    onMoveUp={() => handleMoveMenuItem(item.id, 'up')}
                    onMoveDown={() => handleMoveMenuItem(item.id, 'down')}
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
                  onSetComplete={(groupIdx, setNum) => handleSetComplete(editingItem.id, groupIdx, setNum)}
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
        <button
          type="button"
          className="add-menu-btn"
          onClick={handleAddMenu}
          aria-label="Add menu"
        >
          ＋ メニューを追加
        </button>
      </section>

      <section className="daily-record-section">
        <DailyRecordForm
          memo={record?.memo ?? ''}
          bodyInfo={record?.bodyInfo ?? {}}
          onChange={handleRecordChange}
        />
      </section>
    </div>
  )
}
