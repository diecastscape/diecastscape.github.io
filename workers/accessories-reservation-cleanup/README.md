# Accessories reservation cleanup Worker

This separate Cloudflare Worker releases expired Accessories stock reservations automatically, including when nobody is visiting the storefront.

## What it does

- Runs once per minute using a Cloudflare Cron Trigger.
- Reuses the same Firestore reservation-release helper as the Accessories checkout.
- Releases only sessions whose status is still `reserved` and whose expiry time has passed.
- Uses the helper's Firestore update-time preconditions and retry handling to avoid double-releasing stock.
- Processes up to 100 expired sessions per run; additional expired sessions are picked up by subsequent runs.
- Does not touch permanent orders or other product categories.

## Required secret

The Worker needs the Firebase service-account JSON already used by the Cloudflare Pages Functions. Add it as a Worker secret named:

`FIREBASE_SERVICE_ACCOUNT_JSON`

In the Cloudflare dashboard, open **Workers & Pages** → **diecastscape-accessories-reservation-cleanup** → **Settings** → **Variables and Secrets** → **Add** → **Secret**. Paste the existing service-account JSON directly into Cloudflare's secret field. Do not put it in this repository, a plain-text variable, or a source file.

The service account must have permission to read and update the Firestore documents used by the existing checkout flow.

## Cloudflare Git deployment

The Git-connected Worker is configured to build from the `IN-development` branch with this directory as its root.

## Deploy

From this directory, deploy with Wrangler:

```sh
npx wrangler deploy
```

The Cron Trigger is declared in `wrangler.toml`. After deployment, verify the trigger is listed under the Worker **Triggers** tab and inspect **Logs** after the next minute boundary.

## Important

Committing these files does not deploy or activate the Worker. The secret must be configured and the Worker deployed in Cloudflare before automatic cleanup starts. The existing checkout and payment-verification cleanup calls remain in place as a fallback.
