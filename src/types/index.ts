// ============================================================
//  基数模式：按工资 或 自定义
// ============================================================
export type BaseMode = 'salary' | 'custom';

// 年终奖模式
export type BonusMode = 'none' | 'months' | 'custom';

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

  /** 社保基数模式 */
  socialBaseMode: BaseMode;
  /** 社保基数自定义金额（mode=custom 时生效） */
  socialBaseCustom: number;

  /** 公积金基数模式 */
  fundBaseMode: BaseMode;
  /** 公积金基数自定义金额（mode=custom 时生效） */
  fundBaseCustom: number;
  /** 公积金缴纳比例（5~12，单位：%） */
  fundRatio: number;

  /** 年终奖模式 */
  bonusMode: BonusMode;
  /** 年终奖 = 月薪 × N 个月（mode=months 时生效） */
  bonusMonths: number;
  /** 年终奖自定义金额（mode=custom 时生效） */
  bonusCustom: number;

  /** 设置保存时间戳 */
  savedAt?: number;
}

// 当前工作状态
export type WorkStatus = 'working' | 'lunch' | 'offWork' | 'weekend' | 'beforeWork';

// 工资计算结果（同时保留税前 & 税后）
export interface SalaryResult {
  /** 当前工作状态 */
  status: WorkStatus;
  statusText: string;
  statusEmoji: string;

  /** 税前秒薪（元） */
  perSecond: number;
  /** 税后秒薪（元） */
  perSecondAfterTax: number;

  /** 今日已赚 - 税前 */
  todayEarned: number;
  /** 今日已赚 - 税后 */
  todayEarnedAfterTax: number;

  /** 本月已赚 - 税前 */
  monthEarned: number;
  /** 本月已赚 - 税后 */
  monthEarnedAfterTax: number;

  /** 今年已赚 - 税前 */
  yearEarned: number;
  /** 今年已赚 - 税后 */
  yearEarnedAfterTax: number;

  /** 月度明细：当月税前工资、五险一金个人合计、当月预扣个税、税后工资 */
  monthBreakdown: {
    socialPersonal: number;   // 社保个人
    fundPersonal: number;     // 公积金个人
    personalTax: number;      // 当月个税
    afterTaxSalary: number;   // 当月税后工资
  };

  /** 当前时间 */
  now: Date;
  /** 今日进度百分比（0-100） */
  todayProgress: number;
  /** 本月工作天数 */
  monthWorkDays: number;
  /** 今日是否工作日 */
  isWorkDay: boolean;
}

// ============================================================
//  无锡 2025 五险一金（个人缴纳比例）与基数上下限
// ============================================================
export const WUXI_SOCIAL = {
  BASE_MIN: 4952,
  BASE_MAX: 24762,
  PENSION: 0.08,
  MEDICAL: 0.02,
  MEDICAL_BIG: 0.002,
  UNEMPLOYMENT: 0.005,
};

export const WUXI_FUND = {
  BASE_MIN: 2490,
  BASE_MAX: 35200,
  RATIO_MIN: 5,
  RATIO_MAX: 12,
  RATIO_DEFAULT: 7,
};

// ============================================================
//  默认设置
// ============================================================
export const DEFAULT_SETTINGS: UserSettings = {
  monthlySalary: 10000,
  workStartTime: '09:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:30',
  workEndTime: '18:00',
  socialBaseMode: 'salary',
  socialBaseCustom: WUXI_SOCIAL.BASE_MIN,
  fundBaseMode: 'salary',
  fundBaseCustom: WUXI_FUND.BASE_MIN,
  fundRatio: WUXI_FUND.RATIO_DEFAULT,
  bonusMode: 'none',
  bonusMonths: 2,
  bonusCustom: 20000,
};
