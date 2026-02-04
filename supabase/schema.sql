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
  transcript jsonb,
  psychometrician jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists reports_session_id_idx on reports (session_id);
create index if not exists reports_generated_at_idx on reports (generated_at);

create table if not exists exam_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  title text,
  learning_goals text[] not null default '{}',
  question_topics text[] not null default '{}',
  rubric text,
  rubric_auto boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_settings_owner_idx on exam_settings (owner_id);
create index if not exists exam_settings_active_idx on exam_settings (is_active, updated_at desc);
