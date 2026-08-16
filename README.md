# MD Fashion — Admin Dashboard

A React admin dashboard for the MD Fashion store: order status management,
review moderation, and a customer list, all backed by the existing Google
Apps Script + Google Sheets API.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router
- TanStack Query (data fetching/caching/mutations)
- Recharts (Orders-by-status chart)

## 1. Update the Apps Script backend

The dashboard needs a few admin-only API actions that the original script
didn't have (list *all* orders/reviews, update an order's status, approve or
delete a review, list customers). These have been added in
[`apps-script/Code.gs`](./apps-script/Code.gs).

Follow [`apps-script/SETUP.md`](./apps-script/SETUP.md) to paste the updated
script into your existing Apps Script project, set an admin key, and
redeploy. It's a drop-in replacement — the site's existing signup/login/
orders/reviews flow is unchanged.

## 2. Configure the dashboard

```bash
cp .env.example .env
```

`.env` already points `VITE_APPS_SCRIPT_URL` at your deployment. Only change
it if you redeploy to a new URL.

## 3. Run it

```bash
npm install
npm run dev
```

Open the printed local URL, then sign in with the admin key you set via
`setAdminKey()` in the Apps Script editor.

## 4. Build for production

```bash
npm run build
```

Outputs static files to `dist/` — deploy them to any static host (Vercel,
Netlify, GitHub Pages, etc). Set `VITE_APPS_SCRIPT_URL` as an environment
variable on the host, or keep the committed `.env` (the URL isn't secret;
the admin key is what gates access, and it's never committed).

## What's here

| Page | What it does |
|---|---|
| Overview | Revenue, order/review counts, orders-by-status chart, recent orders & pending reviews |
| Orders | Search/filter, expand for items + delivery address, change status (emails the customer) |
| Reviews | Filter pending/approved, approve/unapprove (emails the customer when approved), delete |
| Customers | Registered users with order count and lifetime spend; suspend/unsuspend (blocks their login) or delete an account |
| Wishlist | Every saved item across all customers, with who saved it and when |

## Notes

- **Auth** is a single shared admin key (see `apps-script/SETUP.md` for why),
  stored in `localStorage` after a successful login and sent with every
  admin API call.
- **CORS**: requests to the Apps Script endpoint are sent with a
  `text/plain` content type on purpose — Apps Script web apps don't handle
  the OPTIONS preflight a `application/json` content type would trigger.
  The server still parses the body as JSON.
- Status changes and review approvals made from this dashboard trigger the
  same customer emails as editing the Google Sheet directly would — see
  the "Why status changes still email customers" section in
  `apps-script/SETUP.md`.
