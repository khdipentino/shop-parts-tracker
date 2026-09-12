# Shop Parts Tracker

A NAPA/AutoZone-style parts counter for one shop: receive parts in, scan an
employee badge and scan parts out (printing a receipt to attach to their
work order), and scan parts back in if they weren't needed.

This repo has **two versions**, built for two different situations:

## → [`offline-app/`](offline-app/) — start here if the computer can't run Node.js

A plain HTML/CSS/JS app with no install step at all — just open a file in
a browser. No admin rights, no Node.js, no network, ever. Data lives in
that browser's local storage. This is the one for a locked-down computer
(e.g. a government machine where you can't install software). See
[`offline-app/README.md`](offline-app/README.md) for the full setup —
it's just "copy the folder over, double-click `index.html`."

Trade-offs versus the other version: no real login security (anyone who
can open the file can see/edit the data — the built-in "Operator" picker
is for record-keeping, not access control) and no automatic backup yet
(the data is only in that one browser, on that one computer).

## `next-app/` — if you have a computer where you can install Node.js and use the internet

The original version: a full Next.js + Supabase web app with real
multi-user accounts, database-enforced permissions, and a live URL
anyone on the team can open from any device. Needs a one-time setup with
a free Supabase account and a free Vercel account (both need internet),
and Node.js installed to build it locally if you're not just deploying
through GitHub/Vercel directly.

If your situation changes — you get a networked computer, or need more
than one register/computer sharing live stock — this is the version to
move to. See [`next-app/README.md`](next-app/README.md).

## Which one am I actually running?

Whichever one you copied onto the computer. They don't share data with
each other — pick one for a given computer and stick with it.
