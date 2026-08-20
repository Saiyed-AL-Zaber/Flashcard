# Study Desk — Flashcards

A flashcard app (folders → sets → cards, colored cards, study mode, and
True/False, Multiple Choice, and Written tests) that syncs live between
your computer and phone using Supabase — **no credit card required** —
and deploys free on GitHub Pages.

## 1. Create a free Supabase project (5 min, no card needed)

1. Go to https://supabase.com → **Start your project** → sign in (GitHub login is easiest) → **New project**.
2. Give it any name, pick a database password (save it somewhere, you likely won't need it again), pick a region close to you → **Create new project**. It takes a minute or two to spin up.

## 2. Create the table that stores your flashcards

1. In your new project, click **SQL Editor** in the left sidebar → **New query**.
2. Paste this in and click **Run**:

   ```sql
   create table flashcard_data (
     user_id uuid primary key references auth.users(id) on delete cascade,
     data jsonb not null default '{"folders":[],"sets":[]}',
     dark boolean not null default false,
     updated_at timestamptz not null default now()
   );

   alter table flashcard_data enable row level security;

   create policy "read own data" on flashcard_data
     for select using (auth.uid() = user_id);

   create policy "insert own data" on flashcard_data
     for insert with check (auth.uid() = user_id);

   create policy "update own data" on flashcard_data
     for update using (auth.uid() = user_id);
   ```

   This creates one row per user and makes sure nobody can ever read or write anyone else's flashcards.

3. Turn on live sync: go to **Database → Replication** in the sidebar, find `flashcard_data`, and toggle it **on**.

## 3. Turn off "confirm your email" (optional, but simpler for personal use)

By default, Supabase makes new users click a confirmation link before they can log in. For a personal app that's an extra hurdle, so you can skip it:

**Authentication → Providers → Email → turn off "Confirm email"** → Save.

(You can leave this on if you'd rather have that extra step — the app already handles either case.)

## 4. Get your project's API keys

**Project Settings → API**. You'll need two values:

- **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
- **anon public** key (a long string)

Open `src/supabase.js` in this project and paste them in:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

## 5. Try it locally (optional but recommended)

You'll need [Node.js](https://nodejs.org) installed.

```bash
npm install
npm run dev
```

Open the URL it prints, sign up with an email + password, and try adding a folder.

## 6. Push this project to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

## 7. Set the base path

Open `vite.config.js` and make sure `base` matches your repo name exactly:

```js
base: "/<your-repo-name>/",
```

(If this repo is named exactly `<your-username>.github.io`, set `base: "/"` instead.)

Commit and push that change too.

## 8. Turn on GitHub Pages

In your GitHub repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The included workflow (`.github/workflows/deploy.yml`) builds and publishes the site automatically every time you push to `main`. After a minute or two, your app will be live at:

```
https://<your-username>.github.io/<your-repo-name>/
```

## 9. Use it on your phone and computer

1. Open that URL on your computer, sign up once (email + password).
2. Open the same URL on your phone and **log in with the same email/password**.
3. Add a card on your phone — it appears on your computer within a second or two, automatically.

## Offline support

This app works offline:

- **The app itself** (all the code, styling, and the icon) is cached on your device the first time you open it online, so it'll still open with no signal at all.
- **Your flashcards** are cached locally too, so you can browse folders and study already-loaded sets with zero connection.
- Anything you add or edit while offline is saved on your device and automatically pushed to sync the moment you're back online.
- A small "Synced" / "Offline" indicator near the top tells you which state you're in.
- To install it as a real app icon on your phone: open the site, then use your browser's "Add to Home Screen" (iOS Safari) or it may prompt "Install app" automatically (Android Chrome).

## Good to know

- **No credit card, ever.** Supabase's free tier doesn't ask for one, even to create the database.
- **7-day auto-pause:** if the project gets zero activity for 7 days, Supabase pauses it automatically. If your app ever stops loading, log in at supabase.com, open the project, and click "Restore" — nothing is lost, it just needs waking up. Using the app even occasionally prevents this entirely.
- This login is separate from your Anthropic/Claude account — it's just a simple account for this app.
- Want it to feel like a native app on your phone? Open the deployed link in your phone's browser, then use "Add to Home Screen."
