-- Voice Arcade: tables, access rules, RPC functions and the streak-cards bucket.
-- Spec: docs/data-model.md. Apply in the Supabase SQL editor (or `supabase db push`).
-- Row-level security is on for every table with no policy, so the browser roles can
-- neither read nor write a table. The browser reaches data only through the functions below.

-- ───────────────────────── Tables ─────────────────────────

create table public.player (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  code_name text not null unique,
  avatar int not null check (avatar >= 0),
  cohort text not null check (cohort in ('developer', 'prompt_engineer')),
  os text not null check (os in ('mac', 'windows', 'other')),
  languages text[] not null default '{}',
  consented_at timestamptz,
  leaderboard_opt_in boolean not null default false,
  arcade_done_at timestamptz,
  created_at timestamptz not null default now()
);
-- Code names are unique ignoring case ("Mango" and "mango" collide).
create unique index player_code_name_lower_key on public.player (lower(code_name));

create table public.round (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player (id) on delete cascade,
  game text not null check (game in ('brain_dump', 'decode', 'rant', 'juggler', 'snippet')),
  mode text not null check (mode in ('typed', 'voice')),
  mode_order int not null check (mode_order in (1, 2)),
  prompt_key text not null,
  started_at timestamptz not null,
  active_ms int not null check (active_ms >= 0),
  words int not null check (words >= 0),
  chars int not null check (chars >= 0),
  wpm numeric not null check (wpm >= 0),
  keystrokes int not null check (keystrokes >= 0),
  paste_events int not null check (paste_events >= 0),
  insert_events int not null check (insert_events >= 0),
  integrity text not null check (integrity in ('ok', 'flagged')),
  answers jsonb not null default '{}',
  extras jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (player_id, game, mode)
);

create table public.description (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null unique references public.round (id) on delete cascade,
  scene_set text not null,
  target_scene text not null,
  text text not null
);

create table public.judgment (
  id uuid primary key default gen_random_uuid(),
  description_id uuid not null references public.description (id) on delete cascade,
  judge_key text not null,
  picked_scene text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (description_id, judge_key)
);

create table public.quest (
  player_id uuid not null references public.player (id) on delete cascade,
  day int not null check (day between 1 and 3),
  done_at timestamptz not null default now(),
  primary key (player_id, day)
);

create table public.checkin (
  player_id uuid not null references public.player (id) on delete cascade,
  day int not null check (day in (3, 5)),
  streak_days int not null check (streak_days >= 0),
  total_words int not null check (total_words >= 0),
  apps text[] not null default '{}',
  screenshot_path text,
  answers jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  primary key (player_id, day)
);

create table public.boss (
  player_id uuid primary key references public.player (id) on delete cascade,
  annoyance int not null check (annoyance between 1 and 5),
  disappointment text not null check (disappointment in ('very', 'somewhat', 'not')),
  pay_intent text not null check (pay_intent in ('already', 'yes', 'maybe', 'no')),
  pay_if text,
  submitted_at timestamptz not null default now()
);

-- ───────────────────────── Access rules ─────────────────────────

alter table public.player enable row level security;
alter table public.round enable row level security;
alter table public.description enable row level security;
alter table public.judgment enable row level security;
alter table public.quest enable row level security;
alter table public.checkin enable row level security;
alter table public.boss enable row level security;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

