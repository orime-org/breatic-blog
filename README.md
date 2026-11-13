# Breatic Journal

Engineering notes and product updates from Breatic. This repository contains the public static blog, not the product application or production secrets.

## Work locally

Use Node.js 22.12+ and npm. Run `npm ci`, then `npm run dev`. Run `npm run build && npm run check:site` before submitting a pull request.

## Publish a post

1. Add a Markdown file under `src/content/posts/` with `title`, `description`, `date` (including timezone), `category`, and `author` frontmatter.
2. Use `Engineering` or `Product Updates` as the category. Set `draft: true` to keep a post out of the published site, RSS, and sitemap.
3. Keep the filename stable: it becomes the permanent article path.
4. Open a pull request, review the build and preview, and merge. GitHub Actions publishes `main` to GitHub Pages.
5. For a dedicated article discussion, create it in `orime-org/breatic` Discussions, then set its numeric ID in the article's `discussion` field.

All public copy is English. Verify feature claims against a pinned source commit; distinguish merged changes, released versions, and production availability. Do not include private account data, internal receipts, credentials, or unpublished roadmap promises.

## URLs and custom domain

The default site is `https://orime-org.github.io/breatic-blog/`. GitHub Actions accepts repository variables `BLOG_SITE` and `BLOG_BASE`. To migrate to the approved custom domain:

1. Verify ownership of `breatic.ai` with GitHub Pages and configure the requested verification TXT record.
2. Add a DNS CNAME for `blog.breatic.ai` pointing to `orime-org.github.io` (DNS only while GitHub provisions HTTPS).
3. Set GitHub Pages' custom domain to `blog.breatic.ai` and wait for the domain check and certificate.
4. Set `BLOG_SITE=https://blog.breatic.ai` and `BLOG_BASE=/`, then rerun the Pages workflow. The build emits `CNAME` for this domain.
5. Enable HTTPS enforcement when the certificate is ready. Verify the article, assets, RSS, sitemap, canonical URLs, and default-domain redirect.

Keep the default URL functional until custom-domain DNS and HTTPS have been verified. No server purchase is required.

## Comments and community

Article comments are giscus embeds backed by the product repository's Discussions. Readers explicitly load the third-party embed; nothing from giscus is fetched before that action. Commenting requires GitHub sign-in and giscus authorization. Reading a public discussion does not require sign-in. The giscus GitHub App must be installed for **only `orime-org/breatic`** with the permissions displayed by GitHub. Community questions go to Discussions; reproducible bugs go to product Issues.

## Content and brand

Copyright © 2026 Orime, Inc. Website text and Breatic brand assets are not relicensed by this repository. The product source remains under its own [Elastic License 2.0](https://github.com/orime-org/breatic/blob/main/LICENSE); see its [trademark policy](https://github.com/orime-org/breatic/blob/main/TRADEMARKS.md). Third-party software remains under its own license.
