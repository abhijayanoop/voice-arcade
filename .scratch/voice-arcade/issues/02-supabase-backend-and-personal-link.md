# 02: Supabase backend and personal link

**What to build:** Registration, consent and state persist in Supabase, and the Player's personal link restores their progress on return. The app is deployed on Vercel. The browser reaches data only through named backend functions, and direct table access is denied.

**Blocked by:** 01

**Status:** code done, human steps pending

- [x] The migration creates the tables, access rules, backend functions and the private insert-only streak-cards bucket as specified in the data model
- [x] A Supabase adapter implements the same Api interface as the in-memory one
- [x] Registering stores the code name, avatar, cohort, operating system, language mix, consent and leaderboard choice; a taken code name returns a clear error
- [x] Opening the personal link restores the Player's progress through the Session module (resume)
- [x] Session tests cover resume and the persisted calls against the in-memory Api
- [x] A smoke script registers a Player, submits a round and reads state back against a real project
- [ ] The SPA is deployed with a catch-all rewrite; the browser bundle holds only the public URL and publishable key
- [ ] Human steps (project, keys, migration, bucket, Vercel variables) are done, guided by a wizard script
