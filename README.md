# Zwaartekracht (Gravity)

A small juggling game for Poëziedag (theme: *Gravity*) at Sint-Catharinacollege Geraardsbergen. Teachers fall down; click or tap them while they drop to launch them back up (+1). Each teacher pops after a random 3–6 clicks (+3 bonus); the ring colour goes green → orange → red as it gets close. Let one hit the ground and you lose a life — 5 lives, then game over with your score. The game text is in Dutch.

## Adding teacher photos

1. Put square-ish photos (~256×256 jpg/png/webp) in `assets/teachers/`.
2. List them in `src/teachers.js`, e.g. `{ name: 'Mr. Peeters', photo: 'assets/teachers/peeters.jpg' }`.

Teachers without a photo show as a coloured circle with their initials.

## Highscores (Supabase)

Players enter their name before starting; scores go to a shared top-10 list next to the game.
Until Supabase is configured, the list only shows scores from the current device.

1. Create a free project at https://supabase.com.
2. In the project: **SQL Editor → New query**, paste `supabase/migrations/20261117000000_create_scores.sql` (or let the Supabase GitHub integration apply it on push), click **Run**.
3. Copy the **Project URL** and the **publishable / anon public key** into `src/config.js`
   (never the secret / service_role key), then push.

To remove an inappropriate name: **Table Editor → scores**, select the row, delete.
Note: scores are submitted by the browser, so a determined student could post a fake score;
the database only limits names to 20 characters and scores to 1–100000.

## Tuning

Difficulty settings (gravity, how fast new teachers join, max on screen) are at the top of `src/game.js`.

## Run locally

Open `index.html` via any static server, e.g.:

```bash
npx serve .
```

## Deploy

Every push to `main` deploys automatically via `.github/workflows/pages.yml`.

## Taking it offline

When the run is over, either:

- **Unpublish only:** repo → Settings → Pages → *Unpublish site* (or `gh api -X DELETE repos/OWNER/REPO/pages`)
- **Archive:** `gh repo archive OWNER/REPO` after unpublishing, to keep the code read-only
