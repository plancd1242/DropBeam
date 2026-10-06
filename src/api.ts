import { defaultSettings, settingsSchema, type Settings } from '../shared/validation';
export const desktop = window.dropbeam;
export const settingsApi = desktop?.settings ?? {
  async get(): Promise<Settings> {
    const stored = localStorage.getItem('dropbeam.settings');
    return stored ? settingsSchema.parse(JSON.parse(stored)) : { ...defaultSettings };
  },
  async save(value: Settings): Promise<Settings> {
    const parsed = settingsSchema.parse(value);
    localStorage.setItem('dropbeam.settings', JSON.stringify(parsed));
    return parsed;
  },
};
export function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** index).toFixed(1)} ${['B', 'KB', 'MB', 'GB', 'TB'][index]}`;
}
