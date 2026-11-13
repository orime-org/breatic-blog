import { path } from '../lib/site';
export function GET(context: { site: URL }): Response { return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(path('sitemap.xml'), context.site).href}\n`); }
