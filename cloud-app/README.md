# Shop Parts Tracker — cloud edition (Next.js + Supabase)

See the [repo-level README](../README.md) first — this is the version to
use **if that computer ever gets real internet access**: nothing installs
on it at all, since Node.js runs on Vercel's servers, not the shop
computer. You just open a URL in a browser, from that computer or any
other. If it stays offline, use [`../offline-app/`](../offline-app/)
(no install, no network, ever) or [`../next-app/`](../next-app/) (offline,
but needs Node.js installed).

A NAPA/AutoZone-style parts counter for one shop: receive parts in, scan an
employee badge and scan parts out (printing a receipt to attach to their
work order), and scan parts back in if they weren't needed. Built with
Next.js (App Router) + Supabase (Postgres, Auth, Realtime), deployable for
free on Vercel + Supabase.

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
- **Auth + approval**: sign up → sits "pending" until an admin approves
  them as staff or admin. Every stock movement and receipt is stamped
  server-side with who actually did it — can't be spoofed from the browser.

## 1. Create your two free accounts

I can't create accounts on your behalf — here's exactly what to click.

### Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign
   up (GitHub sign-in is easiest).
2. **New project** → name it (e.g. `shop-parts-tracker`), set a database
   password (save it somewhere), pick the region closest to you, free plan.
3. Once it's provisioned, open **Project Settings → API**. You'll need two
   values in a minute: **Project URL** and the **anon public** key.
4. Open the **SQL Editor** (left sidebar) → **New query**, paste in the
   entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and run it. This creates every table, security policy, and trigger.
5. **Auth → Providers → Email**: for an internal tool, turn **Confirm
   email** off so people can sign up and start their access request in one
   step (otherwise they'll need to click an email link before their
   profile can be created). You can turn it back on later if you want that
   extra step.

### Vercel (hosting)

1. Go to [vercel.com](https://vercel.com) → sign up (GitHub sign-in is
   easiest — use the same GitHub account this repo is under).
2. In Vercel: **Add New → Project** → import this GitHub repo.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL from Supabase step 3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon public key from Supabase step 3
4. Deploy. You'll get a live `https://your-project.vercel.app` link the
   whole shop can open — including from a phone or tablet at the counter.

## 2. Make yourself the first admin

Every new sign-up starts as "pending," and only an existing admin can
approve someone — so the very first admin has to be promoted by hand, once:

1. Sign up in the live app with your own name/email like anyone else.
2. In Supabase → **SQL Editor**, run (swap in your email):
   ```sql
   update profiles set app_role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Refresh the app — you can now approve everyone else from **Admin →
   Pending requests**.

## 3. Set up your catalog

1. **Employees** → add each employee with the code on their badge. If
   badges aren't printed yet, generate any code you like (e.g. `E-0001`)
   and print one from that employee's page — **Print badge**.
2. **Parts** → add each part (part number, description, bin, reorder
   point, starting quantity). If a part doesn't already have a
   manufacturer barcode you're using, leave the barcode field blank and
   it'll default to the part number — or print a generated one from the
   part's page.

## 4. Daily workflow

- **Someone needs a part**: Checkout → scan their badge → scan the part(s)
  → Complete & print. Hand them the receipt for their work order.
- **New stock arrives**: Receive → scan the part → enter quantity → Log
  receipt.
- **A part comes back unused**: Returns → scan the employee's badge → pick
  the part and quantity → Return.
- **Scanned the wrong thing**: open that receipt from Receipt history →
  Void this receipt (restocks it, keeps the record).

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + anon key
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
- `src/lib/database.types.ts` is hand-written to match the SQL schema.
  Once your Supabase project exists you can replace it with the real
  generated types any time (command is in that file's header comment) —
  no other code changes needed.

## Deploying changes

Once connected to Vercel, pushing to `main` (including editing a file
directly on github.com) automatically deploys. No local terminal needed
for simple content/text changes.
