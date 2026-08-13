import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSettings, SalaryResult } from '@/types';
import { loadSettings, clearSettings } from '@/utils/storage';
import {
  calculateSalary,
  formatMoney,
  formatTime,
  formatDate,
  getDailyWorkSeconds,
} from '@/utils/salary';
import { getAfterTaxForMonth } from '@/utils/tax';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const s = loadSettings();
    if (!s) {
      navigate('/setting', { replace: true });
      return;
    }
    setSettings(s);
  }, [navigate]);

  useEffect(() => {
    if (!settings) return;
    setResult(calculateSalary(settings, new Date()));

    timerRef.current = window.setInterval(() => {
      setResult(calculateSalary(settings, new Date()));
      setTick(t => t + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings]);

  const handleReset = () => {
    if (confirm('确定要清除所有设置重新来过吗？😿')) {
      clearSettings();
      navigate('/setting', { replace: true });
    }
  };

  const statusTheme = useMemo(() => {
    if (!result) return { gradient: 'linear-gradient(135deg,#FFE5EC,#FFC1D6)', accent: '#FF5C8A', glow: 'rgba(255,92,138,.35)' };
    switch (result.status) {
      case 'working':
        return { gradient: 'linear-gradient(135deg,#FFE29A,#FFB347)', accent: '#F08A00', glow: 'rgba(240,138,0,.35)' };
      case 'lunch':
        return { gradient: 'linear-gradient(135deg,#C8F7C5,#82E0AA)', accent: '#2E9E5C', glow: 'rgba(46,158,92,.35)' };
      case 'offWork':
        return { gradient: 'linear-gradient(135deg,#C9E4FF,#7FB8FF)', accent: '#2E5EAA', glow: 'rgba(46,94,170,.35)' };
      case 'weekend':
        return { gradient: 'linear-gradient(135deg,#E0C3FC,#8EC5FC)', accent: '#7A42B8', glow: 'rgba(122,66,184,.35)' };
      case 'beforeWork':
      default:
        return { gradient: 'linear-gradient(135deg,#FFE5EC,#FFC1D6)', accent: '#FF5C8A', glow: 'rgba(255,92,138,.35)' };
    }
  }, [result?.status]);

  // 今年税后目标（必须在 early return 之前调用 Hook）
  const yearGoalAfter = useMemo(() => {
    if (!settings) return 0;
    return getAfterTaxForMonth(settings, 12).afterTaxYearToMonth;
  }, [settings]);

  if (!settings || !result) {
    return (
      <div className="home-loading">
        <div className="loading-cat">🐱💭</div>
        <p>正在准备小窝…</p>
      </div>
    );
  }

  const dailyHours = (getDailyWorkSeconds(settings) / 3600).toFixed(1);
  const dailySalaryAfter = result.monthBreakdown.afterTaxSalary / Math.max(1, result.monthWorkDays);
  const monthGoalAfter = result.monthBreakdown.afterTaxSalary;

  return (
    <div className="home-page">
      {/* 背景装饰泡泡 */}
      <div className="bubbles" aria-hidden>
        <span className="bubble b1">💰</span>
        <span className="bubble b2">✨</span>
        <span className="bubble b3">💖</span>
      </div>

      {/* 顶部工具栏 */}
      <div className="home-topbar">
        <div className="date-box">
          <span className="date-text">{formatDate(result.now)}</span>
          <span className="time-text">{formatTime(result.now)}</span>
        </div>
        <div className="top-btns">
          <button className="icon-btn" onClick={handleReset} title="清空重来">🧹</button>
        </div>
      </div>

      {/* 状态大卡片：左状态，右月薪(税前/税后两行)，底两行：税前秒薪 + 税后秒薪 */}
      <div className="status-card" style={{ background: statusTheme.gradient }}>
        <div className="status-card-inner">
          <div className="status-left">
            <div className="status-emoji">{result.statusEmoji}</div>
            <div>
              <div className="status-label">当前状态</div>
              <div className="status-text" style={{ color: statusTheme.accent }}>
                {result.statusText}
              </div>
            </div>
          </div>
          <div className="status-right">
            <div className="dual-row">
              <span className="m-label">税前</span>
              <span className="m-value before">¥{shortMoney(settings.monthlySalary)}</span>
            </div>
            <div className="dual-row">
              <span className="m-label after-tag">税后</span>
              <span className="m-value after">¥{shortMoney(result.monthBreakdown.afterTaxSalary)}</span>
            </div>
            <div className="daily-hint">{dailyHours}h · {result.monthWorkDays}天/月</div>
          </div>

          {/* 税后秒薪 */}
          <div className="persec-box after">
            <span className="persec-label">税后秒薪</span>
            <div className="persec-value" key={`psa-${tick}`}>
              <span className="currency a">¥</span>
              <span className="number a">{result.perSecondAfterTax.toFixed(4)}</span>
              <span className="per">/s</span>
            </div>
            <span className="persec-hint">😮‍💨 呼吸 +¥{(result.perSecondAfterTax * 4).toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* 今日进度条 */}
      <div className="progress-card">
        <div className="progress-head">
          <span>📈 今日进度</span>
          <span className="progress-pct">{result.todayProgress.toFixed(1)}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${result.todayProgress}%`,
              background: statusTheme.gradient,
              boxShadow: `0 0 10px ${statusTheme.glow}`,
            }}
          />
          <div className="progress-kitty" style={{ left: `${Math.min(result.todayProgress, 96)}%` }}>
            🐱
          </div>
        </div>
        {!result.isWorkDay ? (
          <div className="progress-tip weekend">🎉 休息日，好好放松吧！</div>
        ) : result.todayProgress >= 100 ? (
          <div className="progress-tip done">✅ 今日工时已拉满</div>
        ) : (
          <div className="progress-tip">
            还有 <b>{(100 - result.todayProgress).toFixed(1)}%</b> 财富待解锁~
          </div>
        )}
      </div>

      {/* 统计卡片组 - 一行 3 列（今日 / 本月 / 今年）
           每卡两行：上税后（主色大字）+ 下税前（灰色小字） */}
      <div className="stats-grid">
        {/* 今日 */}
        <div className="stat-card stat-today">
          <div className="stat-head">
            <div className="stat-head-left">
              <span className="stat-emoji">🌞</span>
              <span className="stat-title">今日</span>
            </div>
          </div>
          <div
            className="stat-value"
            key={`t-${tick}`}
            title={`税后 ¥${formatMoney(result.todayEarnedAfterTax)} / 税前 ¥${formatMoney(result.todayEarned)}`}
          >
            ¥{shortMoney(result.todayEarnedAfterTax)}
          </div>
          <div className="stat-value-sub">税前 ¥{shortMoney(result.todayEarned)}</div>
          <div className="stat-foot">日标 ¥{shortMoney(dailySalaryAfter)}</div>
          {result.isWorkDay && dailySalaryAfter > 0 && (
            <div className="mini-bar">
              <div
                className="mini-fill"
                style={{ width: `${Math.min(100, (result.todayEarnedAfterTax / dailySalaryAfter) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* 本月 */}
        <div className="stat-card stat-month">
          <div className="stat-head">
            <div className="stat-head-left">
              <span className="stat-emoji">🗓️</span>
              <span className="stat-title">本月</span>
            </div>
          </div>
          <div
            className="stat-value"
            key={`m-${tick}`}
            title={`税后 ¥${formatMoney(result.monthEarnedAfterTax)} / 税前 ¥${formatMoney(result.monthEarned)}`}
          >
            ¥{shortMoney(result.monthEarnedAfterTax)}
          </div>
          <div className="stat-value-sub">税前 ¥{shortMoney(result.monthEarned)}</div>
          <div className="stat-foot">月标 ¥{shortMoney(monthGoalAfter)}</div>
          {monthGoalAfter > 0 && (
            <div className="mini-bar">
              <div
                className="mini-fill m-fill"
                style={{ width: `${Math.min(100, (result.monthEarnedAfterTax / monthGoalAfter) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* 今年 */}
        <div className="stat-card stat-year">
          <div className="stat-head">
            <div className="stat-head-left">
              <span className="stat-emoji">🎆</span>
              <span className="stat-title">今年</span>
            </div>
            <span className="year-pill">{String(result.now.getFullYear()).slice(2)}</span>
          </div>
          <div
            className="stat-value year"
            key={`y-${tick}`}
            title={`税后 ¥${formatMoney(result.yearEarnedAfterTax)} / 税前 ¥${formatMoney(result.yearEarned)}`}
          >
            ¥{shortMoney(result.yearEarnedAfterTax)}
          </div>
          <div className="stat-value-sub">税前 ¥{shortMoney(result.yearEarned)}</div>
          <div className="stat-foot">年标 ¥{shortMoney(yearGoalAfter)}</div>
          {yearGoalAfter > 0 && (
            <div className="mini-bar year-bar">
              <div
                className="mini-fill y-fill"
                style={{ width: `${Math.min(100, (result.yearEarnedAfterTax / yearGoalAfter) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 扣款明细 + 打工人语录（两行，仍然 fit 一屏） */}
      <div className="bottom-strip">
        <div className="deduct-row">
          <span className="deduct-item">
            <i className="dot s"></i>社保 ¥{result.monthBreakdown.socialPersonal.toFixed(0)}
          </span>
          <span className="deduct-item">
            <i className="dot f"></i>公积金 ¥{result.monthBreakdown.fundPersonal.toFixed(0)}
          </span>
          <span className="deduct-item">
            <i className="dot t"></i>个税 ¥{result.monthBreakdown.personalTax.toFixed(0)}
          </span>
          <span className="deduct-total">
            实发 <b>¥{formatMoney(result.monthBreakdown.afterTaxSalary)}</b>
          </span>
        </div>
        <div className="quote-line">
          <span className="quote-icon">💬</span>
          <span className="quote-text">{pickQuote(result)}</span>
        </div>
      </div>
    </div>
  );
};

/** 短金额：<10000 显示两位小数，>=10000 显示 x.xx 万 */
function shortMoney(n: number): string {
  if (!isFinite(n)) return '0.00';
  const abs = Math.abs(n);
  if (abs < 10000) {
    if (abs < 1) return n.toFixed(4);
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const wan = n / 10000;
  return `${wan.toFixed(2)}万`;
}

function pickQuote(r: SalaryResult): string {
  switch (r.status) {
    case 'beforeWork': return '早上好！今天也要元气满满哦 🌱';
    case 'working':    return '保持专注！你的税后余额在增长 📈💸';
    case 'lunch':      return '好好吃饭！吃饱才有力气继续赚 🍱✨';
    case 'offWork':    return '下班万岁！今天的你超棒哒 🎁';
    case 'weekend':    return '周末躺平！工作是别人的，命是自己的 🛌💖';
    default:           return '加油！每一秒都离财富自由更近 💰🚀';
  }
}

export default HomePage;
