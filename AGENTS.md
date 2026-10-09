## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Catalog comparisons

- Tool data lives in `src/data/catalog.ts`. Run `npm run generate:catalog` to regenerate the data-driven comparison pages (`source: "catalog"`) in `src/content/comparisons`. Never hand-edit those files; edit the catalog instead.
- Pairs that already have an editorial page are skipped automatically.
- OG images are cached in `node_modules/.cache/stackversus-og`; bump `TEMPLATE_VERSION` in `src/integrations/og-images.ts` after changing the OG design.
- Verify with `npm run format:check`, `npm run typecheck`, `npx astro build`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
