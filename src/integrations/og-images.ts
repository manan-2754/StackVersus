import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { load as yamlLoad } from 'js-yaml';
import type { AstroIntegration } from 'astro';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const comparisonsDir = path.join(repoRoot, 'src/content/comparisons');
const fontPath = path.join(repoRoot, 'node_modules/typeface-roboto/files/roboto-latin-700.woff');

function h(type: string, props: Record<string, any> = {}, ...children: any[]) {
  const childArray = children.length === 1 ? children[0] : children;
  return { type, props: { ...props, children: childArray }, key: null };
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

function createOgTemplate(title: string, description: string, category: string) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: '#f7f5fc',
        color: '#05030c',
        padding: '72px 80px',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'Inter',
      },
    },
    h('div', {
      style: {
        position: 'absolute',
        inset: '0',
        background:
          'radial-gradient(circle at 80% 20%, rgba(106, 75, 205, 0.12), transparent 35%), radial-gradient(circle at 20% 80%, rgba(214, 107, 178, 0.1), transparent 35%)',
      },
    }),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '4px',
          background: 'linear-gradient(90deg, #6a4bcd, #d66bb2, #de8ad4)',
        },
      },
      null
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '28px',
        },
      },
      h(
        'span',
        {
          style: {
            fontSize: '18px',
            fontWeight: 700,
            color: '#05030c',
            backgroundColor: '#6a4bcd',
            padding: '6px 14px',
            borderRadius: '6px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          },
        },
        category || 'Benchmark'
      ),
      h(
        'span',
        {
          style: {
            fontSize: '18px',
            fontWeight: 400,
            color: 'rgba(5,3,12,0.5)',
          },
        },
        'stackversus.pages.dev'
      )
    ),
    h(
      'h1',
      {
        style: {
          fontSize: '64px',
          fontWeight: 700,
          lineHeight: 1.1,
          margin: '0 0 26px',
          color: '#05030c',
          maxWidth: '1040px',
        },
      },
      truncate(title, 90)
    ),
    h(
      'p',
      {
        style: {
          fontSize: '28px',
          lineHeight: 1.45,
          color: 'rgba(5,3,12,0.78)',
          margin: '0',
          maxWidth: '960px',
        },
      },
      truncate(description, 160)
    ),
    h(
      'div',
      {
        style: {
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        },
      },
      h(
        'span',
        {
          style: {
            fontSize: '26px',
            fontWeight: 700,
            color: '#6a4bcd',
            letterSpacing: '-0.02em',
          },
        },
        'STACK'
      ),
      h(
        'span',
        {
          style: {
            fontSize: '26px',
            fontWeight: 700,
            color: '#d66bb2',
            letterSpacing: '-0.02em',
          },
        },
        'VERSUS'
      )
    )
  );
}

async function renderPng(element: any) {
  const fontData = fs.readFileSync(fontPath);
  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
  });
  // Satori already converts text to paths, so skip the (very slow) system font scan.
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } });
  return resvg.render().asPng();
}

function parseFrontmatter(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) return {};
  return yamlLoad(match[1]) as Record<string, string>;
}

// Bump when the OG template design changes to invalidate the cache.
const TEMPLATE_VERSION = 'v2-light';
const cacheDir = path.join(repoRoot, 'node_modules/.cache/stackversus-og');

async function renderCached(title: string, description: string, category: string, outFile: string) {
  const key = createHash('sha1').update([TEMPLATE_VERSION, title, description, category].join('|')).digest('hex');
  const cached = path.join(cacheDir, `${key}.png`);
  if (fs.existsSync(cached)) {
    fs.copyFileSync(cached, outFile);
    return false;
  }
  const png = await renderPng(createOgTemplate(title, description, category));
  fs.writeFileSync(cached, png);
  fs.writeFileSync(outFile, png);
  return true;
}

export default function ogImages(): AstroIntegration {
  return {
    name: 'stackversus-og-images',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (!fs.existsSync(fontPath)) {
          console.warn('[og-images] Inter font not found; skipping OG generation.');
          return;
        }

        const ogDir = path.join(fileURLToPath(dir), 'og/comparisons');
        fs.mkdirSync(ogDir, { recursive: true });
        fs.mkdirSync(cacheDir, { recursive: true });

        let rendered = 0;
        const files = fs.readdirSync(comparisonsDir).filter((f) => f.endsWith('.md'));
        for (const file of files) {
          const slug = file.replace(/\.md$/, '');
          const data = parseFrontmatter(path.join(comparisonsDir, file));
          const title = data.title || `${slug.replace(/-/g, ' ')} comparison`;
          const description = data.description || '';
          const category = data.category || 'Benchmark';
          if (await renderCached(title, description, category, path.join(ogDir, `${slug}.png`))) rendered++;
        }

        if (
          await renderCached(
            'StackVersus — Developer Tool Comparisons',
            'Head-to-head benchmarks of frameworks, databases, SaaS, and infrastructure tools.',
            'Site',
            path.join(fileURLToPath(dir), 'og/home.png')
          )
        )
          rendered++;

        console.log(`[og-images] ${files.length + 1} OG images ready (${rendered} rendered, rest from cache).`);
      },
    },
  };
}
