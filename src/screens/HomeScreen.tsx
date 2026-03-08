import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MenuItem, DailyRecord, BodyInfo, CompletedSet } from '@/types'
import { storage } from '@/lib/storage'
import { getTodayString, getWeekday, generateId } from '@/lib/utils'
import { useMenuForDate } from '@/hooks/useMenuForDate'
import MenuItemCard from '@/components/MenuItemCard'
import DailyRecordForm from '@/components/DailyRecordForm'
import GrowthMessage from '@/components/GrowthMessage'
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

  const completedCount = (itemId: string) =>
    record?.completedMenus.find((m) => m.menuItemId === itemId)?.completedCount ?? 0

  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate })
  }

  const handleSetComplete = (itemId: string, setNum: number) => {
    const item = menuItems.find((m) => m.id === itemId)
    if (!item) return
    const current = completedCount(itemId)
    const next = setNum <= current ? current - 1 : current + 1

    let newCompleted: CompletedSet[]
    if (next <= 0) {
      newCompleted = (record?.completedMenus ?? []).filter(
        (m) => m.menuItemId !== itemId
      )
    } else {
      const idx = (record?.completedMenus ?? []).findIndex(
        (m) => m.menuItemId === itemId
      )
      if (idx >= 0) {
        newCompleted = (record?.completedMenus ?? []).map((m, i) =>
          i === idx ? { ...m, completedCount: next } : m
        )
      } else {
        newCompleted = [
          ...(record?.completedMenus ?? []),
          { menuItemId: itemId, completedCount: next },
        ]
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
      name: 'New menu',
      weight: 0,
      reps: 10,
      sets: 3,
    }
    const overrides = record?.menuOverrides ?? []
    const newRecord: DailyRecord = {
      ...(record ?? { date: selectedDate, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: [...overrides, { item: newItem }],
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
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
        <h1>Today's workout</h1>
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
            Today
          </button>
        </div>
      </header>

      {selectedDate === today && <GrowthMessage todayRecord={record} />}

      <section className="menu-section">
        <div className="menu-list">
          {menuItems.length === 0 ? (
            <p className="empty-message">
              No menus. Add from Menu setting or the button below.
            </p>
          ) : (
            menuItems
              .filter((item) => editingItemId !== item.id)
              .map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  completedCount={completedCount(item.id)}
                  onSetComplete={(setNum) => handleSetComplete(item.id, setNum)}
                  onUpdate={handleUpdateMenuItem}
                  onRemove={handleRemoveMenuItem}
                  canRemove
                  isEditing={false}
                  onEditStart={() => handleEditStart(item.id)}
                  onEditEnd={handleEditEnd}
                />
              ))
          )}
        </div>

        {editingItemId && (() => {
          const editingItem = menuItems.find((m) => m.id === editingItemId)
          if (!editingItem) return null
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
                  completedCount={completedCount(editingItem.id)}
                  onSetComplete={(setNum) => handleSetComplete(editingItem.id, setNum)}
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
          ＋ Add menu
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
