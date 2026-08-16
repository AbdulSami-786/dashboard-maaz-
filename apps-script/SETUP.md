# Apps Script backend setup

This folder holds the Google Apps Script source (`Code.gs`) that backs both
the MD Fashion website and this admin dashboard. It's mirrored here for
version control — the file that actually runs lives inside the Apps Script
project bound to your Google Sheet.

## Updating the deployed script

You already have a deployment (the `/exec` URL the dashboard calls). This
version adds admin actions (`adminGetOrders`, `adminUpdateOrderStatus`,
`adminGetReviews`, `adminSetReviewApproved`, `adminDeleteReview`,
`adminGetUsers`, `adminSetUserSuspended`, `adminDeleteUser`,
`adminGetWishlist`) on top of what was already there — nothing existing was
removed or changed behaviorally.

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Select all the code in the editor and replace it with the contents of
   [`Code.gs`](./Code.gs) in this folder.
3. Set an admin key (the password the dashboard's login screen asks for):
   - Edit the `ADMIN_KEY_TO_SET` value inside the `setAdminKey` function near
     the top of the file to a strong secret of your choosing.
   - In the function dropdown at the top of the editor, select `setAdminKey`,
     then click **Run**. Grant permissions if prompted.
   - This writes the key into the project's Script Properties — it's never
     hard-coded into anything visible on the client.
   - You can re-run this any time with a new value to rotate the key.
4. Run `setup()` once from the editor (function dropdown → `setup` → Run).
   This is safe to re-run on a sheet that already has data — it now adds any
   columns a code update introduced without touching existing rows. The
   `suspended` column on `Users` (used by the suspend/unsuspend button and
   to block a suspended customer from logging in) was added this way, so
   this step is required even on an existing deployment, not just a fresh one.
5. Click **Deploy → Manage deployments**, click the pencil/edit icon on the
   existing deployment, change **Version** to **New version**, and click
   **Deploy**. This updates the *same* `/exec` URL in place — you don't need
   to change the URL the dashboard uses.
6. (If this is the very first deploy instead of an update) Deploy as a
   **Web app**, with **Execute as: Me** and **Who has access: Anyone**, then
   add two installable "On edit" triggers (**Triggers → Add Trigger**):
   - Function `onOrdersSheetEdit`, event source "From spreadsheet", event
     type "On edit"
   - Function `onReviewsSheetEdit`, same event source/type

## Why an admin key instead of admin user accounts?

The existing `Users` sheet has no role/permission column, and adding one
would mean touching the login flow the live site already depends on. A
single shared secret (`ADMIN_KEY`), checked on every `admin*` action, is the
smallest change that gets you a working dashboard without risking the
customer-facing auth. If you later want per-admin accounts or audit logging,
that's a bigger change worth doing deliberately rather than as a side effect
of this dashboard.

## Why status changes and review approvals still email customers

`onOrdersSheetEdit` / `onReviewsSheetEdit` only fire for edits made by a
*person* through the Sheets UI — Apps Script does not run "On edit" triggers
for changes made by the API itself. So `adminUpdateOrderStatus` and
`adminSetReviewApproved` call the same `sendOrderStatusEmail` /
`sendReviewApprovedEmail` helpers directly, meaning a status change from the
dashboard sends the identical email a manual sheet edit would — you don't
lose customer notifications by using the dashboard instead of the sheet.
