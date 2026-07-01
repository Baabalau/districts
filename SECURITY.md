# Security Model & Rules

How access to Firestore and Cloud Storage is controlled for Districts After Dark,
what the current rules enforce, and the hardening still to come.

## Files

| File | Purpose |
|---|---|
| `firestore.rules` | Firestore security rules (deployed). |
| `storage.rules` | Cloud Storage security rules (deployed). |
| `firebase.json` | Registers both rule files for `firebase deploy`. |
| `cors.json` | Storage bucket CORS (applied separately via `gsutil`, see below). |

## Deploying the rules

Rules are **not** live until deployed. From the project root, using an
authenticated Firebase CLI (the account must have access to the
`districts-after-dark` project):

```bash
# One-time, if the CLI isn't installed:
npm install -g firebase-tools
firebase login

# Deploy both rule sets:
firebase deploy --only firestore:rules,storage
```

CORS is applied separately (it is not part of `firebase deploy`):

```bash
gsutil cors set cors.json gs://districts-after-dark.firebasestorage.app
```

> Note: `cors.json` currently lists the two canonical Firebase Hosting domains
> (`districts-after-dark.web.app` and `districts-after-dark.firebaseapp.com`). If
> the site is served from a custom domain, add it to `origin` before applying, or
> Storage uploads/downloads from that domain will be blocked.

### Verifying after deploy

Signed in as a normal user, confirm these still work: cast a vote, check in with a
photo, edit your profile. Then confirm a non-admin is blocked (permission-denied)
from editing `settings/schedule` or another user's `users/{uid}` doc. Finally,
confirm the admin dashboard can still save the schedule, ban a user, and
invalidate a vote/check-in.

## What the rules enforce today (Phase 1)

Admin is identified by email in the rules
(`request.auth.token.email == 'robhenigbell@gmail.com'`). Rules files are never
shipped to the browser, so this does not undo the client-side email hashing in
`js/admin-auth.js`.

| Collection / path | Read | Write |
|---|---|---|
| `users/{uid}` | Public (see note) | Create/update only by that same uid; a normal user cannot set their own `isBanned`; admin full; delete admin-only. |
| `venues/{venueId}` | Public | Signed-in users may change **only** `voteCount`, by exactly `+1`; everything else (create, delete, `visitCount`, `optOutRunoff`, name, ...) is admin-only. |
| `venues/{id}/customers/{uid}` | Public (see note) | Create/update only by that uid; delete admin-only. |
| `venues/{id}/votes/{uid}` | Admin-only | Create only by that uid; no update; delete admin-only. |
| `settings/{doc}` | Public | Admin-only. |
| anything else | Denied | Denied (catch-all `if false`). |

Storage:

| Path | Read | Write |
|---|---|---|
| `checkins/{venueId}/{file}` | Public | Signed-in + `image/*` + under 10 MB. |
| `promo_graphics/{file}` | Public | `image/*` + under 10 MB (anonymous allowed - the promote page has no login gate). |
| anything else | Denied | Denied. |

This closes every dangerous write that the old `allow read, write: if true` rules
left open (schedule tampering, arbitrary vote counts, venue deletion, banning
others, overwriting other users' profiles/points, unrestricted uploads).

## Known residual risks (Phase 2 - deferred)

These cannot be fully closed with rules alone and are intentionally left for a
follow-up that involves a small amount of code:

1. **Email / PII is still publicly readable.** `users` and `customers` documents
   contain `email`, and reads are kept public because live features read across
   users: the `district-leaderboard` (`js/leaderboard.js`) reads all `users`, and
   the Local Legends wall (`js/event-components.js`) reads all `customers` via a
   `collectionGroup` query. Firestore reads are all-or-nothing per document, so
   the field cannot be hidden while the doc stays readable.
   - **Fix:** split public fields (`displayName`, `totalPoints`, photo URL) into a
     dedicated public collection (e.g. `publicProfiles/{uid}`) and keep
     `email`/PII in a private doc locked to self+admin; point the leaderboard and
     legends wall at the public collection.
   - **Cheap interim step:** stop writing `email` into `users`/`customers` going
     forward (~3 small edits in `js/auth.js`, `login.html`, `checkin.html`), and
     backfill-remove existing `email` fields.

2. **Vote and points integrity.** A signed-in user can still repeatedly send
   `voteCount += 1` to a venue (ballot-stuffing) or self-edit their own
   `totalPoints`/`unlockedPromos`, because these are client writes to shared/owned
   documents. Rules can bound the shape (auth required, `+1` only, own doc only)
   but cannot enforce one-vote-per-user or server-authoritative scoring.
   - **Fix:** move vote submission and points awards to a Cloud Function /
     callable that validates (checks the user's existing votes, applies the award
     server-side) and performs the privileged write. Phase 1 already makes all of
     this authenticated and therefore attributable and bannable, which is the
     meaningful near-term mitigation.

3. **Admin identified by email.** Works and needs zero setup, but rotating the
   admin means editing the rules. Consider a custom auth claim (`admin: true`) set
   via the Admin SDK / `gcloud`, then check `request.auth.token.admin == true` in
   rules.
