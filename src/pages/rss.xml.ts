import { getCollection } from 'astro:content';
import { siteName, description, path, xml } from '../lib/site';
export async function GET(context: { site: URL }): Promise<Response> {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const url = (slug: string): string => new URL(path(slug), context.site).href;
  const items = posts.map((p) => `<item><title>${xml(p.data.title)}</title><description>${xml(p.data.description)}</description><link>${xml(url(`${p.id}/`))}</link><guid isPermaLink="true">${xml(url(`${p.id}/`))}</guid><pubDate>${p.data.date.toUTCString()}</pubDate></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(siteName)}</title><link>${xml(url(''))}</link><description>${xml(description)}</description><language>en</language>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
