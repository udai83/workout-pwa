import { useState } from 'react'
import './HelpButton.css'

const HELP_CONTENT = [
  { title: 'Today', text: 'メニューの数字ボタンをタップしてセット完了を記録。editで内容変更、＋Add menuで追加。' },
  { title: 'Menu', text: '曜日・日付ごとにメニューを登録。登録したメニューがTodayに表示されます。' },
  { title: 'Calendar', text: '日付をタップして過去の記録を確認できます。' },
  { title: 'Changes', text: '身体情報やトレーニング量の変化を確認できます。' },
]

export default function HelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="help-btn"
        onClick={() => setOpen(true)}
        aria-label="使い方を見る"
      >
        ?
      </button>
      {open && (
        <div
          className="help-overlay"
          onClick={() => setOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          aria-label="閉じる"
        >
          <div className="help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="help-panel-header">
              <h2>使い方</h2>
              <button
                type="button"
                className="help-close"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <ul className="help-list">
              {HELP_CONTENT.map(({ title, text }) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
