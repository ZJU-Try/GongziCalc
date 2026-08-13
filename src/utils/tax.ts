import { UserSettings } from '@/types';
import { WUXI_SOCIAL, WUXI_FUND } from '@/types';

// ============================================================
//  无锡五险一金 & 个税 计算（累计预扣预缴法）+ 年终奖单独计税
// ============================================================

/** 把基数夹到 [min, max] 区间内 */
export function clampBase(value: number, min: number, max: number): number {
  if (!isFinite(value) || value <= 0) return min;
  return Math.min(Math.max(value, min), max);
}

/** 社保基数 */
export function getSocialBase(settings: UserSettings): number {
  const raw =
    settings.socialBaseMode === 'custom'
      ? settings.socialBaseCustom
      : settings.monthlySalary;
  return clampBase(raw, WUXI_SOCIAL.BASE_MIN, WUXI_SOCIAL.BASE_MAX);
}

/** 公积金基数 */
export function getFundBase(settings: UserSettings): number {
  const raw =
    settings.fundBaseMode === 'custom'
      ? settings.fundBaseCustom
      : settings.monthlySalary;
  return clampBase(raw, WUXI_FUND.BASE_MIN, WUXI_FUND.BASE_MAX);
}

/** 社保个人部分（月度） */
export function calcSocialPersonal(base: number): number {
  return (
    base * WUXI_SOCIAL.PENSION +
    base * WUXI_SOCIAL.MEDICAL +
    base * WUXI_SOCIAL.MEDICAL_BIG +
    base * WUXI_SOCIAL.UNEMPLOYMENT
  );
}

/** 公积金个人部分（月度） */
export function calcFundPersonal(base: number, ratioPercent: number): number {
  const r = Math.min(
    WUXI_FUND.RATIO_MAX,
    Math.max(WUXI_FUND.RATIO_MIN, ratioPercent || WUXI_FUND.RATIO_DEFAULT)
  );
  return base * (r / 100);
}

// ============================================================
//  工资个税（累计预扣预缴法，含 5000 起征点，不考虑专项附加扣除）
// ============================================================

const TAX_BRACKETS: Array<{ limit: number; rate: number; quick: number }> = [
  { limit: 36000,   rate: 0.03, quick: 0 },
  { limit: 144000,  rate: 0.10, quick: 2520 },
  { limit: 300000,  rate: 0.20, quick: 16920 },
  { limit: 420000,  rate: 0.25, quick: 31920 },
  { limit: 660000,  rate: 0.30, quick: 52920 },
  { limit: 960000,  rate: 0.35, quick: 85920 },
  { limit: Infinity,rate: 0.45, quick: 181920 },
];

export const MONTHLY_THRESHOLD = 5000;

function lookupTaxBracket(cumulativeTaxable: number) {
  for (const b of TAX_BRACKETS) {
    if (cumulativeTaxable <= b.limit) {
      return { rate: b.rate, quick: b.quick };
    }
  }
  return { rate: 0.45, quick: 181920 };
}

export interface MonthlyTaxRow {
  monthIndex: number;       // 1~12
  socialPersonal: number;
  fundPersonal: number;
  monthTax: number;
  afterTaxSalary: number;
  cumulativeTax: number;
  cumulativeAfterTax: number;
}

