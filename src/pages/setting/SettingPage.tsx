import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseMode, BonusMode, UserSettings, DEFAULT_SETTINGS, WUXI_SOCIAL, WUXI_FUND } from '@/types';
import { saveSettings, loadSettings, getDefaultSettings } from '@/utils/storage';
import { getDailyWorkSeconds } from '@/utils/salary';
import {
  calcSocialPersonal,
  calcFundPersonal,
  getAfterTaxForMonth,
  getSocialBase,
  getFundBase,
  getBonusAmount,
  calcBonusTax,
} from '@/utils/tax';
import './SettingPage.css';

/** 生成 15 分钟一档的时间选项 */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

const FUND_RATIO_OPTIONS = Array.from(
  { length: WUXI_FUND.RATIO_MAX - WUXI_FUND.RATIO_MIN + 1 },
  (_, i) => WUXI_FUND.RATIO_MIN + i
);

const BONUS_MONTH_OPTIONS = [1, 2, 3, 4, 5, 6];

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

/** 两段切换 tab（按工资 / 自定义） */
const BaseModeSwitch: React.FC<{
  value: BaseMode;
  onChange: (v: BaseMode) => void;
}> = ({ value, onChange }) => (
  <div className="mode-switch">
    <button type="button" className={`mode-tab ${value === 'salary' ? 'active' : ''}`} onClick={() => onChange('salary')}>按工资</button>
    <button type="button" className={`mode-tab ${value === 'custom' ? 'active' : ''}`} onClick={() => onChange('custom')}>自定义</button>
  </div>
);

/** 三段切换（年终奖：无 / 按月薪 / 自定义） */
const BonusModeSwitch: React.FC<{
  value: BonusMode;
  onChange: (v: BonusMode) => void;
}> = ({ value, onChange }) => (
  <div className="mode-switch triple">
    <button type="button" className={`mode-tab ${value === 'none' ? 'active' : ''}`} onClick={() => onChange('none')}>无</button>
    <button type="button" className={`mode-tab ${value === 'months' ? 'active' : ''}`} onClick={() => onChange('months')}>按月薪</button>
    <button type="button" className={`mode-tab ${value === 'custom' ? 'active' : ''}`} onClick={() => onChange('custom')}>自定义</button>
  </div>
);

