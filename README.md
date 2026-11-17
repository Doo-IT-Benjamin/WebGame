# Gravity

A small juggling game for Poetry Day (theme: *Gravity*). Teachers fall down; click or tap them while they drop to launch them back up. Let one hit the ground and you lose a life — 5 lives, then game over with your score (number of successful clicks).

## Adding teacher photos

1. Put square-ish photos (~256×256 jpg/png/webp) in `assets/teachers/`.
2. List them in `src/teachers.js`, e.g. `{ name: 'Mr. Peeters', photo: 'assets/teachers/peeters.jpg' }`.

Teachers without a photo show as a coloured circle with their initials.

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
