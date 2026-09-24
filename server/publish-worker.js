/**
 * publish-worker.js — Cloudflare Worker
 * ============================================================================
 * Purpose: lets the site's admin blog editor (assets/js/modules/blog/blog.js)
 * publish/edit/delete posts in data/blog-posts.json on GitHub WITHOUT ever
 * shipping a GitHub token to the browser. This Worker is the only thing that
 * holds the real GitHub token — as a Cloudflare secret, never in this file,
 * never in the git repo.
 *
 * Flow: browser --(shared secret)--> this Worker --(GitHub token)--> GitHub
 * Contents API --> commits the updated data/blog-posts.json --> GitHub Pages
 * rebuilds the site automatically.
 *
 * Required Worker secrets/vars (set via `wrangler secret put <NAME>` or the
 * Cloudflare dashboard — Settings → Variables — for anything sensitive, use
 * "Encrypt"):
 *   GITHUB_TOKEN    - Fine-grained PAT, scoped to ONLY this repo, with
 *                      "Contents: Read and write" permission. Nothing else.
 *   GITHUB_OWNER    - e.g. "ahlalbayt313"
 *   GITHUB_REPO     - e.g. "The-Role-of-Ahl-al-Bayt-a.s"
 *   GITHUB_BRANCH   - e.g. "main"
 *   WORKER_SECRET   - a random string YOU make up (e.g. `openssl rand -hex 32`).
 *                      This is what the admin pastes into the site's
 *                      "⚙️ Publish Settings" prompt — NOT the GitHub token.
 *   ALLOWED_ORIGIN  - e.g. "https://ahlalbayt313.github.io"
 *                      (must match exactly, no trailing slash)
 *
 * Deploy: see /server/README.md in this repo for step-by-step instructions.
 * ============================================================================
 */

const DATA_PATH = 'data/blog-posts.json';

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ success: false, error: 'method-not-allowed' }, 405, cors);
    }

    // ── Auth: shared secret, not the GitHub token ──
    const authHeader = request.headers.get('Authorization') || '';
    const provided = authHeader.replace(/^Bearer\s+/i, '');
    if (!env.WORKER_SECRET || provided !== env.WORKER_SECRET) {
      return json({ success: false, error: 'unauthorized' }, 401, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ success: false, error: 'invalid-json' }, 400, cors);
    }

    const { action, post, postId } = body || {};
    if (action !== 'save' && action !== 'delete') {
      return json({ success: false, error: 'invalid-action' }, 400, cors);
    }
    if (action === 'save' && (!post || !post.id || !post.titleBn)) {
      return json({ success: false, error: 'invalid-post' }, 400, cors);
    }
    const idToDelete = action === 'delete' ? postId : null;
    if (action === 'delete' && !idToDelete) {
      return json({ success: false, error: 'missing-postId' }, 400, cors);
    }

    try {
      const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN } = env;
      const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`;
      const ghHeaders = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ahl-al-bayt-publish-worker',
      };

      // 1) Fetch current file (content + sha) from the branch
      const getRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders });
      if (!getRes.ok) {
        return json({ success: false, error: `github-get-failed:${getRes.status}` }, 502, cors);
      }
      const getData = await getRes.json();
      const currentJson = JSON.parse(base64DecodeUtf8(getData.content));
      if (!Array.isArray(currentJson)) {
        return json({ success: false, error: 'unexpected-file-shape' }, 500, cors);
      }

      // 2) Apply the change in memory
      let updated;
      let commitMessage;
      if (action === 'save') {
        const idx = currentJson.findIndex((p) => p.id === post.id);
        if (idx > -1) {
          updated = currentJson.slice();
          updated[idx] = post;
          commitMessage = `blog: update post "${post.titleBn}" (${post.id})`;
        } else {
          updated = [post, ...currentJson];
          commitMessage = `blog: publish new post "${post.titleBn}" (${post.id})`;
        }
      } else {
        updated = currentJson.filter((p) => p.id !== idToDelete);
        if (updated.length === currentJson.length) {
          return json({ success: false, error: 'post-not-found' }, 404, cors);
        }
        commitMessage = `blog: delete post (${idToDelete})`;
      }

      // 3) Commit the updated file back
      const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          content: base64EncodeUtf8(JSON.stringify(updated, null, 2)),
          sha: getData.sha,
          branch: GITHUB_BRANCH,
        }),
      });
      if (!putRes.ok) {
        const errBody = await putRes.text();
        return json({ success: false, error: `github-put-failed:${putRes.status}:${errBody.slice(0, 200)}` }, 502, cors);
      }

      return json({ success: true }, 200, cors);
    } catch (e) {
      return json({ success: false, error: e.message || 'worker-error' }, 500, cors);
    }
  },
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// GitHub's Contents API returns base64 that can contain newlines and
// represents UTF-8 bytes (needed for Bengali/Arabic text) — atob() alone
// mangles multi-byte characters, so decode through TextDecoder.
function base64DecodeUtf8(b64) {
  const cleaned = b64.replace(/\n/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function base64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
