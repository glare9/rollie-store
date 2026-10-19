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
- `src/app/page.tsx`: placeholder homepage listing products, to check the database is connected.
- `public/rollie-logo.svg`, `public/placeholder-treat.svg`: placeholder branding. Replace with real files of the same name.

The customer checkout (step 2) and the admin pages (step 3) come next.

## Account setup

1. **GitHub**: create an empty private repo (e.g. `rollie-store`) and push this folder to it.
2. **Supabase** (supabase.com, free plan): create a project in the Singapore region. In the SQL editor run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`. Copy the project URL, anon key and service role key from Project Settings > API.
3. **Vercel** (vercel.com, Hobby plan): import the GitHub repo and add the three Supabase values as environment variables (names in `.env.example`).
4. **Resend** (resend.com, free plan): only needed for step 3. Create an API key and verify the domain once you have it.

## Run locally

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```
