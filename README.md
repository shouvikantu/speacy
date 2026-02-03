# Speacy Realtime Tutor Prototype

This is a minimal Next.js prototype that connects to OpenAI Realtime via WebRTC,
logs raw events, and displays student transcripts.

## Setup

1. Create a `.env.local` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
TEACHER_PASSWORD=change-me
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. Install dependencies and run the dev server:

```
npm install
npm run dev
```

3. Visit `http://localhost:3000` and start a session.

## Database storage

Realtime events and reports are now stored in Supabase Postgres. Create the tables
using `supabase/schema.sql` in the Supabase SQL editor.

## Backfill old local data

If you have legacy JSONL/JSON files in `data/`, you can backfill them into Supabase:

```
node scripts/backfill-supabase.mjs
```

## Teacher Dashboard

Visit `/teacher`, enter the `TEACHER_PASSWORD`, and browse reports by session ID.

## Supabase Auth

- Login: `/auth/login`
- Register: `/auth/register`
- Confirm link: `/auth/confirm`
- Instructor dashboard: `/dashboard`
