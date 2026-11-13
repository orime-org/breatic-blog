import { defineConfig } from 'astro/config';
const site = process.env.BLOG_SITE || 'https://orime-org.github.io';
const base = process.env.BLOG_BASE || '/breatic-blog';
export default defineConfig({ site, base, trailingSlash: 'always', output: 'static' });
