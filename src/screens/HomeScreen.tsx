import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MenuItem, DailyRecord, BodyInfo, CompletedSet } from '@/types'
import { storage } from '@/lib/storage'
import { getTodayString, getWeekday, generateId } from '@/lib/utils'
import { useMenuForDate } from '@/hooks/useMenuForDate'
import MenuItemCard from '@/components/MenuItemCard'
import DailyRecordForm from '@/components/DailyRecordForm'
import './HomeScreen.css'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HomeScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const today = getTodayString()
  const selectedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today

  const weekday = getWeekday(selectedDate)
  const scheduledItems = useMenuForDate(selectedDate)
  const [record, setRecord] = useState<DailyRecord | null>(null)

  useEffect(() => {
    const r = storage.getDailyRecord(selectedDate)
    setRecord(r ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} })
    setEditingItemId(null)
  }, [selectedDate])

  const overrides = record?.menuOverrides ?? []
  const hiddenIds = new Set(record?.hiddenScheduleItemIds ?? [])
  const replacedIds = new Set(overrides.map((o) => o.replacesId).filter(Boolean) as string[])
  const fromScheduled = scheduledItems
    .filter((s) => !hiddenIds.has(s.id) && !replacedIds.has(s.id))
    .map((s) => {
      const ov = overrides.find((o) => o.replacesId === s.id)
      return ov ? ov.item : s
    })
  const additions = overrides.filter((o) => !o.replacesId).map((o) => o.item)
  const menuItems = [...fromScheduled, ...additions]

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
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: [...overrides, { item: newItem }],
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
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: newOverrides,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleRemoveMenuItem = (itemId: string) => {
    const isFromOverride = overrides.some((o) => o.item.id === itemId)
    const newOverrides = (record?.menuOverrides ?? []).filter(
      (o) => o.item.id !== itemId && o.replacesId !== itemId
    )
    const newHidden = !isFromOverride
      ? [...(record?.hiddenScheduleItemIds ?? []), itemId]
      : (record?.hiddenScheduleItemIds ?? [])
    const newCompleted = (record?.completedMenus ?? []).filter(
      (m) => m.menuItemId !== itemId
    )
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: newOverrides,
      hiddenScheduleItemIds: newHidden,
      completedMenus: newCompleted,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
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
                const setGroups = item.setGroups?.length ? item.setGroups : [{ weight: 0, reps: 10, sets: 3 }]
                return (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    completedSetGroupCounts={getCompletedSetGroupCounts(item.id, setGroups.length)}
                    onSetComplete={(groupIdx, setNum) => handleSetComplete(item.id, groupIdx, setNum)}
                    onUpdate={handleUpdateMenuItem}
                    onRemove={handleRemoveMenuItem}
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
