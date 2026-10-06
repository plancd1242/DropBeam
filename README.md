# DropBeam ⚡

**Pick it. Pick a computer. Beam it.**

DropBeam is an early desktop file-sharing project for macOS and Windows. The goal is friendly, direct local-network transfers without an account, with free Premium features for more ambitious workflows later.

**Version: `0.1.0-beta.1`. This is a development milestone, not a transfer-ready release. No files can be sent or received yet.**

## Try it locally

Requirements: Node.js 22.12+ and npm. Development has been exercised on macOS Apple Silicon; Windows packaging and behavior still need validation. Rust is not required.

```sh
npm ci
npm run dev:all
```

This starts a native Electron window, a loopback-only Vite frontend, and a **local** Cloudflare Worker. It does not log in or deploy. The terminal prints the actual URLs after startup. Preferred ports are **5173** for the frontend and **8787** for the Worker. Occupied ports are skipped; use the printed ports. The browser view is a labeled UI preview; native file pickers and discovery require the desktop window.

Other entry points:

| Command                  | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `npm run dev`            | Native desktop + frontend, without starting Cloud                          |
| `npm run dev:ui`         | Browser UI preview only                                                    |
| `npm run dev:cloud`      | Local Worker only, available port selected automatically                   |
| `npm run test`           | Unit, API, native preparation, and UI tests                                |
| `npm run lint`           | ESLint                                                                     |
| `npm run typecheck`      | Desktop, UI, and Worker TypeScript                                         |
| `npm run build`          | Production UI assets + Electron main/preload bundles                       |
| `npm run build:cloud`    | Wrangler **dry-run bundle only**; no deployment                            |
| `npm run test:desktop`   | Real Electron smoke test; run `build` first                                |
| `npm run test:discovery` | Two real mDNS instances on this machine; may need local-network permission |
| `npm run package`        | Local unpacked desktop app; not a release, upload, or notarization         |
| `npm run format`         | Format project source                                                      |
| `npm run format:check`   | Check formatting                                                           |

Press Ctrl+C in the launching terminal to stop a development session. Closing the native window leaves the frontend and local backend running. UI edits hot-reload; restart after changing native code. See [development notes](docs/DEVELOPMENT.md) for ports, configuration, and troubleshooting.

## What works today

- ✅ Native desktop shell with Home, Send, Receive, Devices, Transfers, Settings, and Premium comparison.
- ✅ Native file/folder selection and streamed SHA-256 manifests, file counts, and byte totals. Contents are read locally; they are not uploaded or copied.
- 🚧 Real, opt-in `_dropbeam._tcp` mDNS presence code is implemented. The local multicast smoke test timed out on the development machine, so discovery is experimental and not yet validated. Only DropBeam records are displayed; devices remain unverified. Physical two-computer testing remains necessary.
- ✅ Persistent validated preferences: system/light/dark, Big Text, reduced motion, compact mode, Comic Sans Bold, sparkle styling, Super Serious Business Mode, local celebration preview, device name, and discovery.
- ✅ Centralized Free/Premium feature definitions, name validation, exact email preview, and safe submission flow.
- ✅ Local Worker health/API routes, fixed-recipient Gmail OAuth adapter, strict schema/body limits, persistent Durable Object request limiting and duplicate protection. **Real delivery requires maintainer credentials and a configured service.**

## What does not work yet

- 🚧 LAN file delivery, receive approval, destination selection, receiver-side integrity checks, and live progress.
- 🚧 Premium approval/entitlement delivery and switching active editions. The app remains Free; sending a request never unlocks features.
- 🚧 Signed/notarized distribution, Windows verification, platform notifications, and device avatars.
- 🗺️ Worldwide transfers, resume, chunk retry, favorites, history, queues, shared clipboard, text/link sharing, QR pairing, Transfer Rooms, Quick Send/Finder/Explorer integration, and optional GIPHY.
- 🗺️ The **100 GB worldwide limit is a design target**, not a tested or implemented capability.

Empty screens and planned settings are labeled; there are no invented devices, progress bars, transfer records, or email confirmations.

## Free and Premium

Both editions cost **$0.00 forever**. Premium is a feature grouping for the project's future remote and advanced workflows, not a subscription. There is no checkout, trial, credit-card flow, or billing integration. Basic LAN functionality will not require an account.

Free targets local files/folders, receiver approval, integrity checks, and everyday settings. Premium adds future worldwide coordination and advanced workflows. See the in-app comparison for implementation status, rather than interpreting an inclusion check as proof of a working feature.

## Premium requests and DropBeam Cloud

The official project email is **dropbeam1242@gmail.com**, centralized in `shared/config.ts`.

The desktop sends only `{ name, requestId }` to `/v1/premium-requests`. The Worker validates it, reserves a request allowance, obtains an OAuth access token server-side, and calls Gmail's send API. A normal Google API key cannot authorize sending. Users never need a Google account, password, API key, or email client.

Without backend credentials the endpoint returns **503**, and the UI never displays a sent confirmation. Gmail acceptance is not proof of inbox delivery. The name-only request does not provide a return address or an account identity: approval delivery remains a separate future design.

[Cloud setup and API](docs/CLOUD.md) · [Security model](docs/SECURITY.md)

## Environment and secrets

No configuration is required for offline file preparation and settings. To connect Cloud separately, copy `.env.example` to ignored `.env` and configure only public desktop values. The combined launcher automatically uses its local Worker unless a public API URL is explicitly configured.

Backend secrets belong only in ignored `cloud/.dev.vars` for local development or Worker secrets for a future human-controlled deployment. Copy `cloud/.dev.vars.example` for variable names. Never put secrets in `VITE_*`, `.env.example`, frontend code, or packaged resources. No credentials are included in this repository.

## Architecture

Electron + React + TypeScript was selected after finding Node installed and Rust absent. It provides an immediately testable macOS/Windows desktop foundation, native dialogs, and Node streaming/networking. It has a larger footprint than Tauri; minimizing that footprint and reassessing the runtime remain possible later.

The renderer has no Node access. A sandboxed, context-isolated preload exposes a narrow typed bridge; native commands validate both caller and input. UI, native filesystem preparation, mDNS, Cloud communication, shared schemas, and Worker credentials are separate modules. [Architecture and roadmap](docs/ARCHITECTURE.md) describes the intended secure transport.

## Privacy

No accounts, analytics SDK, or third-party media requests are used by the app. Opting into discovery exposes the configured device name, platform, ephemeral instance ID, and presence port on the LAN. Files and manifests stay on this computer. Premium submission sends the entered name and request ID to Cloud/Gmail; the backend also uses the connecting IP for request limiting. It stores daily hashes for abuse controls, not file contents.

GIPHY is disabled. Local SVG/CSS animation is the offline fallback. Future relay-based worldwide transfers must disclose that relay architecture accurately.

## Contributing and releases

Use the checks above and keep changes accurately labeled. Follow Semantic Versioning; the current version remains `0.1.0-beta.1`. Do not release until real transfers and platform testing support a release claim. The human owner controls commits, pushes, tags, releases, and deployments. This build workflow performs none of them.

Licensed under [MIT](LICENSE).
