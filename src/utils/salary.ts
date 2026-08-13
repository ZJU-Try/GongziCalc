import { UserSettings, SalaryResult, WorkStatus } from '@/types';

// ============================================================
//  工具函数
// ============================================================

/**
 * "HH:mm" 字符串转当天的分钟数（0 ~ 1439）
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 判断某天是否为工作日（周一~周五）
 */
export function isWorkDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * 获取某月的工作日总数
 * @param year 年
 * @param month 月（0~11）
 */
export function getMonthWorkDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (isWorkDay(date)) count++;
  }
  return count;
}

/**
 * 获取某月从1号到指定日期（不含当天）的工作日总数
 */
export function getPassedWorkDays(year: number, month: number, beforeDay: number): number {
  let count = 0;
  for (let d = 1; d < beforeDay; d++) {
    const date = new Date(year, month, d);
    if (isWorkDay(date)) count++;
  }
  return count;
}

/**
 * 获取今年已过去的完整月份数（不含本月）
 */
export function getPassedFullMonths(year: number, month: number): number {
  return month; // month 是 0~11，正好就是已过去的完整月份数
}

/**
 * 计算一天的工作秒数
 */
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

/**
 * 判断当前工作状态
 */
export function getWorkStatus(settings: UserSettings, now: Date): WorkStatusResult {
  // 先判断是否为工作日
  if (!isWorkDay(now)) {
    return { status: 'weekend', statusText: '周末愉快', statusEmoji: '🎉' };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const workStartMin = timeToMinutes(settings.workStartTime);
  const lunchStartMin = timeToMinutes(settings.lunchStartTime);
  const lunchEndMin = timeToMinutes(settings.lunchEndTime);
  const workEndMin = timeToMinutes(settings.workEndTime);

  if (nowMinutes < workStartMin) {
    return { status: 'beforeWork', statusText: '还没上班', statusEmoji: '⏰' };
  }
  if (nowMinutes < lunchStartMin) {
    return { status: 'working', statusText: '努力工作中', statusEmoji: '💻' };
  }
  if (nowMinutes < lunchEndMin) {
    return { status: 'lunch', statusText: '午休充电中', statusEmoji: '🍜' };
  }
  if (nowMinutes < workEndMin) {
    return { status: 'working', statusText: '继续搬砖中', statusEmoji: '💪' };
  }
  return { status: 'offWork', statusText: '下班啦~', statusEmoji: '🎊' };
}

// ============================================================
//  秒薪计算
// ============================================================

/**
 * 计算秒薪
 * 公式：月薪 / （当月工作日 * 每日工作秒数）
 */
export function calcPerSecond(settings: UserSettings, now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthWorkDays = getMonthWorkDays(year, month);
  const dailySeconds = getDailyWorkSeconds(settings);
  const totalWorkSeconds = monthWorkDays * dailySeconds;
  if (totalWorkSeconds <= 0) return 0;
  return settings.monthlySalary / totalWorkSeconds;
}

/**
 * 计算今日已工作的秒数
 */
export function calcTodayWorkedSeconds(settings: UserSettings, now: Date): number {
  if (!isWorkDay(now)) return 0;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowSecondsInDay = nowMinutes * 60 + now.getSeconds();

  const workStartSec = timeToMinutes(settings.workStartTime) * 60;
  const lunchStartSec = timeToMinutes(settings.lunchStartTime) * 60;
  const lunchEndSec = timeToMinutes(settings.lunchEndTime) * 60;
  const workEndSec = timeToMinutes(settings.workEndTime) * 60;

  let workedSec = 0;

  // 上午时段
  if (nowSecondsInDay >= workStartSec) {
    const amEnd = Math.min(nowSecondsInDay, lunchStartSec);
    workedSec += Math.max(0, amEnd - workStartSec);
  }

  // 下午时段
  if (nowSecondsInDay >= lunchEndSec) {
    const pmEnd = Math.min(nowSecondsInDay, workEndSec);
    workedSec += Math.max(0, pmEnd - lunchEndSec);
  }

  return workedSec;
}

// ============================================================
//  今日/本月/今年 已赚
// ============================================================

/**
 * 今日已赚
 */
export function calcTodayEarned(settings: UserSettings, now: Date, perSecond: number): number {
  const worked = calcTodayWorkedSeconds(settings, now);
  return worked * perSecond;
}

/**
 * 本月已赚
 * = 已过完的工作日 * 日薪 + 今日已赚
 * 日薪 = 月薪 / 当月工作日
 */
export function calcMonthEarned(settings: UserSettings, now: Date, todayEarned: number): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthWorkDays = getMonthWorkDays(year, month);
  if (monthWorkDays === 0) return 0;

  const passedWorkDays = getPassedWorkDays(year, month, today);
  const dailySalary = settings.monthlySalary / monthWorkDays;

  // 过完的工作日全薪 + 今天部分
  return passedWorkDays * dailySalary + todayEarned;
}

/**
 * 今年已赚
 * = 已过完的月份 * 月薪 + 本月已赚
 */
export function calcYearEarned(settings: UserSettings, now: Date, monthEarned: number): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const passedMonths = getPassedFullMonths(year, month);
  return passedMonths * settings.monthlySalary + monthEarned;
}

/**
 * 计算今日工作进度百分比（0~100）
 */
export function calcTodayProgress(settings: UserSettings, now: Date): number {
  const dailySec = getDailyWorkSeconds(settings);
  if (dailySec <= 0) return 0;
  const workedSec = calcTodayWorkedSeconds(settings, now);
  return Math.min(100, (workedSec / dailySec) * 100);
}

// ============================================================
//  总入口
// ============================================================

/**
 * 计算所有工资数据
 */
export function calculateSalary(settings: UserSettings, now: Date = new Date()): SalaryResult {
  const statusResult = getWorkStatus(settings, now);
  const perSecond = calcPerSecond(settings, now);
  const todayEarned = calcTodayEarned(settings, now, perSecond);
  const monthEarned = calcMonthEarned(settings, now, todayEarned);
  const yearEarned = calcYearEarned(settings, now, monthEarned);
  const todayProgress = calcTodayProgress(settings, now);
  const monthWorkDays = getMonthWorkDays(now.getFullYear(), now.getMonth());
  const workDayFlag = isWorkDay(now);

  return {
    status: statusResult.status,
    statusText: statusResult.statusText,
    statusEmoji: statusResult.statusEmoji,
    perSecond,
    todayEarned,
    monthEarned,
    yearEarned,
    now,
    todayProgress,
    monthWorkDays,
    isWorkDay: workDayFlag
  };
}

/**
 * 格式化金额显示
 * - < 1: 保留 4 位小数（如 0.0027）
 * - 1~1000: 保留 2 位小数
 * - ≥ 1000: 保留 2 位小数，带千分位
 */
export function formatMoney(value: number): string {
  if (value < 1) {
    return value.toFixed(4);
  }
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * 格式化时间 HH:mm:ss
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * 格式化日期 YYYY年MM月DD日 星期X
 */
export function formatDate(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}年${m}月${d}日 ${weekdays[date.getDay()]}`;
}
