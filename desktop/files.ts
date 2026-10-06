import { constants } from 'node:fs';
import { open, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { MAX_FILES } from '../shared/config';
import { safeFilename } from '../shared/validation';
import type { ManifestFile, Selection } from '../shared/types';

export async function hashFile(filename: string): Promise<{ size: number; sha256: string }> {
  const handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error('Only regular files can be selected.');
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of handle.createReadStream({
      autoClose: false,
      highWaterMark: 256 * 1024,
    })) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    const after = await handle.stat();
    if (
      bytes !== before.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      throw new Error('A file changed while preparing it. Select it again.');
    return { size: bytes, sha256: hash.digest('hex') };
  } finally {
    await handle.close();
  }
}

/** Paths originate only from the native picker. No renderer-supplied filesystem paths. */
export async function buildSelection(
  paths: string[],
  kind: 'files' | 'folder',
): Promise<Selection> {
  const files: ManifestFile[] = [];
  const names = new Set<string>();
  let entries = 0;
  async function visit(absolute: string, relative: string, depth: number): Promise<void> {
    if (++entries > MAX_FILES || depth > 32)
      throw new Error(
        'This selection is too large for the first milestone (10,000 entries, 32 levels).',
      );
    if (!relative.split('/').every(safeFilename))
      throw new Error(
        'A filename is not portable between macOS and Windows. Rename it before selecting.',
      );
    const key = relative.normalize('NFC').toLocaleLowerCase('en-US');
    if (names.has(key)) throw new Error('The selection contains conflicting filenames.');
    names.add(key);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink())
      throw new Error('Symbolic links are not supported. Select the original files instead.');
    if (stat.isDirectory()) {
      for (const child of (await readdir(absolute)).sort())
        await visit(path.join(absolute, child), `${relative}/${child}`, depth + 1);
    } else if (stat.isFile()) {
      files.push({ name: relative, ...(await hashFile(absolute)) });
    } else {
      throw new Error('Special files are not supported.');
    }
  }
  for (const filename of paths) await visit(filename, path.basename(filename), 0);
  if (!files.length)
    throw new Error('No regular files found. Empty folders are not supported yet.');
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (!Number.isSafeInteger(totalBytes)) throw new Error('Selection exceeds supported size.');
  return {
    id: randomUUID(),
    name: paths.length === 1 ? path.basename(paths[0]) : `${files.length} files`,
    kind,
    files,
    totalBytes,
  };
}
