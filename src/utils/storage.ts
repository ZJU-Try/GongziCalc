import { UserSettings, DEFAULT_SETTINGS } from '@/types';

const STORAGE_KEY = 'offercalc_user_settings_v1';

/**
 * 保存用户设置到本地存储
 */
export function saveSettings(settings: UserSettings): void {
  try {
    const dataToSave = { ...settings, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('保存设置失败:', error);
    throw new Error('保存设置失败，请检查浏览器存储权限');
  }
}

/**
 * 从本地存储读取用户设置
 * 兼容老版本（仅含工资/时间字段），缺少的字段会用 DEFAULT_SETTINGS 补齐
 */
export function loadSettings(): UserSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // 必须的 5 个基础字段都存在才认为有效
    if (
      typeof parsed.monthlySalary === 'number' &&
      typeof parsed.workStartTime === 'string' &&
      typeof parsed.lunchStartTime === 'string' &&
      typeof parsed.lunchEndTime === 'string' &&
      typeof parsed.workEndTime === 'string'
    ) {
      // 用默认值兜底新版本字段（社保/公积金参数）
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      } as UserSettings;
    }
    return null;
  } catch (error) {
    console.error('读取设置失败:', error);
    return null;
  }
}

/**
 * 检查是否已完成设置
 */
export function hasSettings(): boolean {
  return loadSettings() !== null;
}

/**
 * 清除所有设置（用于测试/重置）
 */
export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 获取默认设置
 */
export function getDefaultSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS };
}
