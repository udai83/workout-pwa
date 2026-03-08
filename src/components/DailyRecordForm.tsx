import { useState, useEffect } from 'react'
import type { BodyInfo } from '@/types'
import { BODY_INFO_FIELDS } from '@/lib/bodyInfoFields'
import './DailyRecordForm.css'

interface DailyRecordFormProps {
  memo: string
  bodyInfo: BodyInfo
  onChange: (memo: string, bodyInfo: BodyInfo) => void
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

  const handleBlur = () => {
    const newBodyInfo: BodyInfo = {}
    for (const f of BODY_INFO_FIELDS) {
      const v = values[f.key]
      if (v) {
        const num = parseFloat(v)
        if (!isNaN(num)) newBodyInfo[f.key] = num
      }
    }
    onChange(localMemo, newBodyInfo)
  }

  const updateValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <section className="daily-record-form">
      <h2 className="section-title">デイリー記録</h2>

      <div className="form-group">
        <label htmlFor="memo">メモ</label>
        <textarea
          id="memo"
          value={localMemo}
          onChange={(e) => setLocalMemo(e.target.value)}
          onBlur={handleBlur}
          placeholder="今日の感想やメモ..."
          rows={3}
          className="memo-input"
        />
      </div>

      <div className="form-group">
        <label>身体情報</label>
        <div className="body-info-grid">
          {BODY_INFO_FIELDS.map((field) => (
            <div key={field.key} className="body-info-item">
              <span className="body-info-label">{field.label}</span>
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.label}
                value={values[field.key] ?? ''}
                onChange={(e) => updateValue(field.key, e.target.value)}
                onBlur={handleBlur}
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