/** 全年 12 个月工资个税表（累计预扣法） */
export function calcYearlyTaxTable(
  settings: UserSettings,
  months = 12
): MonthlyTaxRow[] {
  const socialBase = getSocialBase(settings);
  const fundBase = getFundBase(settings);
  const socialPersonal = calcSocialPersonal(socialBase);
  const fundPersonal = calcFundPersonal(fundBase, settings.fundRatio);

  const monthlyAfterIns = settings.monthlySalary - socialPersonal - fundPersonal;

  const rows: MonthlyTaxRow[] = [];
  let cumulativeTaxable = 0;
  let cumulativeTax = 0;
  let cumulativeAfterTax = 0;

  for (let m = 1; m <= months; m++) {
    cumulativeTaxable += Math.max(0, monthlyAfterIns - MONTHLY_THRESHOLD);

    const bracket = lookupTaxBracket(cumulativeTaxable);
    const cumulativeTaxShould = Math.max(
      0,
      cumulativeTaxable * bracket.rate - bracket.quick
    );
    const monthTax = Math.max(0, cumulativeTaxShould - cumulativeTax);
    cumulativeTax = cumulativeTaxShould;

    const afterTaxSalary =
      settings.monthlySalary - socialPersonal - fundPersonal - monthTax;
    cumulativeAfterTax += afterTaxSalary;

    rows.push({
      monthIndex: m,
      socialPersonal,
      fundPersonal,
      monthTax,
      afterTaxSalary,
      cumulativeTax,
      cumulativeAfterTax,
    });
  }

  return rows;
}

/** 获取指定月份的税后工资拆分 */
export function getMonthlyBreakdown(settings: UserSettings, month: number) {
  const table = calcYearlyTaxTable(settings, Math.max(1, Math.min(12, month)));
  return table[table.length - 1];
}

/** 获取指定月份税后工资 + 年累计税后 */
export function getAfterTaxForMonth(settings: UserSettings, month: number) {
  const safeMonth = Math.max(1, Math.min(12, month));
  const row = getMonthlyBreakdown(settings, safeMonth);
  return {
    monthIndex: safeMonth,
    socialPersonal: row.socialPersonal,
    fundPersonal: row.fundPersonal,
    personalTax: row.monthTax,
    afterTaxSalary: row.afterTaxSalary,
    afterTaxYearToMonth: row.cumulativeAfterTax,
  };
}

// ============================================================
//  年终奖（单独计税，不并入综合所得）
//  规则：年终奖 ÷ 12 → 查"按月换算"税率表
//        税额 = 年终奖 × 税率 - 速算扣除数
// ============================================================

/** 按月换算税率表（用于年终奖单独计税） */
const BONUS_BRACKETS: Array<{ limit: number; rate: number; quick: number }> = [
  { limit: 3000,   rate: 0.03, quick: 0 },
  { limit: 12000,  rate: 0.10, quick: 210 },
  { limit: 25000,  rate: 0.20, quick: 1410 },
  { limit: 35000,  rate: 0.25, quick: 2660 },
  { limit: 55000,  rate: 0.30, quick: 4410 },
  { limit: 80000,  rate: 0.35, quick: 7160 },
  { limit: Infinity,rate: 0.45, quick: 15160 },
];

/** 根据年终奖金额查税率档（用 月均=奖金/12 查表） */
function lookupBonusBracket(bonusAmount: number) {
  const monthlyAvg = bonusAmount / 12;
  for (const b of BONUS_BRACKETS) {
    if (monthlyAvg <= b.limit) {
      return { rate: b.rate, quick: b.quick };
    }
  }
  return { rate: 0.45, quick: 15160 };
}

/** 计算年终奖税额（单独计税） */
export function calcBonusTax(bonusAmount: number): number {
  if (bonusAmount <= 0) return 0;
  const bracket = lookupBonusBracket(bonusAmount);
  return Math.max(0, bonusAmount * bracket.rate - bracket.quick);
}

/** 年终奖税后金额 */
export function calcBonusAfterTax(bonusAmount: number): number {
  return Math.max(0, bonusAmount - calcBonusTax(bonusAmount));
}

/** 根据设置获取年终奖税前金额 */
export function getBonusAmount(settings: UserSettings): number {
  switch (settings.bonusMode) {
    case 'months':
      return Math.max(0, settings.monthlySalary * Math.max(0, settings.bonusMonths));
    case 'custom':
      return Math.max(0, settings.bonusCustom);
    case 'none':
    default:
      return 0;
  }
}

