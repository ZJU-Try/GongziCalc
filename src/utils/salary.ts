import { UserSettings, SalaryResult, WorkStatus } from '@/types';
import { getAfterTaxForMonth } from './tax';

// ============================================================
//  工具函数
// ============================================================

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function isWorkDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function getMonthWorkDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (isWorkDay(date)) count++;
  }
  return count;
}

export function getPassedWorkDays(year: number, month: number, beforeDay: number): number {
  let count = 0;
  for (let d = 1; d < beforeDay; d++) {
    const date = new Date(year, month, d);
    if (isWorkDay(date)) count++;
  }
  return count;
}

export function getPassedFullMonths(year: number, month: number): number {
  return month; // month 是 0~11，正好就是已过去的完整月份数
}

export function getDailyWorkSeconds(settings: UserSettings): number {
  const amStart = timeToMinutes(settings.workStartTime);
  const amEnd = timeToMinutes(settings.lunchStartTime);
  const pmStart = timeToMinutes(settings.lunchEndTime);
  const pmEnd = timeToMinutes(settings.workEndTime);
  const workMinutes = (amEnd - amStart) + (pmEnd - pmStart);
  return workMinutes * 60;
}

// ============================================================
//  核心状态判断
// ============================================================

export interface WorkStatusResult {
  status: WorkStatus;
  statusText: string;
  statusEmoji: string;
}

export function getWorkStatus(settings: UserSettings, now: Date): WorkStatusResult {
  if (!isWorkDay(now)) {
    return { status: 'weekend', statusText: '周末愉快', statusEmoji: '🎉' };
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const workStartMin = timeToMinutes(settings.workStartTime);
  const lunchStartMin = timeToMinutes(settings.lunchStartTime);
  const lunchEndMin = timeToMinutes(settings.lunchEndTime);
  const workEndMin = timeToMinutes(settings.workEndTime);

  if (nowMinutes < workStartMin) return { status: 'beforeWork', statusText: '还没上班', statusEmoji: '⏰' };
  if (nowMinutes < lunchStartMin) return { status: 'working', statusText: '努力工作中', statusEmoji: '💻' };
  if (nowMinutes < lunchEndMin) return { status: 'lunch', statusText: '午休充电中', statusEmoji: '🍜' };
  if (nowMinutes < workEndMin) return { status: 'working', statusText: '继续搬砖中', statusEmoji: '💪' };
  return { status: 'offWork', statusText: '下班啦~', statusEmoji: '🎊' };
}

// ============================================================
//  税前版计算（保持兼容，直接用月薪）
// ============================================================

export function calcPerSecond(
  monthlyAmount: number,
  monthWorkDays: number,
  dailySeconds: number
): number {
  const totalWorkSeconds = monthWorkDays * dailySeconds;
  if (totalWorkSeconds <= 0) return 0;
  return monthlyAmount / totalWorkSeconds;
}

export function calcTodayWorkedSeconds(settings: UserSettings, now: Date): number {
  if (!isWorkDay(now)) return 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowSecondsInDay = nowMinutes * 60 + now.getSeconds();

  const workStartSec = timeToMinutes(settings.workStartTime) * 60;
  const lunchStartSec = timeToMinutes(settings.lunchStartTime) * 60;
  const lunchEndSec = timeToMinutes(settings.lunchEndTime) * 60;
  const workEndSec = timeToMinutes(settings.workEndTime) * 60;

  let workedSec = 0;
  if (nowSecondsInDay >= workStartSec) {
    const amEnd = Math.min(nowSecondsInDay, lunchStartSec);
    workedSec += Math.max(0, amEnd - workStartSec);
  }
  if (nowSecondsInDay >= lunchEndSec) {
    const pmEnd = Math.min(nowSecondsInDay, workEndSec);
    workedSec += Math.max(0, pmEnd - lunchEndSec);
  }
  return workedSec;
}

// ============================================================
//  今日/本月/今年 已赚（通用，支持税前/税后月薪）
// ============================================================

/**
 * 今日已赚 = 今日已工作秒 × 秒薪
 */
export function calcTodayEarned(
  settings: UserSettings,
  now: Date,
  perSecond: number
): number {
  return calcTodayWorkedSeconds(settings, now) * perSecond;
}

/**
 * 本月已赚 = 已过完的工作日 × 日均工资 + 今日已赚
 * @param monthlySalary 当月工资（税前或税后都可以用相同公式）
 */
export function calcMonthEarned(
  settings: UserSettings,
  now: Date,
  todayEarned: number,
  monthlySalary: number
): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthWorkDays = getMonthWorkDays(year, month);
  if (monthWorkDays === 0) return 0;

  const passedWorkDays = getPassedWorkDays(year, month, today);
  const dailySalary = monthlySalary / monthWorkDays;
  return passedWorkDays * dailySalary + todayEarned;
}

