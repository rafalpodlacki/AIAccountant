# Ledger — Company Books

A bookkeeping web app for a UK limited company: income & expenses, client
invoicing, a VAT return calculator, and P&L reports. Built with React,
Vite, and Firebase (Auth + Firestore). Works on desktop and mobile browsers.

## What it does

- **Transactions** — a running ledger of every income/expense entry, with
  category, net/VAT/gross split, and a filter by type.
- **Invoices** — build multi-line invoices per client, print/save as PDF,
  and mark as paid — which automatically posts the matching income entry
  to your transactions.
- **Clients** — a simple contacts list used when raising invoices.
- **VAT return** — groups transactions into UK VAT quarters and estimates
  Boxes 1, 4, 5, 6, 7 of the standard VAT return. This is a working
  estimate for your own records — always check figures before filing
  with HMRC (or hand this screen to your accountant).
- **Reports** — profit & loss by month and expenses by category.
- **Settings** — company name, number, address, VAT registration and rate.

Data lives in Firestore under `users/{yourUid}/...`, so it's private to
your account and synced instantly across devices.

## 1. Create your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and click **Add project**. Give it any name (e.g. "company-books").
   You can decline Google Analytics — you don't need it.
2. Once created, click the **</> (Web)** icon on the project overview page
   to register a web app. Give it a nickname; you don't need Firebase
   Hosting checked yet (we'll do that later, optional).
3. Firebase will show you a `firebaseConfig` object with keys like
   `apiKey`, `authDomain`, etc. Keep this tab open — you'll need it next.

## 2. Turn on Authentication and Firestore

1. In the left sidebar, go to **Build → Authentication → Get started**.
   Enable the **Email/Password** sign-in method.
   Then go to the **Users** tab and **Add user** — use your own email and
   a password. This is how you'll log into the app (it's a single-user
   app, so one login is all you need).
2. Go to **Build → Firestore Database → Create database**. Choose a
   region close to you (e.g. `europe-west2` for London) and start in
   **production mode**.
3. Once created, open the **Rules** tab and paste in the contents of
   `firestore.rules` from this project, then **Publish**. This locks
   your data down so only you (signed in) can read or write it.

## 3. Connect the app to your project

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in the values from the `firebaseConfig` object you saw in step 1,
   e.g.:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=company-books-xxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=company-books-xxxx
   VITE_FIREBASE_STORAGE_BUCKET=company-books-xxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

## 4. Run it locally

```
npm install
npm run dev
```

Open the printed local URL, sign in with the email/password you created
in step 2, and go to **Settings** first to fill in your company details.

## 5. Deploy it (optional, so you can use it from your phone)

The easiest free option is Firebase Hosting:

```
npm install -g firebase-tools
firebase login
firebase init hosting   # choose your project, set "dist" as the public folder,
                         # answer "yes" to single-page app rewrite
npm run build
firebase deploy --only hosting
```

Firebase will give you a `https://company-books-xxxx.web.app` URL you can
open from any device and even add to your phone's home screen.

## 5b. Auto-deploy on every push (recommended, matches your other apps)

This project already includes `.github/workflows/deploy.yml`, which rebuilds
and redeploys automatically every time you push to `main` — no local
commands needed after this one-time setup.

**One-time setup (about 15 minutes):**

1. **Get a Firebase service account key** — Firebase Console → your project
   → ⚙️ Project settings → **Service accounts** tab → **Generate new
   private key**. This downloads a JSON file. Keep it safe; it's a real
   credential.
2. **Add secrets to your GitHub repo** — repo → Settings → **Secrets and
   variables → Actions → New repository secret**. Add each of these:
   - `FIREBASE_SERVICE_ACCOUNT` — paste the *entire contents* of the JSON
     file from step 1
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   (the six `VITE_*` values are the same ones from your `.env` file)
3. **Push to `main`** — GitHub Actions will build and deploy automatically.
   Check the **Actions** tab on your repo to watch it run.

After this, editing a file on GitHub (or pushing from your PC) and merging
to `main` is all it takes — the live site updates itself within about a
minute. No `npm run build` or `firebase deploy` ever again.

This is the same workflow file you can drop into any future app — just
change the `projectId` in `deploy.yml` and add that app's own six secrets.

## Notes on the VAT calculator

It's a straightforward estimate built from your recorded transactions
(output VAT on income minus input VAT on expenses, grouped by calendar
quarter). It doesn't handle flat-rate scheme, partial exemption, reverse
charge, or margin schemes — if any of those apply to your company, treat
this screen as a starting point for your accountant rather than a
final return.

## Extending it later

- Add a second Firebase Auth user and update `firestore.rules` if you
  want your accountant to log in directly.
- Add file attachments for receipts using Firebase Storage.
- Add a Corporation Tax estimate (19–25% on net profit) to Reports.
