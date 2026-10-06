import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { SettingsStore } from './settings';
import { Discovery } from './discovery';
import { buildSelection } from './files';
import { cloudUrl, sendPremium } from './cloud';
import { developmentEntry } from './security';

const discovery = new Discovery();
let window: BrowserWindow | null = null;
let selecting = false;
const entry =
  developmentEntry(process.env.DROPBEAM_DEV_URL, app.isPackaged) ??
  pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
if (!app.isPackaged && process.env.DROPBEAM_TEST_DATA_DIR)
  app.setPath('userData', process.env.DROPBEAM_TEST_DATA_DIR);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      const settings = new SettingsStore(app.getPath('userData'));
      await settings.load();
      const cloud = cloudUrl(process.env.DROPBEAM_API_URL);
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      function handle(channel: string, action: (...args: unknown[]) => unknown) {
        ipcMain.handle(channel, async (event, ...args: unknown[]) => {
          if (
            !window ||
            event.sender !== window.webContents ||
            event.senderFrame !== window.webContents.mainFrame ||
            event.senderFrame.url !== entry
          )
            throw new Error('Untrusted request.');
          try {
            return await action(...args);
          } catch (error) {
            throw new Error(
              error instanceof z.ZodError
                ? 'Invalid input.'
                : error instanceof Error
                  ? error.message
                  : 'Operation failed.',
              { cause: error },
            );
          }
        });
      }
      handle('settings:get', () => settings.get());
      handle('settings:save', async (input) => {
        const before = settings.get();
        const next = await settings.save(input);
        if (
          before.discoverable !== next.discoverable ||
          before.deviceName !== next.deviceName ||
          (next.discoverable && !discovery.snapshot().enabled)
        ) {
          if (next.discoverable) await discovery.start(next.deviceName);
          else discovery.stop();
        }
        return next;
      });
      handle('discovery:get', () => discovery.snapshot());
      handle('premium:status', () => ({ configured: !!cloud }));
      handle('premium:request', (input) => sendPremium(cloud, input));
      handle('files:select', async (input) => {
        const kind = z.enum(['files', 'folder']).parse(input);
        if (selecting || !window) throw new Error('A selection is already being prepared.');
        selecting = true;
        try {
          const result = await dialog.showOpenDialog(window, {
            title: kind === 'folder' ? 'Choose a folder to prepare' : 'Choose files to prepare',
            properties: kind === 'folder' ? ['openDirectory'] : ['openFile', 'multiSelections'],
          });
          if (result.canceled) return null;
          return await buildSelection(result.filePaths, kind);
        } finally {
          selecting = false;
        }
      });
      const createWindow = () => {
        window = new BrowserWindow({
          width: 1200,
          height: 820,
          minWidth: 760,
          minHeight: 580,
          title: 'DropBeam',
          backgroundColor: '#f6f6fa',
          webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
          },
        });
        window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        window.webContents.on('will-navigate', (event) => event.preventDefault());
        window.on('closed', () => {
          window = null;
        });
        void window.loadURL(entry);
      };
      createWindow();
      if (settings.get().discoverable) await discovery.start(settings.get().deviceName);
      app.on('activate', () => {
        if (!window) createWindow();
      });
    })
    .catch(() => {
      dialog.showErrorBox(
        'DropBeam could not start',
        'Check desktop configuration and settings.json in the app data directory. No settings were overwritten.',
      );
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => discovery.stop());
}