-- Token lookup lives outside the exposed `public` schema so it is not callable as an RPC.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create function private.player_id_for(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found uuid;
begin
  select id into found from public.player where token = p_token;
  if found is null then
    raise exception 'unknown_token';
  end if;
  return found;
end;
$$;

create function private.token_exists(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.player where token = p_token);
$$;

revoke execute on function private.player_id_for(text) from public;
revoke execute on function private.token_exists(text) from public;
-- The storage insert policy runs as the caller, so it needs to be able to call this one.
grant execute on function private.token_exists(text) to anon, authenticated;

-- ───────────────────────── RPC functions ─────────────────────────

create function public.register_player(
  p_code_name text,
  p_avatar int,
  p_cohort text,
  p_os text,
  p_languages text[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  clean_name text := btrim(p_code_name);
begin
  if char_length(clean_name) not between 2 and 24 then
    raise exception 'invalid_code_name';
  end if;
  insert into public.player (token, code_name, avatar, cohort, os, languages)
  values (new_token, clean_name, p_avatar, p_cohort, p_os, coalesce(p_languages, '{}'));
  return new_token;
exception
  when unique_violation then
    raise exception 'code_name_taken';
end;
$$;

create function public.record_consent(p_token text, p_leaderboard_opt_in boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  update public.player
  set consented_at = coalesce(consented_at, now()),
      leaderboard_opt_in = coalesce(p_leaderboard_opt_in, false)
  where id = pid;
end;
$$;

create function public.get_state(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  return (
    select jsonb_build_object(
      'player', jsonb_build_object(
        'codeName', p.code_name,
        'avatar', p.avatar,
        'cohort', p.cohort,
        'os', p.os,
        'languages', to_jsonb(p.languages),
        'consented', p.consented_at is not null,
        'leaderboardOptIn', p.leaderboard_opt_in,
        'arcadeDone', p.arcade_done_at is not null
      ),
      'rounds', coalesce((
        select jsonb_agg(jsonb_build_object('game', r.game, 'mode', r.mode, 'modeOrder', r.mode_order)
                         order by r.created_at)
        from public.round r where r.player_id = p.id
      ), '[]'::jsonb),
      'questDays', coalesce((select jsonb_agg(q.day order by q.day) from public.quest q where q.player_id = p.id), '[]'::jsonb),
      'checkinDays', coalesce((select jsonb_agg(c.day order by c.day) from public.checkin c where c.player_id = p.id), '[]'::jsonb),
      'bossDone', exists (select 1 from public.boss b where b.player_id = p.id)
    )
    from public.player p
    where p.id = pid
  );
end;
$$;

create function public.submit_round(p_token text, p_round jsonb, p_description jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
  rid uuid;
begin
  insert into public.round (
    player_id, game, mode, mode_order, prompt_key, started_at, active_ms, words, chars, wpm,
    keystrokes, paste_events, insert_events, integrity, answers, extras
  )
  values (
    pid,
    p_round ->> 'game',
    p_round ->> 'mode',
    (p_round ->> 'mode_order')::int,
    p_round ->> 'prompt_key',
    (p_round ->> 'started_at')::timestamptz,
    (p_round ->> 'active_ms')::int,
    (p_round ->> 'words')::int,
    (p_round ->> 'chars')::int,
    (p_round ->> 'wpm')::numeric,
    (p_round ->> 'keystrokes')::int,
    (p_round ->> 'paste_events')::int,
    (p_round ->> 'insert_events')::int,
    p_round ->> 'integrity',
    coalesce(p_round -> 'answers', '{}'),
    coalesce(p_round -> 'extras', '{}')
  )
  on conflict (player_id, game, mode) do nothing
  returning id into rid;

  -- A repeat submission inserts nothing, and neither does it touch the description.
  if rid is not null and p_description is not null then
    insert into public.description (round_id, scene_set, target_scene, text)
    values (rid, p_description ->> 'scene_set', p_description ->> 'target_scene', p_description ->> 'text');
  end if;
end;
$$;

create function public.finish_arcade(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  update public.player set arcade_done_at = coalesce(arcade_done_at, now()) where id = pid;
end;
$$;

create function public.get_leaderboard()
returns table (code_name text, avatar int, wpm numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.code_name, p.avatar, max(r.wpm) as wpm
  from public.player p
  join public.round r on r.player_id = p.id
  where p.leaderboard_opt_in
    and r.game = 'brain_dump'
    and r.mode = 'voice'
  group by p.id, p.code_name, p.avatar
  order by max(r.wpm) desc
  limit 10;
$$;

-- Never returns mode, author or target scene.
create function public.get_judge_batch(p_judge_key text, p_n int)
returns table (id uuid, text text, scene_set text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.text, d.scene_set
  from public.description d
  where not exists (
    select 1 from public.judgment j where j.description_id = d.id and j.judge_key = p_judge_key
  )
  order by random()
  limit least(greatest(coalesce(p_n, 0), 0), 20);
$$;

create function public.submit_judgment(p_judge_key text, p_description_id uuid, p_picked_scene text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
begin
  select target_scene into target from public.description where id = p_description_id;
  if target is null then
    raise exception 'unknown_description';
  end if;
  insert into public.judgment (description_id, judge_key, picked_scene, correct)
  values (p_description_id, p_judge_key, p_picked_scene, p_picked_scene = target)
  on conflict (description_id, judge_key) do nothing;
end;
$$;

create function public.mark_quest(p_token text, p_day int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  insert into public.quest (player_id, day) values (pid, p_day)
  on conflict (player_id, day) do nothing;
end;
$$;

create function public.submit_checkin(p_token text, p_day int, p_fields jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  insert into public.checkin (player_id, day, streak_days, total_words, apps, screenshot_path, answers)
  values (
    pid,
    p_day,
    (p_fields ->> 'streak_days')::int,
    (p_fields ->> 'total_words')::int,
    coalesce(array(select jsonb_array_elements_text(p_fields -> 'apps')), '{}'),
    p_fields ->> 'screenshot_path',
    coalesce(p_fields -> 'answers', '{}')
  )
  on conflict (player_id, day) do update
    set streak_days = excluded.streak_days,
        total_words = excluded.total_words,
        apps = excluded.apps,
        screenshot_path = excluded.screenshot_path,
        answers = excluded.answers,
        submitted_at = now();
end;
$$;

create function public.submit_boss(p_token text, p_fields jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  insert into public.boss (player_id, annoyance, disappointment, pay_intent, pay_if)
  values (
    pid,
    (p_fields ->> 'annoyance')::int,
    p_fields ->> 'disappointment',
    p_fields ->> 'pay_intent',
    p_fields ->> 'pay_if'
  )
  on conflict (player_id) do update
    set annoyance = excluded.annoyance,
        disappointment = excluded.disappointment,
        pay_intent = excluded.pay_intent,
        pay_if = excluded.pay_if,
        submitted_at = now();
end;
$$;

grant execute on function
  public.register_player(text, int, text, text, text[]),
  public.record_consent(text, boolean),
  public.get_state(text),
  public.submit_round(text, jsonb, jsonb),
  public.finish_arcade(text),
  public.get_leaderboard(),
  public.get_judge_batch(text, int),
  public.submit_judgment(text, uuid, text),
  public.mark_quest(text, int),
  public.submit_checkin(text, int, jsonb),
  public.submit_boss(text, jsonb)
to anon, authenticated;

-- ───────────────────────── Storage: streak cards ─────────────────────────
-- Private bucket. Browser roles may insert only, images up to 5 MB, under `<token>/`.
-- No select, update or delete policy exists, so they cannot read, list, overwrite or remove.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('streak-cards', 'streak-cards', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

create policy "streak cards: insert under a valid token"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'streak-cards'
  and private.token_exists((storage.foldername(name))[1])
);
