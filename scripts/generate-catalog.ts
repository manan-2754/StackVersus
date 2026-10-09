/**
 * Generates data-driven comparison pages from src/data/catalog.ts.
 *
 * - Every pair of tools within a catalog category becomes a Markdown file in
 *   src/content/comparisons with `source: "catalog"` in its frontmatter.
 * - Pairs that already exist as editorial (hand-written / LLM pipeline) pages
 *   are skipped, in either order.
 * - Re-running is idempotent: catalog pages are rewritten from current data,
 *   keeping their original `date`, and stale catalog pages are removed.
 *
 * Usage: node scripts/generate-catalog.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { CATALOG, LICENSE_LABELS, slugifyTool, type CatalogTool } from '../src/data/catalog.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'src/content/comparisons');

function readFrontmatter(file: string): Record<string, string> {
  const text = fs.readFileSync(file, 'utf-8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    data[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return data;
}

const pairKey = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join('|');

const editorialPairs = new Set<string>();
const existingCatalog = new Map<string, string>();

for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
  const fm = readFrontmatter(path.join(contentDir, file));
  if (fm.source === 'catalog') {
    existingCatalog.set(file, fm.date || '');
  } else if (fm.tool_a && fm.tool_b) {
    editorialPairs.add(pairKey(fm.tool_a, fm.tool_b));
  }
}

const q = (value: string) => JSON.stringify(value);
const yesNo = (value: boolean) => (value ? 'Yes' : 'No');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PROPER_NOUNS = new Set([
  'Postgres',
  'Python',
  'Redis',
  'Kafka',
  'Jira',
  'Slack',
  'Google',
  'Microsoft',
  'Azure',
  'Vercel',
  'Cloudflare',
  'Atlassian',
  'Material',
  'Kubernetes',
  'Docker',
  'Rust',
  'Vite',
  'React',
  'Vue',
  'Svelte',
  'Tailwind',
  'Stripe',
  'Firecracker',
  'Elastic',
  'Supabase',
  'Next',
  'Node',
  'Cascade',
  'Junie',
  'Visual',
  'Zapier',
  'Heroku',
  'Truss',
  'Cog',
]);

/** Lowercase the first letter unless the first word is an acronym, brand or proper noun. */
function lowerFirst(text: string): string {
  const firstWord = text.split(/[\s,(]/)[0];
  if (!/^[A-Z][a-z]+(-[a-z]+)*$/.test(firstWord) || PROPER_NOUNS.has(firstWord.split('-')[0])) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const sentenceList = (items: string[]) => items.map(lowerFirst).join('; ');

function hostingAnswer(tool: CatalogTool): string {
  const h = tool.hosting;
  if (/desktop|runs locally/i.test(h)) return `${tool.name} runs locally on your own machine.`;
  if (/self|on-premises|enterprise server|cluster|^cli|embedded/i.test(h))
    return `${tool.name} can be self-hosted. Deployment options: ${lowerFirst(h)}.`;
  if (/library|runtime|built into/i.test(h)) return `${tool.name} runs inside your own stack: ${lowerFirst(h)}.`;
  return `${tool.name} is offered as a managed service: ${lowerFirst(h)}.`;
}

function keyDifferences(a: CatalogTool, b: CatalogTool): string[] {
  const diffs = [`**Positioning:** ${a.name} — ${lowerFirst(a.tagline)}. ${b.name} — ${lowerFirst(b.tagline)}.`];

  if (a.license !== b.license) {
    diffs.push(
      `Licensing differs: ${a.name} is ${LICENSE_LABELS[a.license].toLowerCase()} while ${b.name} is ${LICENSE_LABELS[b.license].toLowerCase()}.`
    );
  } else {
    diffs.push(
      `Both share the same licensing model (${LICENSE_LABELS[a.license].toLowerCase()}), so the decision comes down to features and workflow fit.`
    );
  }

  if (a.hosting !== b.hosting) {
    diffs.push(`**Deployment:** ${a.name} — ${lowerFirst(a.hosting)}. ${b.name} — ${lowerFirst(b.hosting)}.`);
  }

  if (a.freeTier !== b.freeTier) {
    const free = a.freeTier ? a : b;
    const paid = a.freeTier ? b : a;
    diffs.push(
      `${free.name} can be started for free, while ${paid.name} requires a paid plan. ${paid.name} pricing: ${lowerFirst(paid.pricing)}.`
    );
  } else {
    diffs.push(`**Pricing:** ${a.name} — ${lowerFirst(a.pricing)}. ${b.name} — ${lowerFirst(b.pricing)}.`);
  }

  diffs.push(`**Signature strength:** ${a.name} — ${lowerFirst(a.pros[0])}. ${b.name} — ${lowerFirst(b.pros[0])}.`);
  return diffs;
}

function toolSection(tool: CatalogTool): string {
  return [
    `### ${tool.name}`,
    '',
    `_${tool.tagline}_`,
    '',
    '**Pros:**',
    '',
    ...tool.pros.map((p) => `- ${p}`),
    '',
    '**Cons:**',
    '',
    ...tool.cons.map((c) => `- ${c}`),
  ].join('\n');
}

function renderPage(category: string, a: CatalogTool, b: CatalogTool, slug: string, date: string): string {
  const title = `${a.name} vs ${b.name}: ${category} Comparison`;
  const description = `Compare ${a.name} and ${b.name} for ${category.toLowerCase()}: pricing, licensing, hosting, pros, cons and which one fits your team.`;
  const verdict = `${a.name} for ${a.bestFor}; ${b.name} for ${b.bestFor}.`;
  const popularity = Math.round((a.popularity + b.popularity) / 2);
  const tags = [category, a.name, b.name];
  if (a.license === 'yes' || b.license === 'yes') tags.push('Open Source');

  const selfHostAnswer = `${hostingAnswer(a)} ${hostingAnswer(b)}`;

  const frontmatter = [
    '---',
    `title: ${q(title)}`,
    `description: ${q(description)}`,
    `category: ${q(category)}`,
    `tool_a: ${q(a.name)}`,
    `tool_b: ${q(b.name)}`,
    `slug: ${q(slug)}`,
    `date: ${q(date)}`,
    `source: "catalog"`,
    `verdict: ${q(verdict)}`,
    `popularity: ${popularity}`,
    `tags: [${tags.map(q).join(', ')}]`,
    `use_cases: [${[capitalize(a.bestFor), capitalize(b.bestFor)].map(q).join(', ')}]`,
    `related_tools: [${[a.name, b.name].map(q).join(', ')}]`,
    '---',
  ].join('\n');

  const body = [
    `# ${a.name} vs ${b.name}: Head-to-Head Comparison`,
    '',
    '## Quick Verdict',
    '',
    `> ${a.name} is the better pick for ${a.bestFor}. ${b.name} is the better pick for ${b.bestFor}.`,
    '',
    '---',
    '',
    '## At a Glance',
    '',
    `| Feature | ${a.name} | ${b.name} |`,
    '| :-- | :-- | :-- |',
    `| **Best For** | ${capitalize(a.bestFor)} | ${capitalize(b.bestFor)} |`,
    `| **Pricing** | ${a.pricing} | ${b.pricing} |`,
    `| **Free to Start** | ${yesNo(a.freeTier)} | ${yesNo(b.freeTier)} |`,
    `| **License** | ${LICENSE_LABELS[a.license]} | ${LICENSE_LABELS[b.license]} |`,
    `| **Deployment** | ${a.hosting} | ${b.hosting} |`,
    `| **Link** | [Visit ${a.name}](${a.url}) | [Visit ${b.name}](${b.url}) |`,
    '',
    '---',
    '',
    '## Detailed Breakdown',
    '',
    toolSection(a),
    '',
    '---',
    '',
    toolSection(b),
    '',
    '---',
    '',
    '## Key Differences',
    '',
    ...keyDifferences(a, b).map((d) => `- ${d}`),
    '',
    '---',
    '',
    '## Frequently Asked Questions',
    '',
    `### Is ${a.name} better than ${b.name}?`,
    '',
    `It depends on your requirements. ${a.name} is a strong fit for ${a.bestFor}, while ${b.name} suits ${b.bestFor}.`,
    '',
    `### Is ${a.name} free to use?`,
    '',
    `${a.freeTier ? `Yes, you can start with ${a.name} for free.` : `${a.name} does not have a permanent free plan.`} Pricing model: ${a.pricing}.`,
    '',
    `### Is ${b.name} free to use?`,
    '',
    `${b.freeTier ? `Yes, you can start with ${b.name} for free.` : `${b.name} does not have a permanent free plan.`} Pricing model: ${b.pricing}.`,
    '',
    `### Can I self-host ${a.name} or ${b.name}?`,
    '',
    selfHostAnswer,
    '',
    `### What are the main drawbacks of ${a.name} and ${b.name}?`,
    '',
    `${a.name}: ${sentenceList(a.cons)}. ${b.name}: ${sentenceList(b.cons)}.`,
    '',
  ].join('\n');

  return `${frontmatter}\n\n${body}`;
}

const today = new Date().toISOString().slice(0, 10);
const prettierConfig = (await prettier.resolveConfig(path.join(contentDir, 'x.md'))) ?? {};
const written = new Set<string>();
let skipped = 0;

for (const category of CATALOG) {
  const { tools } = category;
  for (let i = 0; i < tools.length; i++) {
    for (let j = i + 1; j < tools.length; j++) {
      const a = tools[i];
      const b = tools[j];
      if (editorialPairs.has(pairKey(a.name, b.name))) {
        skipped++;
        continue;
      }
      const slug = `${slugifyTool(a.name)}-vs-${slugifyTool(b.name)}`;
      const file = `${slug}.md`;
      if (written.has(file)) continue;
      const date = existingCatalog.get(file) || today;
      const markdown = await prettier.format(renderPage(category.name, a, b, slug, date), {
        ...prettierConfig,
        plugins: [],
        parser: 'markdown',
      });
      fs.writeFileSync(path.join(contentDir, file), markdown);
      written.add(file);
    }
  }
}

let removed = 0;
for (const file of existingCatalog.keys()) {
  if (!written.has(file)) {
    fs.unlinkSync(path.join(contentDir, file));
    removed++;
  }
}

console.log(
  `[catalog] ${written.size} catalog comparisons written, ${skipped} skipped (editorial page exists), ${removed} stale removed. ` +
    `Editorial pages: ${editorialPairs.size}. Total: ${written.size + editorialPairs.size}.`
);
