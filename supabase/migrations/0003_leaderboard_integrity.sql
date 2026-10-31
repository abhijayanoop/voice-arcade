-- The Speed race ranks only unflagged voice rounds, so a voice step typed instead can never top it.

create or replace function public.get_leaderboard()
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
    and r.integrity = 'ok'
  group by p.id, p.code_name, p.avatar
  order by max(r.wpm) desc
  limit 10;
$$;
