// 用户设置类型定义
export interface UserSettings {
  /** 税前月薪（元） */
  monthlySalary: number;
  /** 上班时间，格式 HH:mm */
  workStartTime: string;
  /** 午休开始时间，格式 HH:mm */
  lunchStartTime: string;
  /** 午休结束时间，格式 HH:mm */
  lunchEndTime: string;
  /** 下班时间，格式 HH:mm */
  workEndTime: string;
  /** 设置保存时间戳 */
  savedAt?: number;
}

// 当前工作状态
export type WorkStatus = 'working' | 'lunch' | 'offWork' | 'weekend' | 'beforeWork';

// 工资计算结果
export interface SalaryResult {
  /** 当前工作状态 */
  status: WorkStatus;
  /** 状态对应的中文文本 */
  statusText: string;
  /** 状态对应的emoji */
  statusEmoji: string;
  /** 秒薪（元） */
  perSecond: number;
  /** 今日已赚（元） */
  todayEarned: number;
  /** 本月已赚（元） */
  monthEarned: number;
  /** 今年已赚（元） */
  yearEarned: number;
  /** 当前时间 */
  now: Date;
  /** 今日进度百分比（0-100） */
  todayProgress: number;
  /** 本月工作天数 */
  monthWorkDays: number;
  /** 今日是否工作日 */
  isWorkDay: boolean;
}

// 默认设置
export const DEFAULT_SETTINGS: UserSettings = {
  monthlySalary: 10000,
  workStartTime: '09:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:30',
  workEndTime: '18:00'
};