/**
 * 今年已赚 = 已过完月份的工资累计 + 本月已赚
 * @param getMonthlySalary 函数：(月份 1-12) => 该月工资（支持每个月税后不同）
 */
export function calcYearEarned(
  now: Date,
  monthEarned: number,
  getMonthlySalary: (monthOneBased: number) => number
): number {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0~11
  let sum = 0;
  for (let m = 0; m < month; m++) {
    sum += getMonthlySalary(m + 1);
  }
  // 避免警告 year 未使用
  void year;
  return sum + monthEarned;
}

export function calcTodayProgress(settings: UserSettings, now: Date): number {
  const dailySec = getDailyWorkSeconds(settings);
  if (dailySec <= 0) return 0;
  const workedSec = calcTodayWorkedSeconds(settings, now);
  return Math.min(100, (workedSec / dailySec) * 100);
}

// ============================================================
//  总入口
// ============================================================

export function calculateSalary(
  settings: UserSettings,
  now: Date = new Date()
): SalaryResult {
  const statusResult = getWorkStatus(settings, now);

  const year = now.getFullYear();
  const month0 = now.getMonth();         // 0~11
  const month1 = month0 + 1;             // 1~12
  const monthWorkDays = getMonthWorkDays(year, month0);
  const dailySeconds = getDailyWorkSeconds(settings);
  const workDayFlag = isWorkDay(now);

  // ---- 当月税后拆解 ----
  const breakdown = getAfterTaxForMonth(settings, month1);
  // ---- 今年前 N-1 个月的税后累计 ----
  const prevMonthsAfterTaxSum =
    month1 > 1 ? getAfterTaxForMonth(settings, month1 - 1).afterTaxYearToMonth : 0;

  // ---- 秒薪（税前 & 税后） ----
  const perSecondBefore = calcPerSecond(settings.monthlySalary, monthWorkDays, dailySeconds);
  const perSecondAfter = calcPerSecond(breakdown.afterTaxSalary, monthWorkDays, dailySeconds);

  // ---- 今日 ----
  const todayEarnedBefore = calcTodayEarned(settings, now, perSecondBefore);
  const todayEarnedAfter  = calcTodayEarned(settings, now, perSecondAfter);

  // ---- 本月 ----
  const monthEarnedBefore = calcMonthEarned(settings, now, todayEarnedBefore, settings.monthlySalary);
  const monthEarnedAfter  = calcMonthEarned(settings, now, todayEarnedAfter, breakdown.afterTaxSalary);

  // ---- 今年 ----
  // 税前：每个月税前都是固定 salary 假设（简单）
  const yearEarnedBefore = calcYearEarned(now, monthEarnedBefore, () => settings.monthlySalary);
  // 税后：前 N-1 个月用累计值，第 N 个月用 monthEarnedAfter
  const yearEarnedAfter = prevMonthsAfterTaxSum + monthEarnedAfter;

  const todayProgress = calcTodayProgress(settings, now);

  return {
    status: statusResult.status,
    statusText: statusResult.statusText,
    statusEmoji: statusResult.statusEmoji,
    perSecond: perSecondBefore,
    perSecondAfterTax: perSecondAfter,
    todayEarned: todayEarnedBefore,
    todayEarnedAfterTax: todayEarnedAfter,
    monthEarned: monthEarnedBefore,
    monthEarnedAfterTax: monthEarnedAfter,
    yearEarned: yearEarnedBefore,
    yearEarnedAfterTax: yearEarnedAfter,
    monthBreakdown: {
      socialPersonal: breakdown.socialPersonal,
      fundPersonal: breakdown.fundPersonal,
      personalTax: breakdown.personalTax,
      afterTaxSalary: breakdown.afterTaxSalary,
    },
    now,
    todayProgress,
    monthWorkDays,
    isWorkDay: workDayFlag,
  };
}

// ============================================================
//  格式化
// ============================================================

export function formatMoney(value: number): string {
  if (!isFinite(value)) return '0.00';
  if (value < 1) return value.toFixed(4);
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatDate(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}年${m}月${d}日 ${weekdays[date.getDay()]}`;
}
