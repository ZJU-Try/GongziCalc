import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSettings, DEFAULT_SETTINGS } from '@/types';
import { saveSettings, loadSettings, getDefaultSettings } from '@/utils/storage';
import { getDailyWorkSeconds } from '@/utils/salary';
import './SettingPage.css';

interface Props {
  onSaved?: () => void;
}

/** 生成 15 分钟一档的时间选项（00:00 ~ 23:45） */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

/** 时间选择下拉框 */
const TimeSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => (
  <select
    className="form-input form-select"
    value={value}
    onChange={e => onChange(e.target.value)}
  >
    {options.map(t => (
      <option key={t} value={t}>{t}</option>
    ))}
  </select>
);

const SettingPage: React.FC<Props> = ({ onSaved }) => {
  const navigate = useNavigate();
  const existing = loadSettings();
  const initial: UserSettings = existing || getDefaultSettings();

  const [form, setForm] = useState<UserSettings>(initial);
  const [error, setError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const updateForm = (field: keyof UserSettings, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = (): string => {
    if (!form.monthlySalary || form.monthlySalary <= 0) {
      return '月薪必须是一个大于 0 的正数哦~ 💰';
    }
    // 时间先后校验
    const t1 = form.workStartTime;
    const t2 = form.lunchStartTime;
    const t3 = form.lunchEndTime;
    const t4 = form.workEndTime;
    if (!(t1 < t2 && t2 < t3 && t3 < t4)) {
      return '时间顺序不对呢~ 应该是：上班 < 午休开始 < 午休结束 < 下班 ⏰';
    }
    const dailySec = getDailyWorkSeconds(form);
    if (dailySec <= 0) {
      return '每天工作时间不能为 0 呀~';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    try {
      saveSettings(form);
      // 可爱的成功提示
      setError('');
      setTimeout(() => {
        if (onSaved) onSaved();
        navigate('/');
      }, 600);
      // 简单的反馈效果
      setShowPreview(true);
    } catch (err) {
      setError('保存失败了，请再试一次… 😿');
    }
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_SETTINGS });
    setError('');
  };

  const dailyHours = (getDailyWorkSeconds(form) / 3600).toFixed(1);

  return (
    <div className="setting-page">
      {/* 顶部装饰 */}
      <div className="setting-header">
        <div className="mascot">🐱</div>
        <h1 className="setting-title">
          {existing ? '调整小窝设置 ✏️' : '欢迎来到工资小窝 🏠'}
        </h1>
        <p className="setting-subtitle">
          {existing
            ? '修改信息后点击保存就好啦~'
            : '先填写一点点信息，我才能帮你算钱钱哦！'}
        </p>
      </div>

      <form className="setting-form" onSubmit={handleSubmit}>
        {/* 月薪 */}
        <div className={`form-card ${form.monthlySalary > 0 ? 'filled' : ''}`}>
          <div className="form-icon">💰</div>
          <div className="form-body">
            <label className="form-label">税前月薪（元）</label>
            <input
              type="number"
              inputMode="decimal"
              className="form-input"
              placeholder="比如 10000"
              value={form.monthlySalary || ''}
              onChange={e => updateForm('monthlySalary', Number(e.target.value))}
              min={0}
              step={100}
            />
          </div>
        </div>

        {/* 上班时间 */}
        <div className={`form-card ${form.workStartTime ? 'filled' : ''}`}>
          <div className="form-icon">🌅</div>
          <div className="form-body">
            <label className="form-label">上班打卡时间</label>
            <TimeSelect
              value={form.workStartTime}
              onChange={v => updateForm('workStartTime', v)}
              options={timeOptions}
            />
          </div>
        </div>

        {/* 午休时间（开始 - 结束 合并一行） */}
        <div className={`form-card lunch-card ${(form.lunchStartTime && form.lunchEndTime) ? 'filled' : ''}`}>
          <div className="form-icon">🍱</div>
          <div className="form-body">
            <label className="form-label">午休时间</label>
            <div className="lunch-range">
              <TimeSelect
                value={form.lunchStartTime}
                onChange={v => updateForm('lunchStartTime', v)}
                options={timeOptions}
              />
              <span className="range-sep">—</span>
              <TimeSelect
                value={form.lunchEndTime}
                onChange={v => updateForm('lunchEndTime', v)}
                options={timeOptions}
              />
            </div>
          </div>
        </div>

        {/* 下班时间 */}
        <div className={`form-card ${form.workEndTime ? 'filled' : ''}`}>
          <div className="form-icon">🌆</div>
          <div className="form-body">
            <label className="form-label">下班解放时间</label>
            <TimeSelect
              value={form.workEndTime}
              onChange={v => updateForm('workEndTime', v)}
              options={timeOptions}
            />
          </div>
        </div>

        {/* 预览提示 */}
        <div className="preview-card">
          <div className="preview-item">
            <span className="preview-label">每日工作时长</span>
            <span className="preview-value">{dailyHours} 小时 📊</span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-bubble">
            <span className="error-icon">🙀</span>
            <span>{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {showPreview && !error && (
          <div className="success-bubble">
            <span>✨ 保存成功！马上进入赚钱现场~ ✨</span>
          </div>
        )}

        {/* 按钮组 */}
        <div className="button-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
          >
            🔄 恢复默认
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            {existing ? '💾 保存设置' : '🚀 开启赚钱之旅'}
          </button>
        </div>
      </form>

      {/* 底部装饰 */}
      <div className="setting-footer">
        <p>v1.0 · Made with 💖 for every hard worker</p>
      </div>
    </div>
  );
};

export default SettingPage;
