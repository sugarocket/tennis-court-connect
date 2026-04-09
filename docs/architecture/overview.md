# 🏗️ Architecture Overview

## TennisCourtConnect

> High-level system design, tech stack options, and data models.

---

## 1. System Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│   ┌───────────┐   ┌───────────┐   ┌─────────────────────┐   │
│   │ Web App   │   │ Mobile App│   │ Admin Dashboard     │   │
│   │ (Next.js) │   │ (RN/Flutter)│ │ (Retool/Supabase)   │   │
│   └─────┬─────┘   └─────┬─────┘   └──────────┬──────────┘   │
└─────────┼───────────────┼────────────────────┼──────────────┘
          │               │                    │
          └───────────────┴────────────────────┘
                          │
                    ┌─────▼─────┐
                    │   API     │
                    │  Gateway  │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Supabase│      │  Auth   │      │ Realtime│
    │  (DB)   │      │ (Clerk/ │      │ (WS)    │
    │         │      │Supabase)│      │         │
    └─────────┘      └─────────┘      └─────────┘
         │
         ▼
    ┌─────────────┐
    │   Storage   │  (avatars, images)
    └─────────────┘
```

---

## 2. Tech Stack Options

### Option A: Vibe-Coding Stack (Recommended for Fast Start)
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js + Tailwind + shadcn/ui | Fast dev, great DX, SSR/SSG |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) | Zero-config, real-time, built-in auth |
| Maps | Leaflet (free) or Google Maps | Leaflet = no API key needed initially |
| Deploy | Vercel (frontend) + Supabase (backend) | One-click deploys |
| Notifications | Supabase Edge Functions + Web Push | Or OneSignal later |

### Option B: Full-Stack Custom
| Layer | Choice |
|-------|--------|
| Frontend | React + Vite or Next.js |
| Backend | FastAPI (Python) or Express (Node) |
| DB | PostgreSQL + Prisma ORM |
| Auth | Clerk or NextAuth + JWT |
| Realtime | Socket.io or Pusher |
| Deploy | Railway / Render / Fly.io |

### Option C: Mobile-First
| Layer | Choice |
|-------|--------|
| App | React Native (Expo) or Flutter |
| Backend | Firebase (Auth, Firestore, Functions) |
| Realtime | Firebase Realtime DB |
| Maps | react-native-maps |

> **Recommendation**: Start with **Option A (Supabase + Next.js)**. You can always swap layers later.

---

## 3. Database Schema (Prisma-style)

```prisma
// Core entities

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  avatarUrl     String?
  bio           String?
  skillLevel    Float?   // UTR or 1-10 self-rating
  location      String?
  lat           Float?
  lng           Float?
  availability  Json?    // { "mon": ["18:00-20:00"], ... }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  bookings      Booking[]
  matchesAsP1   Match[]  @relation("Player1")
  matchesAsP2   Match[]  @relation("Player2")
  eventsHosted  Event[]
  eventSignups  EventSignup[]
  gamePosts     LookingForGame[]
}

model Court {
  id          String      @id @default(uuid())
  name        String
  type        CourtType   // PUBLIC, CLUB, PRIVATE
  address     String
  lat         Float
  lng         Float
  surface     String?     // hard, clay, grass, etc.
  lights      Boolean     @default(false)
  status      CourtStatus // OPEN, BUSY, MAINTENANCE, CLOSED
  lastUpdated DateTime    @updatedAt
  clubId      String?     // optional club reference
  createdAt   DateTime    @default(now())

  bookings    Booking[]
}

model Booking {
  id        String        @id @default(uuid())
  courtId   String
  userId    String
  startTime DateTime
  endTime   DateTime
  status    BookingStatus // CONFIRMED, CANCELLED, COMPLETED
  notes     String?
  createdAt DateTime      @default(now())

  court     Court         @relation(fields: [courtId], references: [id])
  user      User          @relation(fields: [userId], references: [id])
}

