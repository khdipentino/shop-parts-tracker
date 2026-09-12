# Shop Parts Tracker — Next.js + local SQLite edition

See the [repo-level README](../README.md) first — this version needs a
computer where you can install Node.js and run a build; if that's not
available (e.g. a locked-down government computer), use
[`../offline-app/`](../offline-app/) instead.

**This version runs entirely on one computer with no internet connection,
ever, once it's installed.** There's no cloud account, no database service,
no API key — everything (staff logins, parts, employees, every receipt)
lives in a single SQLite file on that computer's disk. Back that one file
up and you have the whole shop's data.

## What's already built

- **Checkout counter**: scan an employee's badge, scan each part (a USB/
  Bluetooth handheld "keyboard wedge" scanner works out of the box — no
  special drivers, it just types), adjust quantities, complete the
  transaction. Stock is decremented immediately and a printable receipt is
  generated, ready to attach to the work order.
- **Receiving**: scan a part barcode, enter the quantity that came in, done
  — it's back on the shelf count instantly. Unrecognized barcodes offer a
  one-click "add as a new part."
- **Returns**: scan the employee's badge to see everything still
  outstanding on their receipts, pick what's coming back and how many.
- **Full part history**: every receive/issue/return/adjustment for a part,
  with who did it and when, plus current stock, bin location, and reorder
  point (parts below it show up on the dashboard).
- **Employee & part records**: add/edit either, print a CODE128 barcode
  label/badge for any of them from the browser (any regular printer — no
  dedicated label printer required).
- **Void a bad receipt**: if the wrong employee or part got scanned,
  voiding a receipt restocks everything on it that wasn't already
  individually returned. Nothing is ever deleted — voided receipts stay in
  history.
- **PIN-based staff login**: pick your name, enter your PIN. The first
  time the app runs on a computer it walks you through creating the first
  admin account; that admin adds everyone else from **Admin → Manage
  staff**. Every stock movement and receipt is stamped server-side with
  who actually did it.

## How this stays offline

- **Database**: a single SQLite file at `data/shop-parts-tracker.db`,
  read and written directly by the app using Node's own built-in SQLite
  support — nothing to install, nothing to configure, no server process to
  run alongside it.
- **Auth**: PIN logins checked against that same local file. Sessions are
  a signed cookie (the signing key is generated automatically on first run
  and saved in `.env.local`) — no external auth service.
- **No web fonts, no CDN scripts, no analytics** — anything the page needs
  is bundled in at build time.

The **only** point that needs internet at all is getting the code and its
dependencies onto the computer in the first place (steps 1–2 below). Once
`npm run build` has completed successfully, you can disconnect that
computer from the network permanently and the app keeps working.

## 1. Put Node.js on the computer

You need Node.js **22.5 or newer** (this app uses Node's built-in SQLite
support, which landed in that version). Download the installer for that
computer's OS from [nodejs.org](https://nodejs.org) while you have network
access, and run it. `node --version` in a terminal should then print
`v22.5.0` or higher.

## 2. Get this code onto the computer and install dependencies

With network access (temporary is fine), from inside this `next-app`
folder:

```bash
git clone https://github.com/khdipentino/shop-parts-tracker.git
cd shop-parts-tracker/next-app
npm install
npm run build
```

`npm install` is the one step that actually needs the internet — it
downloads the packages this app is built from. `npm run build` compiles
everything into the `.next` folder; once that finishes, you're done
needing network. (If you'd rather not risk connecting the real shop
computer to the internet at all: run these same commands on any other
computer, matching or newer Node version, then copy the *entire* `next-app`
folder — including the `node_modules` and `.next` folders it creates —
over by USB drive.)

## 3. Run it

```bash
npm run start
```

Then open **http://localhost:3000** in a browser on that computer. Leave
the terminal window open — that's the app running; closing it stops the
app. (If you want it to start automatically on boot or keep running in the
background, that's an OS-level thing — ask me and I can walk through it
for whatever OS that computer runs.)

The very first time it runs, you'll land on a **setup screen** to create
the first admin account (just a name and a PIN — no email, no internet
lookup). After that, everyone signs in from the login screen by picking
their name and entering their PIN.

## 4. Set up your catalog

1. **Admin → Manage staff** → add everyone else who works the counter,
   with their own PIN.
2. **Employees** → add each employee with the code on their badge. If
   badges aren't printed yet, generate any code you like (e.g. `E-0001`)
   and print one from that employee's page — **Print badge**.
3. **Parts** → add each part (part number, description, bin, reorder
   point, starting quantity). If a part doesn't already have a
   manufacturer barcode you're using, leave the barcode field blank and
   it'll default to the part number — or print a generated one from the
   part's page.

## 5. Daily workflow

- **Someone needs a part**: Checkout → scan their badge → scan the part(s)
  → Complete & print. Hand them the receipt for their work order.
- **New stock arrives**: Receive → scan the part → enter quantity → Log
  receipt.
- **A part comes back unused**: Returns → scan the employee's badge → pick
  the part and quantity → Return.
- **Scanned the wrong thing**: open that receipt from Receipt history →
  Void this receipt (restocks it, keeps the record).

## Backing up your data

Everything is the one file: `data/shop-parts-tracker.db`. There's no cloud
copy, so back it up the way you'd back up any important local file — copy
it to a USB drive or another computer on whatever schedule makes sense for
how much you'd hate to lose a day's receipts. The app doesn't need to be
stopped first, but avoid copying it mid-checkout; a quiet moment (end of
day) is safest.

## Local development

```bash
npm install
npm run dev
```

## Notes / things to know

- Barcode scanning assumes a standard USB/Bluetooth "keyboard wedge"
  scanner — it types the code and Enter into whatever's focused, which is
  exactly how the scan fields on Checkout/Receive/Returns work. No app
  configuration needed; just plug it in.
- Receipts and labels print through the browser's own print dialog (works
  with any regular printer). If you later get a dedicated thermal label
  printer, the barcode rendering (`src/components/Barcode.tsx`) is the
  only piece that would need a driver-specific alternative.
- If a second computer at the counter ever needs to see the same live
  stock, this single-file setup isn't the right fit anymore — that needs a
  small local server the other machine connects to over the shop's own
  network (still no internet required). Ask if that becomes a need.
