# ⚙️ Backend

If you're using **Supabase**, this folder is mostly empty — Supabase handles DB, Auth, Realtime, Storage.

If you go custom (FastAPI, Express, etc.), put your server code here.

## Supabase Setup (Recommended)
1. Create a Supabase project at supabase.com
2. Copy your URL + anon key to `.env.local`
3. Run SQL schema from `docs/architecture/overview.md`
4. Enable Row Level Security (RLS)

## Custom Backend (Optional)
- `api/` — route handlers
- `services/` — business logic
- `models/` — Prisma or ORM models
- `migrations/` — DB migrations

> See root README and `docs/architecture/overview.md` for more.