model Match {
  id          String   @id @default(uuid())
  player1Id   String
  player2Id   String
  courtId     String?
  score       String?  // e.g., "6-4, 3-6, 6-2"
  result      MatchResult? // PLAYER1_WIN, PLAYER2_WIN, DRAW
  utrDeltaP1  Float?
  utrDeltaP2  Float?
  playedAt    DateTime
  createdAt   DateTime @default(now())

  player1     User     @relation("Player1", fields: [player1Id], references: [id])
  player2     User     @relation("Player2", fields: [player2Id], references: [id])
  court       Court?   @relation(fields: [courtId], references: [id])
}

model Event {
  id          String    @id @default(uuid())
  title       String
  type        EventType // LEAGUE, TOURNAMENT, SOCIAL, CLINIC
  hostId      String
  courtId     String?
  startTime   DateTime
  endTime     DateTime?
  capacity    Int
  skillMin    Float?
  skillMax    Float?
  price       Float?    // 0 = free
  description String?
  status      EventStatus // OPEN, FULL, COMPLETED, CANCELLED
  createdAt   DateTime  @default(now())

  host        User      @relation(fields: [hostId], references: [id])
  court       Court?    @relation(fields: [courtId], references: [id])
  signups     EventSignup[]
}

model EventSignup {
  id        String        @id @default(uuid())
  eventId   String
  userId    String
  status    SignupStatus  // CONFIRMED, WAITLIST, CANCELLED
  createdAt DateTime      @default(now())

  event     Event         @relation(fields: [eventId], references: [id])
  user      User          @relation(fields: [userId], references: [id])
}

model LookingForGame {
  id          String   @id @default(uuid())
  userId      String
  timeWindow  DateTime // when they want to play
  location    String?
  lat         Float?
  lng         Float?
  skillRange  String?  // "any", "similar", "challenging"
  needed      Int      @default(1) // players needed
  message     String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
}

// Enums

enum CourtType {
  PUBLIC
  CLUB
  PRIVATE
}

enum CourtStatus {
  OPEN
  BUSY
  MAINTENANCE
  CLOSED
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum EventType {
  LEAGUE
  TOURNAMENT
  SOCIAL
  CLINIC
}

enum EventStatus {
  OPEN
  FULL
  COMPLETED
  CANCELLED
}

enum SignupStatus {
  CONFIRMED
  WAITLIST
  CANCELLED
}

enum MatchResult {
  PLAYER1_WIN
  PLAYER2_WIN
  DRAW
}
```

---

## 4. API / Data Access

| Entity | Operations |
|--------|------------|
| Users | Create, Get profile, Update skill/availability |
| Courts | List (with filters), Update status, Get nearby |
| Bookings | Create, List my bookings, Cancel |
| Matches | Create (post result), List history |
| Events | Create, List, RSVP, Get details |
| LookingForGame | Post, Browse nearby, Delete (expire) |

**Realtime Subscriptions** (via Supabase):
- Court status changes → push to map
- New "looking for game" posts → notify nearby users
- Event signups → update capacity

---

## 5. Folder Structure (Code)

```
frontend/
  app/                 # Next.js app router pages
  components/          # UI components
  lib/                 # Supabase client, utils
  hooks/               # Custom React hooks

backend/               # Only if NOT using Supabase
  api/
  services/
  models/

shared/
  types/               # Shared TypeScript types
  utils/               # Common helpers
  constants/           # Enums, config

scripts/
  seed.ts              # Mock data seeder
  migrate.ts           # DB migrations if custom
```

---

## 6. Key Integrations

| Service | Purpose |
|---------|---------|
| Supabase Auth | Email/password, Google, Apple |
| Supabase Realtime | Live court status, chat |
| Leaflet / Google Maps | Court & player locations |
| (Optional) Stripe | Paid clinics/events |
| (Optional) OneSignal | Push notifications |

---

## 7. Security Considerations

- Row Level Security (RLS) on Supabase: users can only edit their own data
- Public courts readable by all; club courts require membership check
- Rate-limit booking creation to prevent spam
- Validate skill levels (0-10 range)

---

## 8. Next Steps

1. [ ] Choose stack (recommend: Next.js + Supabase)
2. [ ] Scaffold frontend in `/frontend`
3. [ ] Set up Supabase project + DB schema
4. [ ] Implement auth + profile
5. [ ] Build court list + status update
6. [ ] Iterate from there!

---

**Last Updated**: 2026-04-08
