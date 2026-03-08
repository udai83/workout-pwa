import { useMemo } from 'react'
import { storage } from '@/lib/storage'
import { getYesterdayString } from '@/lib/utils'
import type { BodyInfo } from '@/types'
import './GrowthMessage.css'

interface GrowthMessageProps {
  /** 今日の記録が更新されたときに再計算するためのトリガー */
  todayRecord?: { bodyInfo?: BodyInfo } | null
}

export default function GrowthMessage({ todayRecord }: GrowthMessageProps) {
  const message = useMemo(() => {
    const yesterday = getYesterdayString()
    const records = storage.getDailyRecords()
    const yesterdayRecord = records[yesterday]

    const todayBody = todayRecord?.bodyInfo
    const yesterdayBody = yesterdayRecord?.bodyInfo

    if (!todayBody || !yesterdayBody) return null

    const improvements: string[] = []

    if (
      todayBody.muscleMass != null &&
      yesterdayBody.muscleMass != null &&
      todayBody.muscleMass > yesterdayBody.muscleMass
    ) {
      improvements.push('筋肉量が増えてる')
    }
    if (
      todayBody.bodyFat != null &&
      yesterdayBody.bodyFat != null &&
      todayBody.bodyFat < yesterdayBody.bodyFat
    ) {
      improvements.push('体脂肪率が減ってる')
    }
    if (
      todayBody.weight != null &&
      yesterdayBody.weight != null &&
      todayBody.weight < yesterdayBody.weight
    ) {
      improvements.push('体重が減ってる')
    }

    if (improvements.length > 0) {
      const detail = improvements.join('し、')
      return `${detail}！成長してるね！`
    }

    return '継続してる！その調子！'
  }, [todayRecord])

  if (!message) return null

  return (
    <div className="growth-message" role="status">
      <span className="growth-icon">✨</span>
      <p className="growth-text">{message}</p>
    </div>
  )
}
