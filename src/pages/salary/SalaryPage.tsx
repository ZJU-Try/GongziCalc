import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSettings } from '@/utils/storage';
import { calcYearlySummary } from '@/utils/tax';
import './SalaryPage.css';

const fmt = (n: number) => {
  if (!isFinite(n)) return '0';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const SalaryPage: React.FC = () => {
  const navigate = useNavigate();
  const settings = useMemo(() => loadSettings(), []);

  const summary = useMemo(() => {
    if (!settings) return null;
    return calcYearlySummary(settings);
  }, [settings]);

  const currentMonth = new Date().getMonth() + 1;

  // 公积金入账 = 个人 + 单位（单位同比例）
  const fundTotalIn = summary ? summary.totalFund * 2 : 0;
  // 等效收入 = 到手 + 公积金入账
  const equivalentIncome = summary ? summary.totalAfterTax + fundTotalIn : 0;

  if (!settings || !summary) {
    return (
      <div className="salary-page">
        <div className="salary-empty">
          <div className="empty-emoji">🧐</div>
          <p>还没有设置哦，先去设置一下吧~</p>
          <button className="btn-go" onClick={() => navigate('/setting')}>去设置 ⚙️</button>
        </div>
      </div>
    );
  }

  return (
    <div className="salary-page page-scrollable">
      <div className="salary-inner">
        {/* 顶部标题 */}
        <div className="salary-header">
          <div className="title-row">
            <span className="title-emoji">💰</span>
            <h1 className="salary-title">全年薪金</h1>
          </div>
          <p className="salary-sub">月薪 ¥{fmt(settings.monthlySalary)} · {new Date().getFullYear()} 年</p>
        </div>

        {/* 全年合计大卡片 */}
        <div className="total-card">
          <div className="total-grid">
            <div className="total-item">
              <div className="total-label">税前合计</div>
              <div className="total-value before">¥{fmt(summary.totalBeforeTax)}</div>
            </div>
            <div className="total-item">
              <div className="total-label">全年个税</div>
              <div className="total-value deduct">¥{fmt(summary.totalTax)}</div>
            </div>
            <div className="total-item">
              <div className="total-label">全年到手</div>
              <div className="total-value after">¥{fmt(summary.totalAfterTax)}</div>
            </div>
            <div className="total-item">
              <div className="total-label">公积金入账 🏠</div>
              <div className="total-value fund">¥{fmt(fundTotalIn)}</div>
              <div className="total-sub">个人¥{fmt(summary.totalFund)}+单位¥{fmt(summary.totalFund)}</div>
            </div>
          </div>
          <div className="equivalent-row">
            <span className="equiv-label">✨ 等效收入（到手+公积金）</span>
            <span className="equiv-value">¥{fmt(equivalentIncome)}</span>
          </div>
          {summary.bonusRow && (
            <div className="bonus-strip">
              <span className="bonus-tag">🧧 年终奖</span>
              <span className="bonus-amount">税前 ¥{fmt(summary.bonusRow.beforeTax)} → 税后 <b>¥{fmt(summary.bonusRow.afterTax)}</b></span>
            </div>
          )}
        </div>

        {/* 月度明细表 */}
        <div className="table-card">
          <div className="table-head">
            <span>月份</span>
            <span>税前</span>
            <span>个税</span>
            <span className="col-after">税后</span>
          </div>
          <div className="table-body">
            {summary.rows.map(row => (
              <div
                key={row.monthIndex}
                className={`table-row ${row.isBonus ? 'bonus-row' : ''} ${row.monthIndex === currentMonth ? 'current' : ''}`}
              >
                <span className="col-month">
                  {row.label}
                  {row.monthIndex === currentMonth && !row.isBonus && <i className="now-dot">今</i>}
                </span>
                <span className="col-before">¥{fmt(row.beforeTax)}</span>
                <span className="col-deduct">¥{fmt(row.personalTax)}</span>
                <span className="col-after"><b>¥{fmt(row.afterTax)}</b></span>
              </div>
            ))}
          </div>
          <div className="table-foot">
            <span>合计</span>
            <span>¥{fmt(summary.totalBeforeTax)}</span>
            <span>¥{fmt(summary.totalTax)}</span>
            <span className="col-after"><b>¥{fmt(summary.totalAfterTax)}</b></span>
          </div>
        </div>

        <div className="salary-tip">
          <span>💡 个税采用累计预扣法，年内越往后单月税额越高；年终奖单独计税。</span>
        </div>
      </div>
    </div>
  );
};

export default SalaryPage;
