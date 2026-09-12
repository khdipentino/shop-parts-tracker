# Shop Parts Tracker

A NAPA/AutoZone-style parts counter for one shop: receive parts in, scan an
employee badge and scan parts out (printing a receipt to attach to their
work order), and scan parts back in if they weren't needed.

This repo has **three versions** of the same app, for three different
situations. Pick the one that matches the computer you're actually
putting this on:

## → [`offline-app/`](offline-app/) — no Node.js, no network, ever

A plain HTML/CSS/JS app with no install step at all — just open a file in
a browser. No admin rights, no Node.js, no internet, ever. Data lives in
that browser's local storage. This is the one for a locked-down computer
(e.g. a government machine where you can't install software and can't get
online). See [`offline-app/README.md`](offline-app/README.md) — setup is
just "copy the folder over, double-click `index.html`."

Trade-offs: no real login security (anyone who can open the file can
see/edit the data — the "Operator" picker is for record-keeping, not
access control) and no automatic backup yet (data is only in that one
browser, on that one computer).

## → [`cloud-app/`](cloud-app/) — if that computer ever gets real internet

**Nothing installs on the shop computer at all.** This is a normal
hosted website (Next.js + Supabase, deployed for free on Vercel) — you
open a URL in a browser, the same as any other website, from that
computer or anyone else's. Real accounts, real per-user permissions
enforced by the database, everyone can be on it from any device
simultaneously. If you get internet access — even just enough to load a
webpage, nothing more — this is the easiest of the three, since there's
no local setup on that machine beyond "open this link." See
[`cloud-app/README.md`](cloud-app/README.md) for the one-time Supabase +
Vercel setup (both free, both need whoever sets it up to have internet —
doesn't have to be that same locked-down computer).

## `next-app/` — offline, but needs Node.js installed

A full Next.js app with a local SQLite database and PIN-based staff
login — everything the cloud version does, but running entirely on one
computer with no internet needed at runtime. Needs Node.js 22.5+
installed on that computer, and a one-time `npm install`/`npm run build`
that does need brief internet access. See
[`next-app/README.md`](next-app/README.md).

## Which one am I actually running?

Whichever one you copied onto (or deployed for) the computer. They don't
share data with each other — pick one for a given computer and stick with
it. If your situation changes (you get internet, or need multiple
registers sharing live stock), `cloud-app/` is the one to move to.
