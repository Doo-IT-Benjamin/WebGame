-- Highscores table for the Zwaartekracht game.
-- Applied automatically by the Supabase GitHub integration on push to main,
-- or run once by hand: SQL Editor → New query → paste → Run.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  name       text        not null check (char_length(btrim(name)) between 1 and 20),
  score      integer     not null check (score between 1 and 100000),
  created_at timestamptz not null default now()
);

create index if not exists scores_score_idx on public.scores (score desc, created_at);

-- Row Level Security: the public (anon) key may only read and add scores.
-- It cannot change or delete anything. Remove bad entries in the Table Editor.
alter table public.scores enable row level security;

drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
  on public.scores for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a score" on public.scores;
create policy "Anyone can add a score"
  on public.scores for insert
  to anon, authenticated
  with check (true);

revoke all on public.scores from anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
