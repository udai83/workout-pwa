import { useState, useEffect, useCallback } from 'react'
import type { BodyInfo } from '@/types'
import { BODY_INFO_FIELDS } from '@/lib/bodyInfoFields'
import './DailyRecordForm.css'

interface DailyRecordFormProps {
  memo: string
  bodyInfo: BodyInfo
  onChange: (memo: string, bodyInfo: BodyInfo) => void
}

function buildBodyInfo(values: Record<string, string>): BodyInfo {
  const newBodyInfo: BodyInfo = {}
  for (const f of BODY_INFO_FIELDS) {
    const v = values[f.key]
    if (v) {
      const num = parseFloat(v)
      if (!isNaN(num)) newBodyInfo[f.key] = num
    }
  }
  return newBodyInfo
}

export default function DailyRecordForm({
  memo,
  bodyInfo,
  onChange,
}: DailyRecordFormProps) {
  const [localMemo, setLocalMemo] = useState(memo)
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setLocalMemo(memo)
    const v: Record<string, string> = {}
    for (const f of BODY_INFO_FIELDS) {
      v[f.key] = String(bodyInfo[f.key] ?? '')
    }
    setValues(v)
  }, [memo, bodyInfo])

  const syncToParent = useCallback(
    (newMemo: string, newValues: Record<string, string>) => {
      onChange(newMemo, buildBodyInfo(newValues))
    },
    [onChange]
  )

  const handleMemoChange = (value: string) => {
    setLocalMemo(value)
    syncToParent(value, values)
  }

  const updateValue = (key: string, value: string) => {
    const next = { ...values, [key]: value }
    setValues(next)
    syncToParent(localMemo, next)
  }

  return (
    <section className="daily-record-form">
      <div className="daily-record-inner">
        <textarea
          id="memo"
          value={localMemo}
          onChange={(e) => handleMemoChange(e.target.value)}
          placeholder="今日の感想やメモ..."
          rows={3}
          className="memo-input"
        />
        <div className="body-info-grid">
          {BODY_INFO_FIELDS.map((field) => (
            <div key={field.key} className="body-info-item">
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.label}
                value={values[field.key] ?? ''}
                onChange={(e) => updateValue(field.key, e.target.value)}
                className="body-input"
              />
              <span className="unit">{field.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
