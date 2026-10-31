# Supabase is the whole backend

The arcade needs storage across days, outside Judges, a private bucket for streak cards and aggregates for the portfolio, but no server logic beyond validation. We use Supabase (Postgres, RPC functions, Storage) behind a static front end and write no custom server. Alternatives considered: a Node and Express API (more code to write and host tonight, no gain) and a spreadsheet form (cannot hold personal links, uploads or Judge picks).

Consequence: all behaviour that needs trust lives in SQL functions, so those are the second thing to test after the Session module.
