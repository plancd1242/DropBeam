import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildSelection, hashFile } from '../desktop/files';
import { SettingsStore } from '../desktop/settings';
import { parseDevice } from '../desktop/discovery';
import { defaultSettings } from '../shared/validation';
const temps: string[] = [];
async function temp() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dropbeam-test-'));
  temps.push(dir);
  return dir;
}
afterEach(async () => {
  for (const directory of temps.splice(0)) await rm(directory, { recursive: true, force: true });
});
describe('native preparation', () => {
  it('streams a multi-chunk file and verifies its digest', async () => {
    const dir = await temp();
    const data = Buffer.alloc(1024 * 1024 + 3, 42);
    const file = path.join(dir, 'test.bin');
    await writeFile(file, data);
    expect(await hashFile(file)).toEqual({
      size: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
    });
  });
  it('preserves relative folder names and calculates a real total', async () => {
    const dir = await temp();
    await mkdir(path.join(dir, 'nested'));
    await writeFile(path.join(dir, 'nested', 'hello.txt'), 'hello');
    await writeFile(path.join(dir, 'empty.txt'), '');
    const result = await buildSelection([dir], 'folder');
    expect(result.totalBytes).toBe(5);
    expect(result.files).toHaveLength(2);
    expect(result.files[1].name).toBe(`${path.basename(dir)}/nested/hello.txt`);
    expect(result.files[0].sha256).toBe(createHash('sha256').update('').digest('hex'));
  });
  it('rejects symlinks without reading their targets', async () => {
    const dir = await temp();
    await writeFile(path.join(dir, 'target.txt'), 'private');
    await symlink(path.join(dir, 'target.txt'), path.join(dir, 'link.txt'));
    await expect(buildSelection([path.join(dir, 'link.txt')], 'files')).rejects.toThrow(
      'Symbolic links',
    );
  });
  it('rejects empty selections and duplicate leaf names', async () => {
    const dir = await temp();
    await expect(buildSelection([dir], 'folder')).rejects.toThrow('No regular files');
    await writeFile(path.join(dir, 'x'), 'x');
    await expect(
      buildSelection([path.join(dir, 'x'), path.join(dir, 'x')], 'files'),
    ).rejects.toThrow('conflicting');
  });
  it('rejects Windows reserved names on macOS too', async () => {
    const dir = await temp();
    await writeFile(path.join(dir, 'CON.txt'), 'x');
    await expect(buildSelection([dir], 'folder')).rejects.toThrow('not portable');
  });
});
describe('settings', () => {
  it('persists validated preferences and serializes writes', async () => {
    const dir = await temp();
    const store = new SettingsStore(dir);
    await store.load();
    await Promise.all([
      store.save({ ...defaultSettings, theme: 'dark' }),
      store.save({ ...defaultSettings, theme: 'light' }),
    ]);
    const reload = new SettingsStore(dir);
    expect((await reload.load()).theme).toBe('light');
  });
  it('preserves corrupted settings for recovery', async () => {
    const dir = await temp();
    await writeFile(path.join(dir, 'settings.json'), 'not JSON');
    await expect(new SettingsStore(dir).load()).rejects.toThrow('could not be read');
    expect(await readFile(path.join(dir, 'settings.json'), 'utf8')).toBe('not JSON');
  });
});
describe('discovery metadata', () => {
  const id = crypto.randomUUID();
  it('rejects unrelated protocol versions and self', () => {
    expect(parseDevice({ txt: { id, v: '2' } }, '')).toBeNull();
    expect(parseDevice({ txt: { id, v: '1' } }, id)).toBeNull();
  });
  it('uses a safe fallback name and never raw address identity', () => {
    expect(
      parseDevice({ txt: { id, v: '1', name: '<img>', platform: 'other' } }, ''),
    ).toMatchObject({ name: 'Unknown Device', platform: 'Unknown platform' });
  });
  it('parses a real DropBeam TXT record', () => {
    expect(
      parseDevice({ txt: { id, v: '1', name: 'Farm Mac', platform: 'darwin' } }, ''),
    ).toMatchObject({ id, name: 'Farm Mac', platform: 'macOS' });
  });
});
