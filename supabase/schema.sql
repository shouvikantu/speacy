create extension if not exists "pgcrypto";

create table if not exists realtime_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid null,
  direction text not null,
  event jsonb not null,
  ts bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists realtime_events_session_id_idx on realtime_events (session_id);
create index if not exists realtime_events_ts_idx on realtime_events (ts);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  user_id uuid null,
  student_name text,
  student_email text,
  assessment jsonb,
  transcript jsonb,
  report jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists reports_session_id_idx on reports (session_id);
create index if not exists reports_generated_at_idx on reports (generated_at);
