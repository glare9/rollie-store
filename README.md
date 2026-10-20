# Rollie store

Online shop for Rollie seasonal pet treats. Next.js on Vercel, Supabase database, PayNow QR at checkout, Resend for emails. Everything runs on free tiers.

## What's here (step 1)

- `supabase/migrations/0001_init.sql`: the database
  - `products`: catalogue and stock. Stock goes down when an order is placed and back up if it's cancelled.
  - `customers`: basic CRM (name, pet name, email, phone, address, postal code, admin notes). One row per email.
  - `orders` and `order_items`: order reference (RL1001, RL1002...), status (`pending_payment`, `paid`, `delivered`, `cancelled`), delivery date and slot, payment validated time, email sent time.
  - `delivery_time_slots`: morning, afternoon, evening. Edit labels and times freely.
  - `delivery_closed_dates`: weekends you're not delivering.
  - `store_settings`: daily order cap (default 10), how far ahead customers can book (1 to 28 days), PayNow UEN and QR image.
  - `place_order()`: the only way the public site writes data. It checks the date is a Saturday or Sunday, the day isn't full, and there's enough stock, all in one transaction.
  - `delivery_availability()`: the bookable weekend days, with full days flagged.
  - `mark_order_paid()` and `cancel_order()`: admin only.
  - Row level security: the public key can only read active products and time slots. Customers and orders are admin-only.
- `supabase/seed.sql`: four placeholder products.
- `src/lib/supabase/`: browser, server, and admin (service role) clients.
- `public/rollie-logo.svg`, `public/placeholder-treat.svg`: placeholder branding. Replace with real files of the same name.

## Customer flow (step 2)

- `/`: treats with a quantity picker, **Add to cart** and **Buy now** (checks out that one treat without touching the cart).
- `/cart`: change quantities or remove items. The cart is saved in the customer's browser.
- `/checkout`: name, pet name, email, phone, address, postal code, optional note; weekend delivery day (full days greyed out) and time slot. Calls `place_order()`, which reserves the stock.
- `/order/<id>`: order reference, delivery details and a PayNow QR code with the amount and order reference filled in. The link uses a random order id, so only the customer can open it.

### PayNow setup

In Supabase, open **Table Editor → store_settings** and put your UEN (or PayNow mobile number) in `paynow_uen`. Until then the order page shows a sample QR marked "do not pay". If you'd rather use a fixed QR image, leave `paynow_uen` empty and put the image link in `paynow_qr_url` instead (customers then type the amount themselves).

## Admin pages (step 3)

Sign in at `/admin` with the password in the `ADMIN_PASSWORD` environment variable.

- **Orders** (`/admin`): grouped by delivery day with each day's treat totals, so it doubles as the delivery run sheet. Filter by awaiting payment, to deliver, delivered, cancelled or all.
  - **Payment validated** marks the order paid and emails the customer a confirmation through Resend.
  - **Mark delivered**, **Resend confirmation email**, and **Cancel order** (puts the stock back and frees the delivery spot).
- **Products** (`/admin/products`): edit name, description, price, stock, display order and photo; untick "On sale" to hide a treat; add new treats. Photos go to a public Supabase Storage bucket, `product-images`, created on the first upload.
- **Customers** (`/admin/customers`): search by name, pet, email, phone or postal code; order count, spend and last delivery; edit details and private notes.
- **Settings** (`/admin/settings`): PayNow UEN or mobile number, orders per day, booking window, store name, reply-to email, and weekend days you're not delivering.

### Email setup

Add `RESEND_API_KEY` in Vercel. Until a domain is verified in Resend, emails come from `onboarding@resend.dev` and Resend only delivers them to your own Resend account address. Once your domain is verified, set `EMAIL_FROM` (e.g. `Rollie <orders@rollietreats.sg>`).

## Account setup

1. **GitHub**: create an empty private repo (e.g. `rollie-store`) and push this folder to it.
2. **Supabase** (supabase.com, free plan): create a project in the Singapore region. In the SQL editor run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`. Copy the project URL, anon key and service role key from Project Settings > API.
3. **Vercel** (vercel.com, Hobby plan): import the GitHub repo and add the three Supabase values as environment variables (names in `.env.example`).
4. **Resend** (resend.com, free plan): create an API key and add it to Vercel as `RESEND_API_KEY`. Verify the domain once you have it.
5. **Admin password**: add `ADMIN_PASSWORD` in Vercel with a password of your choice.

## Run locally

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```
