import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { settingsSchema, defaultSettings, type Settings } from '../shared/validation';
export class SettingsStore {
  private value: Settings = { ...defaultSettings };
  private writes = Promise.resolve();
  constructor(private directory: string) {}
  async load() {
    try {
      this.value = settingsSchema.parse(
        JSON.parse(await readFile(path.join(this.directory, 'settings.json'), 'utf8')),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Settings could not be read. Check settings.json in the app data directory.',
          { cause: error },
        );
    }
    return this.get();
  }
  get() {
    return { ...this.value };
  }
  save(input: unknown): Promise<Settings> {
    const next = settingsSchema.parse(input);
    const write = this.writes.then(async () => {
      await mkdir(this.directory, { recursive: true });
      const target = path.join(this.directory, 'settings.json');
      await writeFile(`${target}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
      await rename(`${target}.tmp`, target);
      this.value = next;
    });
    this.writes = write.catch(() => {
      /* The caller receives the error; subsequent saves may retry. */
    });
    return write.then(() => this.get());
  }
}
