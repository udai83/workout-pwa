import { useState, useEffect } from 'react'
import type { MenuItem } from '@/types'
import { migrateMenuItem } from '@/lib/utils'
import './MenuItemCard.css'

interface MenuItemCardProps {
  item: MenuItem
  /** 各セットグループごとの完了数 [group0, group1, ...] */
  completedSetGroupCounts: number[]
  onSetComplete: (setGroupIndex: number, setNum: number) => void
  onUpdate: (item: MenuItem) => void
  onRemove: (itemId: string) => void
  canRemove?: boolean
  isEditing?: boolean
  onEditStart?: () => void
  onEditEnd?: () => void
}

export default function MenuItemCard({
  item: rawItem,
  completedSetGroupCounts,
  onSetComplete,
  onUpdate,
  onRemove,
  canRemove = true,
  isEditing = false,
  onEditStart,
  onEditEnd,
}: MenuItemCardProps) {
  const item = migrateMenuItem(rawItem as MenuItem & { weight?: number; reps?: number; sets?: number })
  const editing = isEditing
  const [name, setName] = useState(item.name)
  const [setGroups, setSetGroups] = useState(item.setGroups)

  useEffect(() => {
    setName(item.name)
    setSetGroups(item.setGroups)
  }, [item.name, item.setGroups])

  useEffect(() => {
    if (!isEditing) {
      setName(item.name)
      setSetGroups(item.setGroups)
    }
  }, [isEditing])

  const handleSave = () => {
    onUpdate({
      ...item,
      name: name.trim() || item.name || '未設定',
      setGroups: setGroups.map((g) => ({
        weight: Math.max(0, parseFloat(String(g.weight)) || 0),
        reps: Math.max(1, parseInt(String(g.reps), 10) || 1),
        sets: Math.max(1, parseInt(String(g.sets), 10) || 1),
      })),
    })
    onEditEnd?.()
  }

  const handleCancel = () => {
    setName(item.name)
    setSetGroups(item.setGroups)
    onEditEnd?.()
  }

  const handleEditClick = () => {
    onEditStart?.()
  }

  const handleAddSetGroup = () => {
    setSetGroups((prev) => [...prev, { weight: 0, reps: 0, sets: 0 }])
  }

  const handleUpdateSetGroup = (index: number, updates: Partial<{ weight: number; reps: number; sets: number }>) => {
    setSetGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...updates } : g))
    )
  }

  const handleRemoveSetGroup = (index: number) => {
    if (setGroups.length <= 1) return
    setSetGroups((prev) => prev.filter((_, i) => i !== index))
  }

  const specText = item.setGroups
    .filter((g) => g.reps > 0 && g.sets > 0)
    .map((g) =>
      g.weight > 0 ? `${g.weight}kg × ${g.reps}回 × ${g.sets}セット` : `${g.reps}回 × ${g.sets}セット`
    )
    .join(' / ') || '（未入力）'

  return (
    <article className="menu-item-card">
      <div className="menu-item-header">
        {editing ? (
          <div className="edit-form">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="種目名"
              className="edit-input name-input"
              autoFocus
            />
            <div className="set-groups-edit">
              {setGroups.map((g, idx) => (
                <div key={idx} className="set-group-edit-row">
                  <div className="edit-row">
                    <label>
                      重量
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={g.weight === 0 && g.reps === 0 && g.sets === 0 ? '' : g.weight}
                        onChange={(e) =>
                          handleUpdateSetGroup(idx, { weight: parseFloat(e.target.value) || 0 })
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="重量"
                        className="edit-input small"
                      />
                      kg
                    </label>
                    <label>
                      回数
                      <input
                        type="number"
                        min="1"
                        value={g.weight === 0 && g.reps === 0 && g.sets === 0 ? '' : g.reps}
                        onChange={(e) =>
                          handleUpdateSetGroup(idx, { reps: parseInt(e.target.value, 10) || 1 })
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="回数"
                        className="edit-input small"
                      />
                    </label>
                    <label>
                      セット数
                      <input
                        type="number"
                        min="1"
                        value={g.weight === 0 && g.reps === 0 && g.sets === 0 ? '' : g.sets}
                        onChange={(e) =>
                          handleUpdateSetGroup(idx, { sets: parseInt(e.target.value, 10) || 1 })
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="セット数"
                        className="edit-input small"
                      />
                    </label>
                    {setGroups.length > 1 && (
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
            <div className="edit-actions">
              <button type="button" className="btn-save" onClick={handleSave}>
                保存
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="menu-item-info">
              <h3 className="menu-item-name">{item.name || '（未設定）'}</h3>
              <p className="menu-item-spec">{specText}</p>
            </div>
            <div className="menu-item-actions">
              <button
                type="button"
                className="btn-edit"
                onClick={handleEditClick}
                aria-label="編集"
              >
                編集
              </button>
              {canRemove && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => onRemove(item.id)}
                  aria-label="削除"
                >
                  削除
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="set-groups-stack">
          {item.setGroups
            .map((group, groupIdx) => ({ group, groupIdx }))
            .filter(({ group }) => group.reps > 0 && group.sets > 0)
            .map(({ group, groupIdx }) => {
              const completed = completedSetGroupCounts[groupIdx] ?? 0
              const setButtons = Array.from({ length: group.sets }, (_, i) => i + 1)
              return (
                <div key={groupIdx} className="set-group-block">
                  <p className="set-group-spec">
                    {group.weight > 0 ? `${group.weight}kg × ` : ''}
                    {group.reps}回 × {group.sets}セット
                  </p>
                  <div className="set-buttons">
                    {setButtons.map((setNum) => {
                      const done = setNum <= completed
                      return (
                        <button
                          key={setNum}
                          type="button"
                          className={`set-btn ${done ? 'done' : ''}`}
                          onClick={() => onSetComplete(groupIdx, setNum)}
                          aria-pressed={done}
                          aria-label={`セット${setNum} ${done ? '完了' : '未完了'}`}
                        >
                          {done ? '✓' : setNum}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </article>
  )
}