/** 年终奖拆分结果 */
export interface BonusBreakdown {
  hasBonus: boolean;
  mode: string;
  amount: number;        // 税前
  tax: number;           // 个税
  afterTax: number;      // 税后
}

/** 获取年终奖拆分 */
export function getBonusBreakdown(settings: UserSettings): BonusBreakdown {
  const amount = getBonusAmount(settings);
  const tax = calcBonusTax(amount);
  return {
    hasBonus: settings.bonusMode !== 'none' && amount > 0,
    mode: settings.bonusMode,
    amount,
    tax,
    afterTax: amount - tax,
  };
}

// ============================================================
//  全年收入汇总（12 个月工资 + 年终奖）
// ============================================================

export interface YearlySummaryRow {
  monthIndex: number;          // 1~12
  label: string;               // 1月、2月... 或 年终奖
  beforeTax: number;           // 税前
  socialPersonal: number;      // 社保个人
  fundPersonal: number;        // 公积金个人
  personalTax: number;         // 当月个税
  afterTax: number;            // 税后实发
  cumulativeAfterTax: number;  // 累计税后
  isBonus?: boolean;
}

export interface YearlySummary {
  rows: YearlySummaryRow[];
  totalBeforeTax: number;      // 全年税前合计
  totalSocial: number;
  totalFund: number;
  totalTax: number;            // 全年个税合计（工资 + 年终奖）
  totalAfterTax: number;       // 全年税后合计
  bonusRow?: YearlySummaryRow; // 年终奖行（如果有）
  salaryTotalAfterTax: number; // 仅工资税后合计
  bonusAfterTax: number;       // 年终奖税后
}

const MONTH_LABELS = [
  '1月','2月','3月','4月','5月','6月',
  '7月','8月','9月','10月','11月','12月',
];

/** 全年收入汇总：12 个月工资 + 年终奖（单独计税） */
export function calcYearlySummary(settings: UserSettings): YearlySummary {
  const table = calcYearlyTaxTable(settings, 12);
  const bonus = getBonusBreakdown(settings);

  const rows: YearlySummaryRow[] = table.map(r => ({
    monthIndex: r.monthIndex,
    label: MONTH_LABELS[r.monthIndex - 1],
    beforeTax: settings.monthlySalary,
    socialPersonal: r.socialPersonal,
    fundPersonal: r.fundPersonal,
    personalTax: r.monthTax,
    afterTax: r.afterTaxSalary,
    cumulativeAfterTax: r.cumulativeAfterTax,
  }));

  let totalBeforeTax = settings.monthlySalary * 12;
  let totalSocial = table[0]?.socialPersonal * 12 || 0;
  let totalFund = table[0]?.fundPersonal * 12 || 0;
  let totalTax = table.reduce((s, r) => s + r.monthTax, 0);
  let salaryTotalAfterTax = table[table.length - 1]?.cumulativeAfterTax || 0;

  let bonusRow: YearlySummaryRow | undefined;
  let bonusAfterTax = 0;

  if (bonus.hasBonus) {
    bonusRow = {
      monthIndex: 13,
      label: '年终奖',
      beforeTax: bonus.amount,
      socialPersonal: 0,
      fundPersonal: 0,
      personalTax: bonus.tax,
      afterTax: bonus.afterTax,
      cumulativeAfterTax: salaryTotalAfterTax + bonus.afterTax,
      isBonus: true,
    };
    rows.push(bonusRow);
    totalBeforeTax += bonus.amount;
    totalTax += bonus.tax;
    bonusAfterTax = bonus.afterTax;
  }

  const totalAfterTax = salaryTotalAfterTax + bonusAfterTax;

  return {
    rows,
    totalBeforeTax,
    totalSocial,
    totalFund,
    totalTax,
    totalAfterTax,
    bonusRow,
    salaryTotalAfterTax,
    bonusAfterTax,
  };
}
