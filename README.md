# WebGame

A small browser game, hosted on GitHub Pages for a limited run.

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
