# Event Page State Management

How the **Crawl-tinery** and **Local Legends** sections on each district event page
(`district-a.html` … `district-e.html`) change over time, and how you control them.

Both features are driven from a single Firestore document — **`settings/schedule`** —
which is edited from the **Admin Dashboard → Schedule tab** (`dashboard.html`). The
event pages read this document once on load and render the correct state. No code
deploy is needed to change states; you just update the dashboard.

---

## 1. The control document: `settings/schedule`

One Firestore document holds a map field per district (`A`–`E`):

```
settings (collection)
  └─ schedule (document)
       ├─ A: { …fields below… }
       ├─ B: { … }
       ├─ C: { … }
       ├─ D: { … }
       └─ E: { … }
```

Fields inside each district map:

| Field | Type | Purpose |
|---|---|---|
| `roundOneStart` | timestamp | Informational; Round 1 is the default state. |
| `runOffStart` | timestamp | When the page flips to the **Run-Off** state. |
| `winnerAnnounce` | timestamp | When the page flips to **Post-Election** (winner). |
| `postEvent` | timestamp | When the page flips to **Post-Event** ("What a Night"). |
| `winnerId` | string | Venue doc ID of the official winner. |
| `influencerPickId` | string | Venue doc ID revealed as the influencer's Crawl-tinery stop. |
| `influencerPickBody` | string | Blurb for the influencer's revealed stop. |
| `councilPickId` | string | Venue doc ID revealed as the councilmember's Crawl-tinery stop. |
| `councilPickBody` | string | Blurb for the councilmember's revealed stop. |
| `localLegendsMode` | string | `"default"` or `"legends"` — the Local Legends board mode. |

The event page reads this doc in `EventLayout.applyElectionSchedule()`
(`js/event-components.js`). It is a **single read**, and the run-off state, the
Crawl-tinery reveal, the run-off countdown date, and the Local Legends mode all come
from it — so there are no extra reads for these features.

> **Note:** Saving in the dashboard writes the **entire** district map object. Any
> field left blank in the Schedule form is cleared on save, so fill in all the fields
> you want to keep for that district each time you save.

---

## 2. Crawl-tinery states

The Crawl-tinery (the 3-stop "night's itinerary" above the map) has **two rendered
variants**, both present in the DOM at all times and toggled with `display`:

- `#crawltinery-default` — the launch teaser (influencer stop, council stop, election).
- `#crawltinery-runoff` — reveals the two businesses the hosts selected.

### Election phases

`applyElectionSchedule()` compares `now` against the schedule timestamps and derives
one active phase (checked newest-first):

| Phase | Trigger | Voting module shown | Crawl-tinery shown |
|---|---|---|---|
| `round-1` | default (before `runOffStart`) | full nominee list + leaderboard | **default** teaser |
| `run-off` | `now ≥ runOffStart` | top-10 run-off leaderboard | **run-off** (picks revealed) |
| `post-election` | `now ≥ winnerAnnounce` | winner card (uses `winnerId`) | run-off (picks stay revealed) |
| `post-event` | `now ≥ postEvent` | "What a Night" thank-you | run-off (picks stay revealed) |

`window.setVotingState(phase)` applies a phase: it shows the matching
`#state-*` voting module, updates the map legend countdown label, and toggles the
Crawl-tinery variant. The host picks are considered "revealed" for every phase except
`round-1` (`picksRevealed = phase !== 'round-1'`).

### The revealed run-off cards

Each run-off card (`renderRevealCard`) is populated by
`populateRunoffCrawltinery()` from the schedule + the venue doc:

- **Heading, photo, website, map link** are pulled automatically from the venue
  document referenced by `influencerPickId` / `councilPickId` (`name`, `image`,
  `website`/`facebook`, and `openMapPopupForVenue`).
- **Body text** is the `influencerPickBody` / `councilPickBody` you type.

So to set up the reveal you only paste a venue ID and write a blurb per host.

### The run-off countdown date

