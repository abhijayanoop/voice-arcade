-- The quest board counts days from the moment the arcade was finished, so get_state reports that time.

create or replace function public.get_state(p_token text)
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
        'arcadeDone', p.arcade_done_at is not null,
        'arcadeDoneAt', p.arcade_done_at
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
