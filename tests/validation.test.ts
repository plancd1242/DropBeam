import { describe, expect, it } from 'vitest';
import {
  nameSchema,
  premiumSchema,
  premiumMessage,
  safeFilename,
  settingsSchema,
} from '../shared/validation';
import { featureAvailable, CONTACT_EMAIL } from '../shared/config';
describe('untrusted inputs', () => {
  it.each(['Caleb', ' María-José ', '李明', 'O’Connor'])('accepts a human name: %s', (name) =>
    expect(nameSchema.safeParse(name).success).toBe(true),
  );
  it.each([
    '',
    '  ',
    '<script>',
    'Caleb\r\nBcc:evil@example.org',
    'x'.repeat(61),
    '$(whoami)',
    'Caleb\u0000',
  ])('rejects unsafe name %s', (name) => expect(nameSchema.safeParse(name).success).toBe(false));
  it('rejects arbitrary message and destination fields', () =>
    expect(
      premiumSchema.safeParse({
        name: 'Caleb',
        requestId: crypto.randomUUID(),
        to: 'other@example.org',
        message: 'spam',
      }).success,
    ).toBe(false));
  it('renders the exact intended message and official recipient', () => {
    expect(premiumMessage('Caleb')).toBe(
      'Dear Caleb,\n\nI would like to upgrade to DropBeam Premium. Please let me know if I can.\n\nThank you!\n\nSincerely,\nCaleb',
    );
    expect(CONTACT_EMAIL).toBe('dropbeam1242@gmail.com');
  });
  it.each([
    '../secret',
    '..',
    'a/b',
    'a\\b',
    'C:evil',
    'NUL',
    'CON.txt',
    'LPT9.pdf',
    'end.',
    'end ',
    'a\0b',
    'a'.repeat(241),
  ])('rejects unsafe filename %s', (name) => expect(safeFilename(name)).toBe(false));
  it.each(['hello.txt', '家庭.jpg', '.gitignore', 'My document.pdf'])(
    'accepts portable filename %s',
    (name) => expect(safeFilename(name)).toBe(true),
  );
  it('fails closed for invalid preferences', () => {
    expect(settingsSchema.safeParse({ theme: 'evil' }).success).toBe(false);
    expect(settingsSchema.safeParse({ deviceName: '<b>name</b>' }).success).toBe(false);
    expect(settingsSchema.parse({}).discoverable).toBe(false);
  });
  it('does not grant planned features to Premium', () => {
    expect(featureAvailable('Worldwide transfers', 'premium')).toBe(false);
    expect(featureAvailable('Nearby device discovery', 'free')).toBe(false);
    expect(featureAvailable('SHA-256 file manifests', 'free')).toBe(true);
    expect(featureAvailable('unknown', 'premium')).toBe(false);
  });
});
