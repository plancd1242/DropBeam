# Architecture and next milestones

## Boundaries

```text
React renderer (src/)
  │ context-isolated, typed, named IPC operations
  ▼
Electron main (desktop/)
  ├── native picker → streaming SHA-256 manifest (no upload)
  ├── validated settings → atomic local JSON write
  ├── opt-in mDNS presence → unverified device list
  └── validated Premium request → HTTPS Cloud endpoint
                                         │
                               Durable Object reservation
                                         │
                               server-side Gmail OAuth
```

`shared/` contains serializable types, validation, feature status, version, and official contact configuration. It contains no secrets. `cloud/` owns email credentials and abuse controls. The renderer never receives arbitrary filesystem, shell, networking, or generic IPC capabilities. [Electron sandbox documentation](https://www.electronjs.org/docs/latest/tutorial/sandbox/) explains the foundation.

## Current LAN contract

mDNS service: `_dropbeam._tcp.local`, protocol version `1`, TXT fields `id`, `name`, `platform`, and `capability=presence-only`. IDs are ephemeral each run, not persistent trusted identities. The advertised ephemeral TCP port immediately closes connections; it cannot receive transfers or access files.

The browser filters protocol/self, validates names, caps visible peers at 100 and the library browser at 200 services, refreshes every 30 seconds, and expires stale observations after 90 seconds. Goodbye packets remove peers sooner. A service advertisement can be spoofed, so discovery never conveys trust. This is presence discovery, not pairing. Actual multicast discovery has not passed the local smoke test yet; it remains experimental.

Selection creates an in-memory manifest of portable relative paths, byte counts, and SHA-256 digests. Reads use 256 KiB stream buffers. There is a 10,000-entry/32-level selection ceiling, no implied worldwide size guarantee, and no transfer progress. Symlinks, special files, empty-only folders, unsafe paths, reserved Windows names, and case/Unicode-normalization collisions are rejected. Empty directories inside a nonempty tree are not represented yet.

## Next transfer milestone (not implemented)

1. Define a versioned, bounded offer manifest and transfer state machine: offered → accepted/rejected → streaming → verifying → completed/cancelled/failed.
2. Establish encrypted transport with maintained TLS/cryptographic libraries and explicit device verification/pairing. Discovery keys/fingerprints alone must not establish trust.
3. Require native receiver approval and destination permission. Validate every relative path, reject symlink/reparse-point escapes, reserve files exclusively, and write into staging paths without overwriting existing data.
4. Stream bounded chunks with backpressure and cancellation. Compare receiver hashes to the authenticated offer before atomic finalization. Handle source mutation, truncated streams, disk-full conditions, and interrupted writes.
5. Show progress only from actual bytes transferred. Add speed/ETA only when meaningful. Keep pause/resume absent until a persisted chunk ledger is implemented.
6. Test real macOS-to-macOS and macOS-to-Windows transfers under disconnects, malicious offers, overwrites, and cancellation before calling LAN delivery working.

Later: chunk retry/resume, durable local history/queues, OS notifications, text/link sharing, accounts for optional remote coordination, trusted remote devices, Quick Send, Transfer Rooms, and optional compression. Never require a whole-file archive or load a 100 GB file into RAM. Worldwide relay use must be disclosed accurately. The 100 GB target needs implementation and scale testing.

## Settings status

Working: system/light/dark theme, Big Text, reduced motion (including OS preference), compact mode, Comic Sans Bold with fallback font, sparkle styling, Serious Mode, local celebrations and preview, device name, discovery preference. The mDNS implementation still needs successful network validation.

Planned: rainbow transfer progress, GIF celebrations, completion sound, notifications, avatars, receive location and approval policy, duplicate-name behavior, concurrency, Premium themes and activation. These are described as planned, not exposed as apparently functional toggles. Serious Mode suppresses playful fonts, star ornaments, and local celebrations.
