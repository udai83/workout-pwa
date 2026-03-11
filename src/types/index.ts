/** セットグループ（重量・回数・セット数の組み合わせ） */
export interface SetGroup {
  weight: number
  reps: number
  sets: number
}

/** メニュー項目（1種目） */
export interface MenuItem {
  id: string
  name: string
  /** 複数のセットグループ（重量・回数・セット数の組み合わせ） */
  setGroups: SetGroup[]
}

/** 旧形式のMenuItem（後方互換用） */
export interface MenuItemLegacy {
  id: string
  name: string
  weight?: number
  reps?: number
  sets?: number
}

/** スケジュールタイプ */
export type ScheduleType = 'weekday' | 'date'

/** メニュースケジュール（曜日 or 日付に紐づくメニュー） */
export interface MenuSchedule {
  id: string
  scheduleType: ScheduleType
  /** 曜日指定時: 0=日, 1=月, ..., 6=土 */
  weekday?: number
  /** 日付指定時: YYYY-MM-DD */
  date?: string
  menuItems: MenuItem[]
  createdAt: string
}

/** 身体情報 */
export interface BodyInfo {
  weight?: number
  bodyFat?: number
  muscleMass?: number
}

/** 1種目の実行結果（セット完了状況） */
export interface CompletedSet {
  menuItemId: string
  /** 旧形式: 単一セットグループ時の完了数 */
  completedCount?: number
  /** 新形式: 各セットグループごとの完了数 [group0, group1, ...] */
  setGroupCounts?: number[]
}

/** メニューオーバーライド（その日だけの追加・編集） */
export interface MenuOverride {
  item: MenuItem
  /** スケジュール項目を置き換える場合の元ID */
  replacesId?: string
}

/** 日次記録 */
export interface DailyRecord {
  date: string
  menuOverrides?: MenuOverride[]
  /** その日非表示にしたスケジュール項目のID */
  hiddenScheduleItemIds?: string[]
  /** メニュー表示順（IDの配列。未指定時はデフォルト順） */
  menuItemOrder?: string[]
  completedMenus: CompletedSet[]
  memo: string
  bodyInfo: BodyInfo
}
