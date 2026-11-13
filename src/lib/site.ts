export const siteName = 'Breatic Journal';
export const description = 'Engineering notes and product updates from a collaborative AI creation workspace.';
export const community = 'https://github.com/orime-org/breatic/discussions';
export const repository = 'https://github.com/orime-org/breatic-blog';
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const path = (value = ''): string => `${base}/${value.replace(/^\//, '')}`;
export const dateLabel = (date: Date): string => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Singapore' });
export const xml = (value: string): string => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));
