import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { siteName, xml } from '../../../lib/site';
import { socialCardHeight, socialCardWidth } from '../../../lib/social-card';

interface Card {
  title: string;
  category?: string;
}

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return [
    { params: { card: 'journal' }, props: { title: 'Engineering notes and product updates' } },
    ...posts.map(({ id, data }) => ({
      params: { card: `articles/${id}` },
      props: { title: data.title, category: data.category },
    })),
  ];
}

const mark = readFile('public/images/mark.svg').then((svg) =>
  sharp(svg).resize(58, 58).png().toBuffer());

export const GET: APIRoute<Card> = async ({ props: { title, category } }) => {
  const label = category?.toUpperCase() ?? 'FROM BREATIC';
  const background = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${socialCardWidth}" height="${socialCardHeight}">
      <rect width="1200" height="630" fill="#f5f4ef"/>
      <text x="142" y="103" fill="#202521" font-family="sans-serif" font-size="32">${xml(siteName)}</text>
      <path d="M70 147H1130M70 505H1130" stroke="#d7d9cf" stroke-width="2"/>
      <text x="70" y="220" fill="#50724a" font-family="monospace" font-size="22" letter-spacing="3">${xml(label)}</text>
      <text x="70" y="552" fill="#686e67" font-family="monospace" font-size="22">blog.breatic.ai</text>
    </svg>`);

  const heading = await sharp({ text: {
    text: `<span foreground="#202521">${xml(title)}</span>`,
    font: 'sans-serif 72',
    width: 1060,
    height: 223,
    spacing: 8,
    rgba: true,
  } }).png().toBuffer();

  const png = await sharp(background).composite([
    { input: await mark, left: 68, top: 59 },
    { input: heading, left: 70, top: 255 },
  ]).png().toBuffer();

  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
