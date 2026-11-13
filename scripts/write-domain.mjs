import { writeFile } from 'node:fs/promises';
const url = process.env.BLOG_SITE && new URL(process.env.BLOG_SITE);
if (url && url.hostname !== 'orime-org.github.io') await writeFile('dist/CNAME', `${url.hostname}\n`);
