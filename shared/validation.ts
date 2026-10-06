import { z } from 'zod';
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter your name.')
  .max(60, 'Use 60 characters or fewer.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u, 'Use letters, spaces, apostrophes, or hyphens.');
export const premiumSchema = z.object({ name: nameSchema, requestId: z.uuid() }).strict();
export function premiumMessage(name: string) {
  const safe = nameSchema.parse(name);
  return `Dear ${safe},\n\nI would like to upgrade to DropBeam Premium. Please let me know if I can.\n\nThank you!\n\nSincerely,\n${safe}`;
}
export const settingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    bigText: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
    compact: z.boolean().default(false),
    comic: z.boolean().default(false),
    sparkles: z.boolean().default(true),
    rainbow: z.boolean().default(false),
    celebration: z.boolean().default(true),
    serious: z.boolean().default(false),
    deviceName: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[\p{L}\p{N}\p{M} ._'’()-]+$/u)
      .default('My computer'),
    discoverable: z.boolean().default(false),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings = settingsSchema.parse({});
/** Conservative cross-platform leaf names; never normalize attacker-controlled paths. */
export function safeFilename(name: string): boolean {
  return (
    name.length > 0 &&
    BufferFreeByteLength(name) <= 240 &&
    !/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(name) &&
    !/[. ]$/.test(name) &&
    name !== '.' &&
    name !== '..' &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  );
}
function BufferFreeByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
