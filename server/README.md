# Blog Live-Publish Worker — Deployment Guide

This restores the blog's "New/Edit/Delete Post" live-publish feature
without ever putting a GitHub token in client-side code (which is what
got the previous token auto-revoked by GitHub).

## How it works

```
Admin's browser --(shared secret)--> Cloudflare Worker --(GitHub token)--> GitHub Contents API
```

The Worker (`publish-worker.js`) is the only thing that holds the real
GitHub token, as an encrypted Cloudflare secret. The browser only ever
sends the Worker a separate shared secret you make up yourself.

## Steps

1. **Create a fine-grained GitHub token**
   github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token.
   - Repository access: **Only** this repository.
   - Permissions: **Contents: Read and write**. Nothing else.
   - Copy the token — you'll paste it once in step 4 and never need it again.

2. **Install Wrangler (Cloudflare's CLI)**
   ```
   npm install -g wrangler
   wrangler login
   ```

3. **Configure the Worker**
   ```
   cd server
   cp wrangler.toml.example wrangler.toml
   ```
   Edit `wrangler.toml` if your GitHub owner/repo/branch or site domain differ
   from the defaults already filled in.

4. **Set the secrets** (these prompt you interactively — nothing is typed
   into a file):
   ```
   wrangler secret put GITHUB_TOKEN
   # paste the token from step 1

   wrangler secret put WORKER_SECRET
   # paste a random string you generate yourself, e.g.:
   #   openssl rand -hex 32
   # (macOS/Linux terminal — or any password generator)
   ```

5. **Deploy**
   ```
   wrangler deploy
   ```
   Wrangler prints your Worker's URL, something like:
   `https://ahlalbayt-blog-publish.<your-subdomain>.workers.dev`

6. **Connect the site to the Worker**
   On the live site, log in as admin → open the Blog page → tap **⚙️**
   (next to "New Post") → paste in:
   - The Worker URL from step 5
   - The same random string you used for `WORKER_SECRET` in step 4

   The page reloads and "New Post" / edit / delete become live — changes
   commit straight to `data/blog-posts.json` on GitHub, and GitHub Pages
   rebuilds automatically within a minute or two.

## If something breaks

- **"Live publish failed" toast**: the Worker call failed (network, wrong
  secret, or GitHub API issue) — your edit is still saved to this browser
  only, so nothing is lost. Try again, or check the Worker's logs with
  `wrangler tail`.
- **Token revoked again**: this shouldn't happen now, since the token only
  ever lives as a Cloudflare secret and is never committed anywhere. If it
  still gets revoked, check that `server/publish-worker.js` wasn't edited
  to hardcode it anywhere.
- **Rotating the shared secret**: run `wrangler secret put WORKER_SECRET`
  again with a new value, redeploy, then update it in the site's ⚙️
  Publish Settings too.