The Election card (Stop 3) shows "A run-off of your top ten choices starts **[date]**".
`updateRunoffDateDisplay()` fills that in from `runOffStart` (formatted like
"Monday, August 4 at 3:00 PM"), or leaves "soon" if unset.

### To operate the Crawl-tinery

1. Dashboard → **Schedule** tab → pick the district.
2. Set `runOffStart`, `winnerAnnounce`, `postEvent`.
3. Fill in the **Crawl-tinery Run-Off Reveal** fields (both host venue IDs + blurbs).
4. Set the **Official Winner (Venue ID)** for the post-election winner card.
5. **Save Changes.** The page transitions automatically as each timestamp passes.

---

## 3. Local Legends states

The Local Legends photo wall (bottom of the event page) celebrates residents
participating in the program using the photos they submit at check-in. It has **two
modes**, controlled by `localLegendsMode`:

| Mode | Value | Shows |
|---|---|---|
| Default | `"default"` | Every recent check-in photo in the district (evidence of participation). Captioned with the venue name. |
| Legends Only | `"legends"` | Only photos from crawlers who reached **Legend status**. Captioned with the crawler's name + a ★ Legend badge. |

### Points model & Legend status

- Check-in (`checkin.html`) awards **50 points per first visit to a venue** (repeat
  visits within the loyalty window log a visit but award no points).
- A **Local Legend** has earned **500 points = 10 check-ins** across distinct venues.
- These thresholds live in `js/event-components.js` as
  `LEGEND_POINTS_THRESHOLD = 500` and `LEGEND_CHECKIN_COUNT = 10`. If you change the
  per-visit award in `checkin.html`, update these to match.

### Data sources (`initLocalLegends`)

1. Venues in the district — `venues where district == X` (id → name map).
2. Check-in photos — `collectionGroup("customers")`, filtered client-side to the
   district's venues, keeping docs that have an uploaded `photoUrl`.
3. Legend users — `users where totalPoints >= 500` (used only to filter for Legends
   mode).

Photos are cached once and sorted newest-first. Switching modes only re-filters and
re-renders (no new reads). Each mode has its own title/subtitle and a friendly empty
state when a district has no qualifying photos yet.

### To operate the Local Legends board

1. Dashboard → **Schedule** tab → pick the district.
2. Set **Local Legends Board → Board Mode** to *Default* or *Legends Only*.
3. **Save Changes.** The wall switches on the next page load.

---

## 4. Admin preview (testing out of public view)

Admin-only tooling lets you preview any state locally **without changing Firestore or
what the public sees**:

- **Admin gate:** the account is verified by `isAdminUser()` in `js/admin-auth.js`,
  which compares a SHA-256 hash of the signed-in email (the plaintext email is not in
  the source). This is UI-level gating only — real authorization must be enforced by
  Firestore security rules.
- **In-page toolbar** (`initAdminPreview`): visible only to the admin, pinned to the
  bottom of the event page. Buttons preview each election phase
  (`Round 1 · Run-Off · Winner · Post-Event`, plus **Reset to Live**) and the Local
  Legends modes (`Default · Legends Only`). These call `window.setVotingState()` /
  `window.setLocalLegendsMode()`, which only change the current browser tab.

Both setters are also exposed on `window` for console testing, e.g.:

```js
window.setVotingState('run-off');
window.setLocalLegendsMode('legends');
```

Because previews are local-only, you can stage a district's picks and mode ahead of
time (with `runOffStart` still in the future) and verify everything privately before
the public transition.

---

## 5. Quick reference — files

| File | Responsibility |
|---|---|
| `js/event-components.js` | Renders the event page; reads `settings/schedule`; drives Crawl-tinery + Local Legends states; admin preview toolbar. |
| `js/district-map.js` | Renders the map + venue markers; exposes `openMapPopupForVenue()`. |
| `js/admin-auth.js` | `isAdminUser()` hashed-email admin gate (shared). |
| `dashboard.html` | Admin control center; Schedule tab writes `settings/schedule`. |
| `checkin.html` | Check-in flow; writes check-in photos + awards points. |
| `data/event-pages/*.json` | Per-district static copy (hero, stops, host links). |
