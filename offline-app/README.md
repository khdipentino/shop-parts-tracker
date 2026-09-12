# Shop Parts Tracker — offline, browser-only edition

This version is a plain HTML/CSS/JavaScript app. There is nothing to
install and nothing to run — no Node.js, no server, no admin rights
needed. It works by opening a file in whatever web browser is already on
the computer (Edge or Chrome recommended; it should also work in
Firefox).

## Getting it onto the computer

1. Copy this whole **folder** (`offline-app/`, with `index.html`,
   `app.js`, `styles.css`, and the `vendor/` folder inside it — all of
   them, not just `index.html`) onto the computer — USB drive, approved
   file transfer, however that computer allows files in.
2. Keep all those files together in the same folder. `index.html` loads
   `styles.css`, `app.js`, and `vendor/jsbarcode.min.js` as neighboring
   files — if they get separated, it won't work.
3. Double-click `index.html`. It opens in the default browser and that's
   the whole app — nothing else to do.

## How it works

- All the data (parts, employees, receipts, everything) lives in that
  browser's **local storage**, scoped to this exact file's location on
  disk. Nothing is sent anywhere — there's no network activity in this
  app at all.
- Bookmark or shortcut the exact file path you open it from. Local
  storage is tied to that location; opening a *copy* of the file from
  somewhere else starts with empty data.

## Two important limitations (by design, given no network/no install)

**No real login security.** Anyone who can open this file in a browser
can see and edit everything, including using the browser's own developer
tools to look at the raw data. The "Operator" picker at the top is for
recording who did what (whose name goes on a receipt or a stock change),
not for keeping anyone out. Treat the computer itself as the security
boundary, the same as you would a binder or a paper log at the counter.

**No automatic backup.** There's no cloud copy of this data — it's only
in that browser's storage on that computer. If the browser's data is
cleared, the profile is deleted, or the computer is replaced, this data
is gone unless you've backed it up some other way. This version doesn't
yet have a built-in export/backup button — ask me to add one whenever
you want it (it's a small addition: a button that downloads a copy of
everything as a file you can save to a USB drive).

## Using it

- **Operators** (top of every page, and its own page in the nav) — add
  the few people who work the counter. No password, just pick your name
  before doing anything so it's recorded correctly.
- **Employees** — everyone parts get issued to, identified by their badge
  barcode. Add them once; print a badge from their page if they don't
  already have one.
- **Parts** — your catalog. Add each part with a barcode (defaults to the
  part number if you don't have a separate one) and starting quantity.
- **Checkout** — scan an employee's badge, scan each part, print the
  receipt.
- **Receive** — scan a part, log the quantity that came in.
- **Returns** — scan an employee's badge, see what's still outstanding on
  their receipts, return what's coming back.
- Barcode scanning works with any standard USB/Bluetooth "keyboard
  wedge" scanner — it just types the code and Enter, which is exactly
  what the scan fields expect. No setup needed, just plug it in.
- Labels, badges, and receipts print through the browser's normal print
  dialog — any regular printer works.
