# Security and privacy boundaries

This is an early development build, not a security certification.

- Sandboxed renderer, context isolation, no Node integration, no arbitrary window opening/navigation, denied renderer permission requests, and a restrictive production Content Security Policy.
- Every IPC request checks the owning webContents, main frame, and exact app URL. Inputs are validated again in the native process. Packaged apps ignore development URLs and test profile overrides.
- Native file paths come only from an OS chooser. The renderer gets relative manifest metadata, not unrestricted filesystem access. File hashing uses no-follow where supported and rejects detectable source changes. A future sender must revalidate/stage source files and address directory-swap races before delivery; today's manifest is not an authenticated transfer.
- No receiver is implemented, so no incoming service can write to disk. The presence-only TCP port immediately closes connections, and discoverability is opt-in.
- Device advertisements are untrusted. Names are text-rendered, validated, and replaced with “Unknown Device” if invalid. Network discovery can still be blocked or spoofed; it is not authorization.
- Secrets remain backend-only. Root `.env*` and backend `.dev.vars*` are ignored except placeholder examples. Frontend `VITE_*` values are public and must never contain secrets. Wrangling build output, logs, temporary screenshots, and local state are ignored.
- Premium API accepts only a name and UUID, with a 1 KiB streaming body cap, no browser origins, fixed recipient/content, provider timeouts, no redirects, durable attempt reservation, and safe responses. Daily global limits bound outbound email but can be exhausted by an attacker. Add rollout-specific abuse controls before public deployment.
- No file contents go to Cloud, Gmail, or GIPHY. Premium requests send only their validated fields; Cloud sees a connecting IP for limits. Names appear in the outgoing email. Daily source/name hashes are pseudonymous, not anonymous.
- No app analytics, cloud logging, or GIPHY requests are enabled. Local dev tooling may print request status; never log request bodies or OAuth credentials.

Tests use obvious fake credential fixtures; no live email is sent by the automated suite. Avoid collecting real secrets into test artifacts or terminal transcripts. Run `npm audit` periodically, and review dependency changes rather than applying forced upgrades indiscriminately.

Before distribution: independently review transport design, test OS permission boundaries and large files, verify Windows behavior, configure signing/notarization, and decide an update strategy. Report suspected vulnerabilities privately to the official project contact in `shared/config.ts`; avoid publicly sharing credentials or exploit data involving other users.
