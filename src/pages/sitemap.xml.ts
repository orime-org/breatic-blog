import { getCollection } from 'astro:content'; import { path, xml } from '../lib/site';
export async function GET(context: { site: URL }): Promise<Response> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const routes = ['', 'engineering/', 'product-updates/', ...posts.map((p) => `${p.id}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((r) => `<url><loc>${xml(new URL(path(r), context.site).href)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
