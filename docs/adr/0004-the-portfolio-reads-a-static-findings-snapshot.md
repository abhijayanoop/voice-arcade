# The portfolio reads a static findings snapshot, not live Supabase

Supabase's free plan pauses a project after seven days of inactivity, and the hire is announced on 20 November, weeks after the experiment ends. A portfolio that queries Supabase live would break once the project pauses. A local script with the service key exports aggregate numbers to a `findings.json`; the portfolio ships that file. This also keeps raw rows away from a public site.

Consequence: findings are re-exported by hand after the day-5 follow-up on 5 November, and labelled as an update.
