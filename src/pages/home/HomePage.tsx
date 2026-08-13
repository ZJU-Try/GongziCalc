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
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [tick, setTick] = useState(0); // 用于强制刷新
  const timerRef = useRef<number | null>(null);

  // 1. 加载设置
  useEffect(() => {
    const s = loadSettings();
    if (!s) {
      navigate('/setting', { replace: true });
      return;
    }
    setSettings(s);
  }, [navigate]);

  // 2. 每秒计算一次
  useEffect(() => {
    if (!settings) return;
    // 立刻先算一次
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

  // 3. 去设置页
  const goSetting = () => navigate('/setting');

  // 4. 重置（仅调试，不直接暴露）
  const handleReset = () => {
    if (confirm('确定要清除所有设置重新来过吗？😿')) {
      clearSettings();
      navigate('/setting', { replace: true });
    }
  };

  // 根据状态返回卡片配色
  const statusTheme = useMemo(() => {
    if (!result) return { gradient: '#FFD6E3', accent: '#FF5C8A', glow: 'rgba(255,92,138,.35)' };
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

  if (!settings || !result) {
    return (
      <div className="home-loading">
        <div className="loading-cat">🐱💭</div>
        <p>正在准备小窝…</p>
      </div>
    );
  }

  const dailyHours = (getDailyWorkSeconds(settings) / 3600).toFixed(1);

  return (
    <div className="home-page">
      {/* 背景装饰泡泡 */}
      <div className="bubbles" aria-hidden>
        <span className="bubble b1">💰</span>
        <span className="bubble b2">✨</span>
        <span className="bubble b3">💖</span>
        <span className="bubble b4">⭐</span>
        <span className="bubble b5">🪙</span>
      </div>

      {/* 顶部工具栏 */}
      <div className="home-topbar">
        <div className="date-box">
          <div className="date-text">{formatDate(result.now)}</div>
          <div className="time-text">{formatTime(result.now)}</div>
        </div>
        <button className="icon-btn" onClick={goSetting} title="修改设置">
          ⚙️
        </button>
      </div>

      {/* 状态大卡片 */}
      <div
        className="status-card"
        style={{ background: statusTheme.gradient }}
      >
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
            <div className="monthly-info">
              <span className="m-label">月薪</span>
              <span className="m-value">¥{formatMoney(settings.monthlySalary)}</span>
            </div>
            <div className="monthly-info small">
              <span className="m-label">每日</span>
              <span className="m-value">{dailyHours}h · {result.monthWorkDays}工作日/月</span>
            </div>
          </div>
        </div>

        {/* 秒薪展示 */}
        <div className="persec-box">
          <div className="persec-label">你的秒薪 👇</div>
          <div className="persec-value" key={`ps-${tick}`}>
            <span className="currency">¥</span>
            <span className="number">{result.perSecond.toFixed(4)}</span>
            <span className="per">/ 秒</span>
          </div>
          <div className="persec-hint">
            每呼吸一次，就进账 <b>¥{(result.perSecond * 3).toFixed(4)}</b> 😆
          </div>
        </div>
      </div>

      {/* 今日进度条 */}
      <div className="progress-card">
        <div className="progress-head">
          <span>📈 今日打工进度</span>
          <span className="progress-pct">{result.todayProgress.toFixed(1)}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${result.todayProgress}%`,
              background: statusTheme.gradient,
              boxShadow: `0 0 14px ${statusTheme.glow}`,
            }}
          />
          <div className="progress-kitty" style={{ left: `${Math.min(result.todayProgress, 96)}%` }}>
            🐱
          </div>
        </div>
        {!result.isWorkDay ? (
          <div className="progress-tip weekend">
            🎉 今天是休息日，好好放松吧！
          </div>
        ) : result.todayProgress >= 100 ? (
          <div className="progress-tip done">
            ✅ 今日工时已拉满，下班就冲！
          </div>
        ) : (
          <div className="progress-tip">
            还有 <b>{(100 - result.todayProgress).toFixed(1)}%</b> 的今日财富等你解锁~
          </div>
        )}
      </div>

      {/* 统计卡片组 */}
      <div className="stats-grid">
        {/* 今日已赚 */}
        <div className="stat-card stat-today">
          <div className="stat-head">
            <span className="stat-emoji">🌞</span>
            <span className="stat-title">今日已赚</span>
          </div>
          <div className="stat-value" key={`t-${tick}`}>
            ¥{formatMoney(result.todayEarned)}
          </div>
          <div className="stat-foot">
            {result.isWorkDay
              ? `今日目标：¥${formatMoney(settings.monthlySalary / result.monthWorkDays)}`
              : '休息日不打工~'}
          </div>
          {result.isWorkDay && result.todayEarned > 0 && (
            <div className="mini-bar">
              <div
                className="mini-fill"
                style={{
                  width: `${Math.min(
                    100,
                    (result.todayEarned / (settings.monthlySalary / result.monthWorkDays)) * 100
                  )}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* 本月已赚 */}
        <div className="stat-card stat-month">
          <div className="stat-head">
            <span className="stat-emoji">🗓️</span>
            <span className="stat-title">本月已赚</span>
          </div>
          <div className="stat-value" key={`m-${tick}`}>
            ¥{formatMoney(result.monthEarned)}
          </div>
          <div className="stat-foot">
            本月目标：¥{formatMoney(settings.monthlySalary)}
          </div>
          <div className="mini-bar">
            <div
              className="mini-fill m-fill"
              style={{
                width: `${Math.min(100, (result.monthEarned / settings.monthlySalary) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* 今年已赚 */}
        <div className="stat-card stat-year full">
          <div className="stat-head">
            <span className="stat-emoji">🎆</span>
            <span className="stat-title">今年已赚</span>
            <span className="year-pill">{result.now.getFullYear()}</span>
          </div>
          <div className="stat-value year" key={`y-${tick}`}>
            ¥{formatMoney(result.yearEarned)}
          </div>
          <div className="stat-foot">
            全年目标：¥{formatMoney(settings.monthlySalary * 12)}
          </div>
          <div className="mini-bar year-bar">
            <div
              className="mini-fill y-fill"
              style={{
                width: `${Math.min(
                  100,
                  (result.yearEarned / (settings.monthlySalary * 12)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 打工人语录 */}
      <div className="quote-card">
        <span className="quote-icon">💬</span>
        <span className="quote-text">{pickQuote(result)}</span>
      </div>

      {/* 底部工具栏 */}
      <div className="home-footer">
        <button className="ghost-btn" onClick={goSetting}>
          ✏️ 修改设置
        </button>
        <button className="ghost-btn danger" onClick={handleReset}>
          🧹 清空重来
        </button>
      </div>
    </div>
  );
};

function pickQuote(r: SalaryResult): string {
  switch (r.status) {
    case 'beforeWork':
      return '早上好！深呼吸，今天也是元气满满的打工人~ 🌱';
    case 'working':
      return '保持专注！你的账户余额正在疯狂增长 📈💸';
    case 'lunch':
      return '好好吃饭！吃饱了才有力气继续赚钱 🍱✨';
    case 'offWork':
      return '下班万岁！今天的你已经超棒啦，去奖励自己吧 🎁';
    case 'weekend':
      return '周末就是要躺平！工作是别人的，命是自己的 🛌💖';
    default:
      return '加油！每一秒都离财富自由更近一步 💰🚀';
  }
}

export default HomePage;
