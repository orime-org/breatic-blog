import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../dist/', import.meta.url);
async function files(directory) { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(new URL(`${entry.name}/`, directory)) : new URL(entry.name, directory)))).flat(); }
const output = await files(root);
const home = await readFile(new URL('index.html', root), 'utf8');
const canonical = new URL(home.match(/<link rel="canonical" href="([^"]+)"/)[1]);
const prefix = canonical.pathname.replace(/\/$/, '');
let checked = 0;
for (const file of output.filter((entry) => entry.pathname.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  assert.match(html, /<html lang="en"/); assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /name="description"/); assert.match(html, /name="viewport"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.ok(!html.includes('DRAFT_SENTINEL'), 'Draft content must stay private');
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const raw = match[1]; if (!raw.startsWith('/')) continue;
    const url = new URL(raw, canonical); if (url.origin !== canonical.origin) continue;
    assert.ok(url.pathname === prefix || url.pathname.startsWith(`${prefix}/`), `Wrong base path: ${raw}`);
    let relative = decodeURIComponent(url.pathname.slice(prefix.length).replace(/^\//, ''));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    try { assert.ok((await stat(new URL(relative, root))).isFile()); } catch { throw new Error(`Broken internal link ${raw} in ${file.pathname}`); }
    checked++;
  }
}
const article = await readFile(new URL('trimming-web-animations/index.html', root), 'utf8');
assert.match(article, /id="article-comments"/); assert.match(article, /Load comments from GitHub/);
assert.match(article, /id="playhead"/); assert.match(article, /application\/ld\+json/);
assert.ok(!/<script[^>]*src="https:\/\/giscus/.test(article), 'Comments must not load before reader action');
for (const name of ['rss.xml', 'sitemap.xml', 'robots.txt']) { const text = await readFile(new URL(name, root), 'utf8'); assert.ok(text.includes(canonical.origin)); assert.ok(!text.includes('DRAFT_SENTINEL')); }
assert.ok((await stat(new URL('images/social-card.png', root))).size > 1000);
console.log(`Verified ${output.length} generated files, ${checked} local references, article metadata, opt-in comments, feeds and share image.`);
