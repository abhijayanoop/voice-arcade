# Blip is scripted, not an LLM

A live model would need a key, add cost and latency, and risk strange lines in the middle of a timed round. Blip reads from a script table with at least two hand-written variants per event key, picked at random with no immediate repeat. Considered and deferred: an LLM-written variant layer on top of the same event keys.

Consequence: new Blip behaviour means adding rows to `docs/design/Scripts.md`, not writing prompts.
