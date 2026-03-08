import { useState, useEffect } from 'react'
import type { MenuItem, DailyRecord, BodyInfo } from '@/types'
import { storage } from '@/lib/storage'
import { getTodayString, getWeekday, generateId } from '@/lib/utils'
import { useTodayMenu } from '@/hooks/useTodayMenu'
import MenuItemCard from '@/components/MenuItemCard'
import DailyRecordForm from '@/components/DailyRecordForm'
import './HomeScreen.css'

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export default function HomeScreen() {
  const today = getTodayString()
  const weekday = getWeekday(today)
  const scheduledItems = useTodayMenu()
  const [record, setRecord] = useState<DailyRecord | null>(null)

  useEffect(() => {
    const r = storage.getDailyRecord(today)
    setRecord(r ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} })
  }, [today])

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

  const completedCount = (itemId: string) =>
    record?.completedMenus.find((m) => m.menuItemId === itemId)?.completedCount ?? 0

  const handleSetComplete = (itemId: string, setNum: number) => {
    const item = menuItems.find((m) => m.id === itemId)
    if (!item) return
    const current = completedCount(itemId)
    const next = setNum <= current ? current - 1 : current + 1
    const newCompleted = [...(record?.completedMenus ?? [])]
    const idx = newCompleted.findIndex((m) => m.menuItemId === itemId)
    if (next <= 0) {
      if (idx >= 0) newCompleted.splice(idx, 1)
    } else if (idx >= 0) {
      newCompleted[idx] = { ...newCompleted[idx], completedCount: next }
    } else {
      newCompleted.push({ menuItemId: itemId, completedCount: next })
    }
    const newRecord: DailyRecord = {
      ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
      completedMenus: newCompleted,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleAddMenu = () => {
    const newItem: MenuItem = {
      id: generateId(),
      name: '新規メニュー',
      weight: 0,
      reps: 10,
      sets: 3,
    }
    const overrides = record?.menuOverrides ?? []
    const newRecord: DailyRecord = {
      ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
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
        ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
        menuOverrides: newOverrides,
      }
      setRecord(newRecord)
      storage.saveDailyRecord(newRecord)
      return
    }
    const scheduledIdx = scheduledItems.findIndex((s) => s.id === updated.id)
    if (scheduledIdx >= 0) {
      const newItem = { ...updated, id: generateId() }
      const newOverrides = [...(record?.menuOverrides ?? []), { item: newItem, replacesId: updated.id }]
      const newRecord: DailyRecord = {
        ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
        menuOverrides: newOverrides,
      }
      setRecord(newRecord)
      storage.saveDailyRecord(newRecord)
    }
  }

  const handleRemoveMenuItem = (itemId: string) => {
    const isScheduled = scheduledItems.some((s) => s.id === itemId)
    const newOverrides = (record?.menuOverrides ?? []).filter(
      (o) => o.item.id !== itemId && o.replacesId !== itemId
    )
    const newHidden = isScheduled
      ? [...(record?.hiddenScheduleItemIds ?? []), itemId]
      : (record?.hiddenScheduleItemIds ?? [])
    const newCompleted = (record?.completedMenus ?? []).filter(
      (m) => m.menuItemId !== itemId
    )
    const newRecord: DailyRecord = {
      ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
      menuOverrides: newOverrides,
      hiddenScheduleItemIds: newHidden,
      completedMenus: newCompleted,
    }
    setRecord(newRecord)
    storage.saveDailyRecord(newRecord)
  }

  const handleRecordChange = (memo: string, bodyInfo: BodyInfo) => {
    const newRecord: DailyRecord = {
      ...(record ?? { date: today, completedMenus: [], memo: '', bodyInfo: {} }),
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
        <p className="home-date">
          {today}（{WEEKDAY_NAMES[weekday]}）
        </p>
      </header>

      <section className="menu-section">
        <div className="menu-list">
          {menuItems.length === 0 ? (
            <p className="empty-message">
              メニューがありません。メニュー設定で登録するか、下のボタンから追加してください。
            </p>
          ) : (
            menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                completedCount={completedCount(item.id)}
                onSetComplete={(setNum) => handleSetComplete(item.id, setNum)}
                onUpdate={handleUpdateMenuItem}
                onRemove={handleRemoveMenuItem}
                canRemove
              />
            ))
          )}
        </div>
        <button
          type="button"
          className="add-menu-btn"
          onClick={handleAddMenu}
          aria-label="メニューを追加"
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
