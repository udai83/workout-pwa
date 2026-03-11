import { useState, useEffect, memo } from 'react'
import type { MenuItem } from '@/types'
import { migrateMenuItem } from '@/lib/utils'
import './MenuItemCard.css'

function toInputStrings(g: { weight: number; reps: number; sets: number }) {
  const isEmpty = g.weight === 0 && g.reps === 0 && g.sets === 0
  return {
    weightStr: isEmpty ? '' : String(g.weight),
    repsStr: isEmpty ? '' : String(g.reps),
    setsStr: isEmpty ? '' : String(g.sets),
  }
}

interface MenuItemCardProps {
  item: MenuItem
  /** 各セットグループごとの完了数 [group0, group1, ...] */
  completedSetGroupCounts: number[]
  onSetComplete: (setGroupIndex: number, setNum: number) => void
  onUpdate: (item: MenuItem) => void
  onRemove: (itemId: string) => void
  onMoveUp?: (itemId: string) => void
  onMoveDown?: (itemId: string) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  canRemove?: boolean
  isEditing?: boolean
  onEditStart?: () => void
  onEditEnd?: () => void
}

function MenuItemCard({
  item: rawItem,
  completedSetGroupCounts,
  onSetComplete,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  canRemove = true,
  isEditing = false,
  onEditStart,
  onEditEnd,
}: MenuItemCardProps) {
  const item = migrateMenuItem(rawItem as MenuItem & { weight?: number; reps?: number; sets?: number })
  const editing = isEditing
  const [name, setName] = useState(item.name)
  const [groupInputs, setGroupInputs] = useState<{ weightStr: string; repsStr: string; setsStr: string }[]>(() =>
    item.setGroups.map(toInputStrings)
  )

  useEffect(() => {
    setName(item.name)
    setGroupInputs(item.setGroups.map(toInputStrings))
  }, [item.name, item.setGroups])

  useEffect(() => {
    if (!isEditing) {
      setName(item.name)
      setGroupInputs(item.setGroups.map(toInputStrings))
    }
  }, [isEditing])

  const handleSave = () => {
    const setGroups = groupInputs.map((g) => ({
      weight: Math.max(0, Number(g.weightStr) || 0),
      reps: Math.max(1, parseInt(g.repsStr, 10) || 1),
      sets: Math.max(1, parseInt(g.setsStr, 10) || 1),
    }))
    onUpdate({
      ...item,
      name: name.trim() || item.name || '未設定',
      setGroups,
    })
    onEditEnd?.()
  }

  const handleCancel = () => {
    setName(item.name)
    setGroupInputs(item.setGroups.map(toInputStrings))
    onEditEnd?.()
  }

  const handleEditClick = () => {
    onEditStart?.()
  }

  const handleAddSetGroup = () => {
    setGroupInputs((prev) => [...prev, { weightStr: '', repsStr: '', setsStr: '' }])
  }

  const handleUpdateGroupInput = (index: number, field: 'weightStr' | 'repsStr' | 'setsStr', value: string) => {
    setGroupInputs((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    )
  }

  const handleRemoveSetGroup = (index: number) => {
    if (groupInputs.length <= 1) return
    setGroupInputs((prev) => prev.filter((_, i) => i !== index))
  }

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
              {groupInputs.map((g, idx) => (
                <div key={idx} className="set-group-edit-row">
                  <div className="edit-row">
                    <label>
                      重量
                      <span className="input-with-unit">
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
                          className="edit-input small input-placeholder"
                        />
                        kg
                      </span>
                    </label>
                    <label>
                      回数
                      <span className="input-with-unit">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={g.repsStr}
                          onChange={(e) =>
                            handleUpdateGroupInput(idx, 'repsStr', e.target.value.replace(/\D/g, ''))
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="回数"
                          className="edit-input small input-placeholder"
                        />
                        回
                      </span>
                    </label>
                    <label>
                      セット数
                      <span className="input-with-unit">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={g.setsStr}
                          onChange={(e) =>
                            handleUpdateGroupInput(idx, 'setsStr', e.target.value.replace(/\D/g, ''))
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="セット"
                          className="edit-input small input-placeholder"
                        />
                        セット
                      </span>
                    </label>
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
            </div>
            <div className="menu-item-actions">
              {canMoveUp && onMoveUp && (
                <button
                  type="button"
                  className="btn-move"
                  onClick={() => onMoveUp(item.id)}
                  aria-label="上へ"
                >
                  ↑
                </button>
              )}
              {canMoveDown && onMoveDown && (
                <button
                  type="button"
                  className="btn-move"
                  onClick={() => onMoveDown(item.id)}
                  aria-label="下へ"
                >
                  ↓
                </button>
              )}
              <button
                type="button"
                className="btn-edit"
                onClick={handleEditClick}
                aria-label="edit"
              >
                edit
              </button>
              {canRemove && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => onRemove(item.id)}
                  aria-label="delete"
                >
                  delete
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

export default memo(MenuItemCard)
