import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../shared/types';
const bridge: DesktopBridge = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (value) => ipcRenderer.invoke('settings:save', value),
  },
  select: (kind) => ipcRenderer.invoke('files:select', kind),
  discovery: () => ipcRenderer.invoke('discovery:get'),
  premiumStatus: () => ipcRenderer.invoke('premium:status'),
  requestPremium: (name, requestId) => ipcRenderer.invoke('premium:request', { name, requestId }),
};
contextBridge.exposeInMainWorld('dropbeam', bridge);
