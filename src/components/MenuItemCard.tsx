import { useState } from 'react'
import type { MenuItem } from '@/types'
import './MenuItemCard.css'

interface MenuItemCardProps {
  item: MenuItem
  completedCount: number
  onSetComplete: (setNum: number) => void
  onUpdate: (item: MenuItem) => void
  onRemove: (itemId: string) => void
  canRemove?: boolean
}

export default function MenuItemCard({
  item,
  completedCount,
  onSetComplete,
  onUpdate,
  onRemove,
  canRemove = true,
}: MenuItemCardProps) {
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

  const setButtons = Array.from({ length: item.sets }, (_, i) => i + 1)

  return (
    <article className="menu-item-card">
      <div className="menu-item-header">
        {editing ? (
          <div className="edit-form">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => {
                if (name === 'New menu') e.target.select()
              }}
              placeholder="Menu name"
              className="edit-input"
              autoFocus
            />
            <div className="edit-row">
              <label>
                Weight
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="edit-input small"
                />
                kg
              </label>
              <label>
                Reps
                <input
                  type="number"
                  min="1"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="edit-input small"
                />
                reps
              </label>
              <label>
                Sets
                <input
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="edit-input small"
                />
              </label>
            </div>
            <div className="edit-actions">
              <button type="button" className="btn-save" onClick={handleSave}>
                Save
              </button>
              <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="menu-item-info">
              <h3 className="menu-item-name">{item.name}</h3>
              <p className="menu-item-spec">
                {item.weight > 0 ? `${item.weight}kg × ` : ''}
                {item.reps} reps × {item.sets} sets
              </p>
            </div>
            <div className="menu-item-actions">
              <button
                type="button"
                className="btn-edit"
                onClick={() => setEditing(true)}
                aria-label="Edit"
              >
                edit
              </button>
              {canRemove && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => onRemove(item.id)}
                  aria-label="Delete"
                >
                  delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="set-buttons">
          {setButtons.map((setNum) => {
            const done = setNum <= completedCount
            return (
              <button
                key={setNum}
                type="button"
                className={`set-btn ${done ? 'done' : ''}`}
                onClick={() => onSetComplete(setNum)}
                aria-pressed={done}
                aria-label={`Set ${setNum} ${done ? 'done' : 'not done'}`}
              >
                {done ? '✓' : setNum}
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
}
