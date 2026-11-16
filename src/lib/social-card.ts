export const socialCardWidth = 1200;
export const socialCardHeight = 630;

export const socialCardPath = (slug?: string) =>
  slug === undefined ? 'images/social/journal.png' : `images/social/articles/${slug}.png`;
