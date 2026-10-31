# 11: Findings export script

**What to build:** A local script, run with the service key, that exports aggregate findings with counts as a static snapshot for the portfolio. The headline outcome is "still using": dictating on all three quest days with an AI tool among the apps. The day-5 follow-up is exported as a clearly labelled update.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The script reads from Supabase using the service key from a local environment file only
- [ ] The output contains aggregates with counts for the games built so far and never individual Players' private data or dictated text
- [ ] The "still using" headline is computed as defined in the spec
- [ ] Day-5 follow-up data is marked as a labelled update
- [ ] The output is a single static JSON snapshot the portfolio can consume
- [ ] Rerunning the script after more games ship includes their counts
