-- Post-game answers arrive after both rounds are saved, so a round can be saved when it ends.
-- Merges into the round's answers; the metrics stay as submitted.

create function public.record_answers(p_token text, p_game text, p_mode text, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.player_id_for(p_token);
begin
  update public.round
  set answers = answers || coalesce(p_answers, '{}'::jsonb)
  where player_id = pid and game = p_game and mode = p_mode;
end;
$$;

grant execute on function public.record_answers(text, text, text, jsonb) to anon, authenticated;
