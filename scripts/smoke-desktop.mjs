import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const profile = await mkdtemp(path.join(os.tmpdir(), 'dropbeam-smoke-'));
const fixture = path.join(profile, 'hello.txt');
await writeFile(fixture, 'DropBeam desktop smoke test\n');
await mkdir('.artifacts', { recursive: true });
const desktopEnv = { ...process.env };
delete desktopEnv.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  args: ['.'],
  env: {
    ...desktopEnv,
    DROPBEAM_TEST_DATA_DIR: profile,
    DROPBEAM_DEV_URL: process.env.DROPBEAM_SMOKE_URL || '',
    DROPBEAM_API_URL: '',
  },
});
const page = await app.firstWindow();
const errors = [];
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
try {
  await expect(page.getByRole('heading', { name: 'Your files. Somewhere new.' })).toBeVisible();
  const isolation = await page.evaluate(() => ({
    bridge: !!window.dropbeam,
    require: typeof window.require,
  }));
  expect(isolation).toEqual({ bridge: true, require: 'undefined' });
  const preferences = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  expect(preferences.sandbox).toBe(true);
  expect(preferences.contextIsolation).toBe(true);
  expect(preferences.nodeIntegration).toBe(false);
  await page.screenshot({ path: '.artifacts/home.png', fullPage: true });
  for (const [name, heading] of [
    ['Receive', 'Your space. Your permission.'],
    ['Devices', 'Meet your nearby computers.'],
    ['Transfers', 'A clear view of the journey.'],
    ['Settings', 'Your DropBeam, your way.'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await page.getByRole('combobox', { name: 'Color mode' }).selectOption('dark');
  for (const name of [
    /Big text/,
    /Reduced motion/,
    /Comic Sans MS Bold Mode/,
    /Super Serious Business Mode/,
  ]) {
    const control = page.getByRole('switch', { name });
    await control.click();
    await expect(control).toBeChecked();
  }
  await expect(page.locator('html')).not.toHaveClass(/comic/);
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveClass(/big-text/);
  await page.setViewportSize({ width: 760, height: 650 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.artifacts/dark-big-text.png', fullPage: true });
  await page.getByRole('button', { name: /A little more magic/ }).click();
  await page.getByRole('button', { name: 'Upgrade to Premium' }).click();
  await page.getByLabel('Your name').fill('Caleb');
  await page.getByRole('button', { name: 'Preview my request' }).click();
  await expect(page.getByText(/Dear Caleb,/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request Premium', exact: true })).toBeDisabled();
  await page.screenshot({ path: '.artifacts/premium-request.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Replace only the OS chooser with a fixture. The real IPC validation, hashing, and UI run normally.
  await app.evaluate(({ dialog }, fixturePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [fixturePath] });
  }, fixture);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('button', { name: 'Choose files', exact: true }).click();
  await expect(page.getByText('SHA-256 calculated')).toBeVisible();
  await expect(page.locator('code')).toHaveAttribute(
    'title',
    createHash('sha256').update('DropBeam desktop smoke test\n').digest('hex'),
  );
  const invalid = await page.evaluate(async () => {
    try {
      await window.dropbeam.select('arbitrary-path');
      return false;
    } catch {
      return true;
    }
  });
  expect(invalid).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: native window, sandbox bridge, six-page navigation, persisted settings, narrow Big Text layout, Premium dialog, real IPC file hashing, invalid input rejection; no renderer errors.',
  );
} catch (error) {
  console.error({ rendererErrors: errors, consoleErrors });
  await page.screenshot({ path: '.artifacts/smoke-failure.png' });
  throw error;
} finally {
  await app.close();
  await rm(profile, { recursive: true, force: true });
}