const SettingPage: React.FC = () => {
  const navigate = useNavigate();
  const existing = loadSettings();
  const initial: UserSettings = existing || getDefaultSettings();

  const [form, setForm] = useState<UserSettings>(initial);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const updateForm = <K extends keyof UserSettings>(field: K, value: UserSettings[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = (): string => {
    if (!form.monthlySalary || form.monthlySalary <= 0) return '月薪必须大于 0 哦~ 💰';
    if (form.socialBaseMode === 'custom' && (!form.socialBaseCustom || form.socialBaseCustom <= 0))
      return '请填写社保基数或改为"按工资"模式哦 🏦';
    if (form.fundBaseMode === 'custom' && (!form.fundBaseCustom || form.fundBaseCustom <= 0))
      return '请填写公积金基数或改为"按工资"模式哦 🏠';
    if (form.fundRatio < WUXI_FUND.RATIO_MIN || form.fundRatio > WUXI_FUND.RATIO_MAX)
      return `公积金比例应在 ${WUXI_FUND.RATIO_MIN}%~${WUXI_FUND.RATIO_MAX}% 之间哦`;
    if (!(form.workStartTime < form.lunchStartTime && form.lunchStartTime < form.lunchEndTime && form.lunchEndTime < form.workEndTime))
      return '时间顺序：上班 < 午休开始 < 午休结束 < 下班 ⏰';
    if (getDailyWorkSeconds(form) <= 0) return '每天工作时间不能为 0 呀~';
    if (form.bonusMode === 'custom' && (!form.bonusCustom || form.bonusCustom <= 0))
      return '年终奖自定义金额要大于 0 哦 🧧';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    try {
      saveSettings(form);
      setShowSuccess(true);
      setError('');
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/board');
      }, 700);
    } catch {
      setError('保存失败了，请再试一次… 😿');
    }
  };

  const handleReset = () => { setForm({ ...DEFAULT_SETTINGS }); setError(''); };

  // 预览计算
  const socialBase = useMemo(() => getSocialBase(form), [form]);
  const fundBase = useMemo(() => getFundBase(form), [form]);
  const socialPersonal = useMemo(() => calcSocialPersonal(socialBase), [socialBase]);
  const fundPersonal = useMemo(() => calcFundPersonal(fundBase, form.fundRatio), [fundBase, form.fundRatio]);
  const previewMonth = useMemo(() => new Date().getMonth() + 1, []);
  const afterTaxBreakdown = useMemo(
    () => getAfterTaxForMonth(form, previewMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, previewMonth, socialBase, fundBase]
  );
  const bonusAmount = useMemo(() => getBonusAmount(form), [form]);
  const bonusTax = useMemo(() => calcBonusTax(bonusAmount), [bonusAmount]);
  const dailyHours = (getDailyWorkSeconds(form) / 3600).toFixed(1);

  return (
    <div className="setting-page page-scrollable">
      <div className="setting-inner">
        <form className="setting-form" onSubmit={handleSubmit}>
          {/* 月薪 + 年终奖（合并卡片） */}
          <div className={`form-card block-form salary-bonus-card ${form.monthlySalary > 0 ? 'filled' : ''}`}>
            <div className="form-icon sm">💸</div>
            <div className="form-body">
              {/* 税前月薪 */}
              <label className="form-label">税前月薪（元）</label>
              <input type="number" inputMode="decimal" className="form-input" placeholder="比如 10000"
                value={form.monthlySalary || ''} onChange={e => updateForm('monthlySalary', Number(e.target.value))}
                min={0} step={100} />

              {/* 分隔线 */}
              <div className="card-divider" />

              {/* 年终奖 */}
              <div className="label-row">
                <label className="form-label">🧧 年终奖（单独计税）</label>
                <BonusModeSwitch value={form.bonusMode} onChange={v => updateForm('bonusMode', v)} />
              </div>
              {form.bonusMode === 'months' && (
                <>
                  <div className="ratio-chips">
                    {BONUS_MONTH_OPTIONS.map(m => (
                      <button key={m} type="button" className={`ratio-chip ${form.bonusMonths === m ? 'active' : ''}`} onClick={() => updateForm('bonusMonths', m)}>
                        {m}个月
                      </button>
                    ))}
                  </div>
                  <div className="base-hint">
                    年终奖 = <b>{form.bonusMonths}</b> × ¥{form.monthlySalary} = <b>¥{bonusAmount.toFixed(0)}</b>
                    <span className="hint-small">· 个税 ¥{bonusTax.toFixed(0)} · 税后 ¥{(bonusAmount - bonusTax).toFixed(0)}</span>
                  </div>
                </>
              )}
              {form.bonusMode === 'custom' && (
                <>
                  <input type="number" inputMode="decimal" className="form-input" placeholder="比如 20000"
                    value={form.bonusCustom || ''} onChange={e => updateForm('bonusCustom', Number(e.target.value))} min={0} step={100} />
                  <div className="base-hint">
                    个税 ¥{bonusTax.toFixed(0)} · 税后实发 <b>¥{(bonusAmount - bonusTax).toFixed(0)}</b>
                  </div>
                </>
              )}
              {form.bonusMode === 'none' && (
                <div className="base-hint muted">暂不设置年终奖</div>
              )}
            </div>
          </div>

          {/* 上班-下班时间（合并一行） */}
          <div className="form-card compact range-card">
            <div className="form-icon sm">🕐</div>
            <div className="form-body">
              <label className="form-label">上班 — 下班</label>
              <div className="time-range">
                <TimeSelect value={form.workStartTime} onChange={v => updateForm('workStartTime', v)} options={timeOptions} />
                <span className="range-sep">—</span>
                <TimeSelect value={form.workEndTime} onChange={v => updateForm('workEndTime', v)} options={timeOptions} />
              </div>
            </div>
          </div>

          {/* 午休时间 */}
          <div className="form-card compact range-card">
            <div className="form-icon sm">🍱</div>
            <div className="form-body">
              <label className="form-label">午休时间</label>
              <div className="time-range">
                <TimeSelect value={form.lunchStartTime} onChange={v => updateForm('lunchStartTime', v)} options={timeOptions} />
                <span className="range-sep">—</span>
                <TimeSelect value={form.lunchEndTime} onChange={v => updateForm('lunchEndTime', v)} options={timeOptions} />
              </div>
            </div>
          </div>

          {/* 社保基数 */}
          <div className="form-card block-form">
            <div className="form-icon sm">🏥</div>
            <div className="form-body">
              <div className="label-row">
                <label className="form-label">社保基数</label>
                <BaseModeSwitch value={form.socialBaseMode} onChange={v => updateForm('socialBaseMode', v)} />
              </div>
              {form.socialBaseMode === 'custom' ? (
                <input type="number" inputMode="decimal" className="form-input" placeholder={`${WUXI_SOCIAL.BASE_MIN}~${WUXI_SOCIAL.BASE_MAX}`}
                  value={form.socialBaseCustom || ''} onChange={e => updateForm('socialBaseCustom', Number(e.target.value))} min={0} />
              ) : (
                <div className="base-hint">生效基数 <b>{socialBase.toFixed(0)}</b> 元 <span className="hint-small">（{WUXI_SOCIAL.BASE_MIN}~{WUXI_SOCIAL.BASE_MAX}）</span></div>
              )}
              <div className="base-hint small-rows">
                <span>养老8%</span><span>医疗2.2%</span><span>失业0.5%</span>
                <span className="right-total">合计 <b>¥{socialPersonal.toFixed(0)}</b>/月</span>
              </div>
            </div>
          </div>

          {/* 公积金 */}
          <div className="form-card block-form">
            <div className="form-icon sm">🏠</div>
            <div className="form-body">
              <div className="label-row">
                <label className="form-label">公积金基数</label>
                <BaseModeSwitch value={form.fundBaseMode} onChange={v => updateForm('fundBaseMode', v)} />
              </div>
              {form.fundBaseMode === 'custom' ? (
                <input type="number" inputMode="decimal" className="form-input" placeholder={`${WUXI_FUND.BASE_MIN}~${WUXI_FUND.BASE_MAX}`}
                  value={form.fundBaseCustom || ''} onChange={e => updateForm('fundBaseCustom', Number(e.target.value))} min={0} />
              ) : (
                <div className="base-hint">生效基数 <b>{fundBase.toFixed(0)}</b> 元 <span className="hint-small">（{WUXI_FUND.BASE_MIN}~{WUXI_FUND.BASE_MAX}）</span></div>
              )}
              <div className="ratio-row">
                <label className="form-label">比例</label>
                <div className="ratio-chips">
                  {FUND_RATIO_OPTIONS.map(r => (
                    <button key={r} type="button" className={`ratio-chip ${form.fundRatio === r ? 'active' : ''}`} onClick={() => updateForm('fundRatio', r)}>{r}%</button>
                  ))}
                </div>
              </div>
              <div className="base-hint">个人缴纳 <b>¥{fundPersonal.toFixed(0)}</b>/月 <span className="hint-small">（单位同 {form.fundRatio}%）</span></div>
            </div>
          </div>

          {/* 预览 */}
          <div className="preview-card big-preview">
            <div className="preview-head"><span>🧮 {previewMonth}月税后预览</span></div>
            <div className="preview-grid">
              <div className="pv-row"><span className="pv-label">税前工资</span><span className="pv-value">¥{form.monthlySalary.toFixed(0)}</span></div>
              <div className="pv-row sub"><span className="pv-label">社保（个人）</span><span className="pv-value">− ¥{socialPersonal.toFixed(0)}</span></div>
              <div className="pv-row sub"><span className="pv-label">公积金（个人）</span><span className="pv-value">− ¥{fundPersonal.toFixed(0)}</span></div>
              <div className="pv-row sub"><span className="pv-label">当月预扣个税</span><span className="pv-value">− ¥{afterTaxBreakdown.personalTax.toFixed(0)}</span></div>
              <div className="pv-row total"><span className="pv-label">✅ 税后实发</span><span className="pv-value big">¥{afterTaxBreakdown.afterTaxSalary.toFixed(0)}</span></div>
            </div>
            <div className="preview-foot">每日工作 {dailyHours} 小时</div>
          </div>

          {error && (
            <div className="error-bubble"><span className="error-icon">🙀</span><span>{error}</span></div>
          )}
          {showSuccess && !error && (
            <div className="success-bubble"><span>✨ 保存成功！正在跳转~ ✨</span></div>
          )}

          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={handleReset}>🔄 恢复默认</button>
            <button type="submit" className="btn btn-primary">{existing ? '💾 保存设置' : '🚀 开启赚钱之旅'}</button>
          </div>
        </form>

        <div className="setting-footer"><p>v1.2 · 无锡五险一金 · 个税累计预扣 + 年终奖单独计税</p></div>
      </div>
    </div>
  );
};

export default SettingPage;
