# 📋 Product Requirements Document (PRD)

## TennisCourtConnect

> A community-first tennis platform for booking courts, finding players, hosting events, and tracking your game.

---

## 1. Problem Statement

Tennis players today face several pain points:
- **Court availability is opaque** — No real-time way to know if a public court is free
- **Finding a game is hard** — Especially for solo players without a regular partner
- **Skill mismatch** — Casual players and competitive players rarely connect well
- **Event discovery is fragmented** — Clinics, leagues, and tournaments are spread across email lists, Facebook groups, and club bulletin boards
- **UTR/rating system is underutilized** — Most casual players don't know their level

**Goal**: Build a single app that solves all of the above with a delightful, social, "just works" experience.

---

## 2. Target Users

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| 🎾 Casual Player | Plays 1-3x/month, flexible schedule | Find courts, find partners, casual games |
| 🏆 Competitive Player | Plays often, cares about UTR/rating | Matchmaking, leagues, tournaments |
| 🧑‍🏫 Coach/Instructor | Runs lessons, clinics | Post sessions, manage signups |
| 🏟️ Club Admin | Manages club facilities | Court bookings, member management |
| 🏙️ City/Rec Dept | Public court operator | Status visibility, maintenance alerts |

---

## 3. Core Features (MVP)

### 3.1 Court Discovery & Booking
- **Public Courts Map/List**: View nearby courts with live status
- **Status Updates**: Players can mark "in use" / "free" / "maintenance"
- **Club Courts**: View available slots, book with member credentials
- **Filters**: By time, location, surface type, lighting

### 3.2 Course & Session Posting
- Coaches post: group lessons, private sessions, clinics
- Players browse and sign up
- Calendar view of upcoming sessions

### 3.3 UTR-Style Matchmaking
- Players have a skill rating (self-reported initially, verified over time)
- "Quick Match": Find players within ±0.5 UTR
- "Casual Match": Wider range for fun/social games
- Match history & win-loss tracking

### 3.4 Leagues & Events
- Host or join:
  - Round-robin leagues
  - Single-elimination tournaments
  - Social mixers / ladder challenges
- Auto-generate brackets, track scores
- RSVP + waitlist

### 3.5 "Looking for a Game" Board
- Post: "Need 1 more for doubles at 6pm"
- Browse nearby open games
- Instant notifications for matches

### 3.6 Player Profiles
- Photo, bio, play style, availability
- UTR, match history, reviews from partners
- Favorite courts

---

## 4. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| ⚡ Performance | Pages load < 2s; real-time updates < 500ms |
| 📱 Mobile-first | Fully usable on phone; responsive web |
| 🔐 Security | Auth via email/SSO; no PII leaks |
| 🗺️ Location | Accurate geolocation for courts & players |
| 🔔 Notifications | Push for bookings, game matches, event updates |

---

## 5. User Stories (MVP)

- As a player, I want to see which public courts are free right now so I can walk over and play.
- As a solo player, I want to post "looking for a game" and get notified when someone responds.
- As a coach, I want to post my weekly clinic and have players sign up directly.
- As a competitive player, I want to join a ladder league and track my UTR.
- As a club member, I want to book a court through the app instead of calling.

---

## 6. Out of Scope (Post-MVP / Stretch)

- Payment processing (for now, handle externally)
- Video highlights / match recording
- AI coaching / analytics
- Multi-language support
- Wearable / IoT court sensors

---

## 7. Success Metrics (MVP)

- 100+ registered users in first month
- 50+ court status updates per week
- 20+ games arranged via "looking for a game"
- 5+ events hosted per month
- 4.0+ average app store rating (when published)

---

## 8. Timeline (Suggested)

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| Week 1 | Setup + Auth + Court List | Working app skeleton |
| Week 2 | Booking + Status Updates | Book a court, mark status |
| Week 3 | Player Matching + Profiles | Find a game, view profile |
| Week 4 | Events + Leagues | Create & RSVP to events |
| Week 5 | Polish + Testing | Bug fixes, mobile UX, deploy |

---

## 9. Open Questions

- [ ] Do we support payment for paid clinics? (Stripe integration?)
- [ ] How do we verify UTR/ratings? (Manual, peer-confirmed, API?)
- [ ] Should club admins have a separate dashboard?

---

**Last Updated**: 2026-04-08  
**Status**: Draft — ready for vibe-coding!
