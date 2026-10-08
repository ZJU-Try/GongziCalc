// ============================================================
//  中国法定节假日 & 调休安排
// ------------------------------------------------------------
//  数据来源(中国政府网,国务院办公厅通知):
//    2025: 国办发明电〔2024〕12号
//          https://www.gov.cn/gongbao/2024/issue_11726/202411/content_6989767.html
//    2026: 国办发明电〔2025〕7号
//          https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
//
//  规则:
//    - holidays        : 放假日(含法定节假日与调休连休),期间不工作、不计薪
//    - adjustedWorkdays: 调休上班日(多为周末),正常上班、计薪
//    - 未收录年份      : 回退为「周一至周五」的朴素工作日制
//
//  每年 11 月国务院办公厅发布次年安排后,在 HOLIDAY_DATA 中补一条即可。
// ============================================================

export interface HolidayRange {
  /** 节日名称 */
  name: string;
  /** 起始日 YYYY-MM-DD(含) */
  start: string;
  /** 结束日 YYYY-MM-DD(含) */
  end: string;
}

export interface YearHolidayData {
  /** 放假日区间 */
  holidays: HolidayRange[];
  /** 调休上班日 */
  adjustedWorkdays: string[];
}

export const HOLIDAY_DATA: Record<number, YearHolidayData> = {
  2025: {
    holidays: [
      { name: '元旦', start: '2025-01-01', end: '2025-01-01' },
      { name: '春节', start: '2025-01-28', end: '2025-02-04' },
      { name: '清明节', start: '2025-04-04', end: '2025-04-06' },
      { name: '劳动节', start: '2025-05-01', end: '2025-05-05' },
      { name: '端午节', start: '2025-05-31', end: '2025-06-02' },
      { name: '国庆节·中秋节', start: '2025-10-01', end: '2025-10-08' },
    ],
    adjustedWorkdays: ['2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11'],
  },
  2026: {
    holidays: [
      { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
      { name: '春节', start: '2026-02-15', end: '2026-02-23' },
      { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
      { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
      { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
      { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
      { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
    ],
    adjustedWorkdays: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'],
  },
};

// ============================================================
//  工具函数
// ============================================================

/** Date -> 'YYYY-MM-DD'(按本地时区) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 判断某日是否处于法定节假日(放假区间内,不论星期几)。
 * 返回节日名称,非节假日返回 null。
 */
export function getHolidayName(d: Date): string | null {
  const key = toDateKey(d);
  const year = HOLIDAY_DATA[d.getFullYear()];
  if (!year) return null;
  for (const h of year.holidays) {
    if (key >= h.start && key <= h.end) return h.name;
  }
  return null;
}

/** 判断某日是否为调休上班日(周末被调整为工作日) */
export function isAdjustedWorkday(d: Date): boolean {
  const year = HOLIDAY_DATA[d.getFullYear()];
  if (!year) return false;
  return year.adjustedWorkdays.includes(toDateKey(d));
}

/**
 * 日历感知的工作日判断:
 *   节假日         -> 不工作
 *   调休上班日     -> 工作(即使是周末)
 *   其余           -> 周一至周五工作
 * 未收录年份退化为朴素周一~周五。
 */
export function isCalendarWorkDay(d: Date): boolean {
  if (getHolidayName(d)) return false;
  if (isAdjustedWorkday(d)) return true;
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** 该日期所属年份是否有节假日数据(用于前端提示数据范围) */
export function hasHolidayData(d: Date): boolean {
  return HOLIDAY_DATA[d.getFullYear()] !== undefined;
}
