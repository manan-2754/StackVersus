# StackVersus

A programmatic SEO (PSEO) site that publishes head-to-head software comparisons for developers. Built with [Astro](https://astro.build) and a multi-agent LLM content pipeline.

## Project Structure

```text
site/
├── public/                         # Static assets (favicon, OG image, robots, manifest)
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── HudBar.astro
│   │   ├── Newsletter.astro
│   │   ├── RibbonCanvas.astro
│   │   ├── ShareButtons.astro
│   │   └── BackToTop.astro
│   ├── layouts/                    # Page shells
│   │   ├── BaseLayout.astro
│   │   └── ContentPage.astro
│   ├── content/comparisons/        # Generated comparison articles
│   ├── integrations/               # Build-time Astro integrations
│   │   └── og-images.ts            # Dynamic OG image generator
│   ├── pages/                      # Site routes
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── editorial-policy.astro
│   │   ├── privacy-policy.astro
│   │   ├── search.astro
│   │   ├── random.astro
│   │   ├── 404.astro
│   │   ├── categories/index.astro
│   │   ├── categories/[category].astro
│   │   ├── comparisons/[...slug].astro
│   │   ├── rss.xml.js
│   │   └── search.json.js
│   └── content.config.ts           # Astro content collection schema
├── astro.config.mjs
├── package.json
└── README.md

Root files:
├── generate_pseo.py                # Multi-agent LLM content generator
├── tools.csv                       # Comparison pairs and categories
└── .env.example                    # Required API keys
```

## Getting Started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Configure API keys and optional settings in a `.env` file (see `.env.example`). At least one of Gemini, Groq, or OpenRouter is required to generate new comparisons.

3. Start the development server:

   ```sh
   npm run dev
   ```

   The site will be available at `http://localhost:4321`.

## Commands

| Command                  | Action                                                |
| :----------------------- | :---------------------------------------------------- |
| `npm install`            | Installs dependencies                                 |
| `npm run dev`            | Starts local dev server at `localhost:4321`           |
| `astro dev --background` | Starts the dev server in background mode (preferred)  |
| `astro dev stop`         | Stops the background dev server                       |
| `astro dev status`       | Checks the background dev server status               |
| `npm run build`          | Runs `generate_pseo.py` then builds to `./dist/`      |
| `npx astro build`        | Builds the Astro site only (skips content generation) |
| `npm run preview`        | Preview the build locally                             |
| `npm run format`         | Formats files with Prettier                           |
| `npm run format:check`   | Checks formatting without writing                     |
| `npm run typecheck`      | Runs Astro + TypeScript checks                        |
| `npm run astro ...`      | Run Astro CLI commands                                |

## Content Generation

Comparisons are generated from `tools.csv` using `generate_pseo.py`. The script dispatches each pair to multiple LLM providers (Gemini, Groq, OpenRouter), scores the outputs, and writes Markdown files to `site/src/content/comparisons/`.

To regenerate only missing comparisons:

```sh
python generate_pseo.py
```

To force regeneration, delete the existing Markdown files first.

## Key Features

- **Shared layouts and components** for consistent SEO, navigation, and styling.
- **JSON-LD structured data** including WebSite, CollectionPage, TechArticle, BreadcrumbList, FAQPage, and SoftwareApplication schemas.
- **Client-side search** powered by Fuse.js on the homepage and a dedicated `/search` page.
- **JSON search index** available at `/search.json` for integrations.
- **RSS feed** at `/rss.xml` and a `/random` comparison page.
- **Share buttons** and an on-page table of contents on comparison detail pages.
- **Related comparisons** surfaced on each detail page.
- **Latest updates** section on the homepage.
- **Performance-conscious canvas** background with reduced-motion support and visibility-state throttling.
- **Dynamic OG images** generated at build time for every comparison and the homepage.
- **Real affiliate registry** with honest disclosure; official URLs are used when no affiliate partnership exists.
- **Outbound-click analytics** layer that supports Google Analytics, Plausible, or Cloudflare Web Analytics.
- **Newsletter capture** component with a configurable provider endpoint and a graceful fallback.
- **Contact & corrections** page with a mailto fallback or a configurable form handler.
- **Privacy-first analytics** hook via `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
- **Privacy-first 404 page** and accessible skip links/focus states.

## Deployment

The site is configured for static output and can be deployed to Cloudflare Pages, Vercel, Netlify, or any static host. The live target is `https://stackversus.pages.dev`.

A GitHub Actions workflow is included in `.github/workflows/deploy.yml` for Cloudflare Pages. Configure the following secrets in your repository:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (only needed if `generate_pseo.py` runs during CI)

If you prefer not to regenerate content in CI, set the build command to `npx astro build` and commit the generated Markdown files.

## License

Independent developer tooling benchmarks.
