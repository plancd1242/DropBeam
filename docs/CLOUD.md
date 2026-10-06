# DropBeam Cloud

The Worker is **local only until the human chooses to deploy**. No account login, DNS changes, paid-resource creation, or deployment is part of this milestone.

## Local setup

Run `npm run dev:cloud`, or `npm run dev:all` to include the desktop. Use the printed port. `GET /health` returns a service identifier without credentials. `/v1/premium-requests` is usable only from a non-browser client such as the Electron main process; no permissive CORS headers are returned.

To enable real email locally, the maintainer must obtain officially authorized Gmail OAuth credentials with the `gmail.send` scope, enable Gmail API in their own Google project, and configure the ignored `cloud/.dev.vars` file. The OAuth account must authorize the sender address. A Google API key alone is insufficient. Never paste tokens into chat or commit them.

Required backend variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `EMAIL_FROM_ADDRESS`

The recipient is a code constant, `CONTACT_EMAIL`, not a client-controlled argument or an arbitrary environment override. The cloud code generates the exact approved plain-text request; it never accepts a subject, body, recipients, attachments, or HTML.

There is deliberately no automatic Gmail OAuth setup or account connection on the user's computer. Future deployment and credential configuration remain human-controlled. For reference: [Gmail send API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send), [server-side OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server), and [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/).

## API

| Route                       | Behavior                                                |
| --------------------------- | ------------------------------------------------------- |
| `GET /health`               | 200, service name and protocol version; no secrets      |
| `POST /v1/premium-requests` | Strict `{name, requestId}` JSON with UUID request ID    |
| `/v1/gifs`                  | 501, explicit coming-soon response; no upstream request |

Names use 1–60 characters after trimming, permitting letters, combining marks, spaces, apostrophes, and hyphens. Streaming body reads stop at 1,024 bytes even without Content-Length. Invalid schema is 400, an explicitly oversized body is 413, wrong content type 415, browser Origin 403, wrong method 405, and unknown route 404.

A single SQLite-backed Durable Object transaction enforces 3 attempts per source per UTC day and 100 globally per UTC day, with duplicate request-ID and normalized-name reservation. The object is accessed only by a Worker binding, not a public route. Daily hashes of names/IPs minimize retained plaintext but are **not anonymization**. Records expire via a 48-hour alarm when idle, or are replaced at the next day's request. People with the same name can hit duplicate protection; this conservative first-milestone limitation needs an account-aware design later.

Reservation occurs before provider contact. On ambiguous failures, attempts stay reserved so a timeout cannot immediately generate duplicate email. A duplicate response **does not imply delivery succeeded**. A 429 means the daily limit was reached. A 503 means configuration, rate-service, or provider failure; no upstream body, OAuth token, or credential is returned. A 201 is emitted only after Gmail accepts the send call, not proof of inbox arrival.

The global cap bounds outbound volume; it is not comprehensive bot prevention. Origin checks are not authentication. A malicious client can consume the cap, so public rollout still needs a challenge/attestation or other abuse strategy and operational monitoring.

## Future GIF adapter

The intended adapter exposes only bounded GIF search/trending results, with explicit query length/result count/rating constraints, fixed GIPHY endpoints, safe response projection, rate limits, and required attribution. It must not forward arbitrary URLs, headers, file data, or credentials. The `GIPHY_API_KEY` remains a future backend-only variable; it is not required or read today. The current local celebration component works offline and requires no media service.
