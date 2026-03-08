import { useState, useEffect } from 'react'
import type { BodyInfo } from '@/types'
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
  const [height, setHeight] = useState(String(bodyInfo.height ?? ''))
  const [weight, setWeight] = useState(String(bodyInfo.weight ?? ''))
  const [bodyFat, setBodyFat] = useState(String(bodyInfo.bodyFat ?? ''))

  useEffect(() => {
    setLocalMemo(memo)
    setHeight(String(bodyInfo.height ?? ''))
    setWeight(String(bodyInfo.weight ?? ''))
    setBodyFat(String(bodyInfo.bodyFat ?? ''))
  }, [memo, bodyInfo])

  const handleBlur = () => {
    onChange(localMemo, {
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
    })
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
          <div className="body-info-item">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="身長"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={handleBlur}
              className="body-input"
            />
            <span className="unit">cm</span>
          </div>
          <div className="body-info-item">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="体重"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={handleBlur}
              className="body-input"
            />
            <span className="unit">kg</span>
          </div>
          <div className="body-info-item">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="体脂肪率"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              onBlur={handleBlur}
              className="body-input"
            />
            <span className="unit">%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
