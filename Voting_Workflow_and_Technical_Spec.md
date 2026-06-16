# Districts After Dark: Voting Workflow & Technical Specification

## 1. Global Launch (The "Press Release" Trigger)
Instead of a rolling start for voting, **voting opens simultaneously for all five districts** the moment the central office issues the official press release announcing the summer series.
* **Manual Trigger:** An admin will update a global Firebase remote config or a master `settings` document in Firestore (`settings/global: { votingOpen: true }`) to instantly activate the "Round 1" voting interface across all district pages (`district-a.html` through `district-e.html`).
* **Pre-Launch State:** Before the trigger, all district pages display the `pre-voting` state with instructions and a generic "Coming Soon" or "Awaiting Press Release" message instead of a strict countdown.

## 2. Authentication & Data Structure
To ensure integrity and prevent botting, all users must be authenticated via **Email** to cast a vote. We will use Firebase Authentication (Email/Password or Email Link).

### Firebase Collections:
* **`users` Collection:** Stores user profiles.
  * `uid`: String
  * `email`: String
  * `votes`: Map `{ 'A': 'venue_id_1', 'B': 'venue_id_7' }` (Tracks which venue the user voted for in each district to prevent double-voting).
* **`venues` Collection:** Stores the nominees.
  * `id`: String
  * `district`: String ('A', 'B', etc.)
  * `name`: String
  * `voteCount`: Number (Incremented securely via Firestore `increment()` when a vote is cast).
  * `optOutRunoff`: Boolean (Defaults to false. Admins can set to true if a top venue declines to host the event).

## 3. How Users Vote (Two Paths)
Once authenticated, a user can cast their vote in a frictionless way from two locations on the district page:
1. **The Map Marker Popup:** Clicking a numbered marker on the Leaflet map opens a popup with the venue's details and a "Vote for this Venue" radio button/action button.
2. **The List View / Leaderboard:** Below the map, users can scroll the paginated list of all nominees (or the leaderboard) and click the "VOTE" button directly on the venue card.
*Both methods trigger the same Firebase transaction and open the "I Voted!" share screen.*

## 4. The Run-Off Phase (Top 5)
The sprawling initial list of nominees needs to be narrowed down to build hype.
* **The Trigger:** On the **Monday of the week prior** to a specific district's event at **3:00 PM**, that district's voting shifts into the Run-Off phase.
* **The Mechanics:** The top 5 venues with the highest `voteCount` advance. The UI switches to the `run-off` state, displaying only those 5 venues in a high-stakes leaderboard.
* **The Opt-Out:** Before 3:00 PM, the campaign team contacts the top 5 venues. If a venue cannot or does not want to host the final stop, an admin sets their `optOutRunoff` flag to `true` in Firebase, allowing the 6th place venue to slide into the Top 5.

## 5. Post-Election (The Winner)
Voting closes 48 hours before the event. The district page updates to the `post-election` state.
* The winning venue is highlighted with a massive "WINNER" badge.
* The primary call-to-action shifts entirely to **"RSVP NOW"** for the event.
* The map and lists are locked in a read-only state.