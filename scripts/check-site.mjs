import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
async function files(directory) { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(new URL(`${entry.name}/`, directory)) : new URL(entry.name, directory)))).flat(); }
const output = await files(root);
const home = await readFile(new URL('index.html', root), 'utf8');
const canonical = new URL(home.match(/<link rel="canonical" href="([^"]+)"/)[1]);
const prefix = canonical.pathname.replace(/\/$/, '');
const covers = new Map();
const articleCovers = new Set();
let checked = 0;
for (const file of output.filter((entry) => entry.pathname.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  assert.match(html, /<html lang="en"/); assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /name="description"/); assert.match(html, /name="viewport"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.ok(!html.includes('DRAFT_SENTINEL'), 'Draft content must stay private');
  const openGraphImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const twitterImage = html.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1];
  assert.ok(openGraphImage, `Missing share image in ${file.pathname}`);
  assert.equal(twitterImage, openGraphImage, `Share images disagree in ${file.pathname}`);
  const cover = new URL(openGraphImage);
  assert.equal(cover.origin, canonical.origin);
  const isArticle = html.includes('property="og:type" content="article"');
  if (isArticle) {
    const articleUrl = new URL(html.match(/<link rel="canonical" href="([^"]+)"/)[1]);
    const slug = articleUrl.pathname.slice(prefix.length).replace(/^\/|\/$/g, '');
    assert.equal(cover.pathname, `${prefix}/images/social/articles/${slug}.png`);
  } else {
    assert.equal(cover.pathname, `${prefix}/images/social/journal.png`);
  }
  if (!covers.has(cover.href)) {
    const png = await readFile(new URL(cover.pathname.slice(prefix.length + 1), root));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    const hash = createHash('sha256').update(png).digest('hex');
    covers.set(cover.href, hash);
  }
  if (isArticle) articleCovers.add(cover.href);
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
assert.equal(covers.size, articleCovers.size + 1);
assert.equal(new Set(covers.values()).size, covers.size, 'Share covers must use distinct images');
console.log(`Verified ${output.length} generated files, ${checked} local references, article metadata, opt-in comments, feeds and ${covers.size} share images.`);
