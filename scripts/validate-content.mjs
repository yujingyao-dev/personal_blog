/**
 * Content validator: fail the build if any MDX body cannot be parsed.
 *
 * Why this exists: when TinaCMS's MDX parser cannot parse a body, `parseMDX` replaces the
 * ENTIRE body with a single `invalid_markdown` node instead of reporting an error. The page
 * then renders raw MDX source (or, with our renderer, a "content unavailable" notice) while
 * the build and deploy both succeed. A typo like `<Callout typo="x" />`, or an attribute
 * whose type does not match the field declared in tina/config.ts, therefore ships silently.
 *
 * This reads the `.mdx` files straight from disk and re-parses each body with the same
 * parser the CMS uses. Reading files (rather than querying the content API) keeps the check
 * deterministic and offline: it does not depend on the API's file watcher having indexed a
 * change, and it runs during the production build as well as locally.
 *
 * Usage: node scripts/validate-content.mjs [--strict]
 *   --strict  treat raw HTML nodes (unregistered/lowercase component names) as failures
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseMDX } from '@tinacms/mdx';
import yaml from 'js-yaml';

const strict = process.argv.includes('--strict');

const COLLECTIONS = [
  { name: 'post', label: '博客文章', dir: 'content/posts' },
  { name: 'page', label: '独立页面', dir: 'content/pages' },
];

/**
 * Mirrors the rich-text field in tina/config.ts. `parser.type: 'mdx'` is what a collection's
 * `format: 'mdx'` resolves to, and the template descriptors must match the schema so that
 * attribute/field type mismatches are detected exactly as they are at runtime.
 */
const richTextField = {
  type: 'rich-text',
  name: 'body',
  parser: { type: 'mdx' },
  templates: [
    {
      name: 'Callout',
      fields: [
        { name: 'type', type: 'string', options: ['info', 'warning', 'success', 'danger'] },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'children', type: 'rich-text' },
      ],
    },
    {
      name: 'Counter',
      fields: [
        { name: 'label', type: 'string' },
        { name: 'initialValue', type: 'number' },
        { name: 'step', type: 'number' },
      ],
    },
    {
      name: 'Tabs',
      fields: [
        {
          name: 'tabs',
          type: 'object',
          list: true,
          fields: [
            { name: 'label', type: 'string' },
            { name: 'content', type: 'string' },
          ],
        },
      ],
    },
    {
      name: 'Figure',
      fields: [
        { name: 'src', type: 'image' },
        { name: 'alt', type: 'string' },
        { name: 'caption', type: 'string' },
        { name: 'width', type: 'number' },
        { name: 'height', type: 'number' },
        { name: 'priority', type: 'boolean' },
      ],
    },
    {
      name: 'VideoEmbed',
      fields: [
        { name: 'provider', type: 'string', options: ['youtube', 'bilibili'] },
        { name: 'videoId', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'caption', type: 'string' },
      ],
    },
  ],
};

/** Split YAML frontmatter from the body. */
function splitFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { data: {}, body: source };

  let data = {};
  try {
    data = yaml.load(match[1]) ?? {};
  } catch {
    /* malformed frontmatter is reported separately by TinaCMS */
  }
  return { data, body: match[2] ?? '' };
}

/** Collect invalid_markdown nodes, including ones nested inside other nodes. */
function findInvalidNodes(node, path = [], found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((child, index) => findInvalidNodes(child, [...path, index], found));
    return found;
  }
  if (node.type === 'invalid_markdown') {
    found.push({ path, message: node.message ?? '(no message)' });
  }
  if (Array.isArray(node.children)) findInvalidNodes(node.children, [...path, 'children'], found);
  if (node.props && typeof node.props === 'object' && node.props.children) {
    findInvalidNodes(node.props.children, [...path, 'props', 'children'], found);
  }
  return found;
}

/**
 * Collect raw-HTML nodes. A component whose name is not PascalCase, or is not registered in
 * `richTextTemplates`, is not an error — the parser quietly treats it as raw HTML, so the
 * element shows up as literal text on the page. Worth reporting.
 */
function findHtmlNodes(node, path = [], found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((child, index) => findHtmlNodes(child, [...path, index], found));
    return found;
  }
  if (node.type === 'html') {
    found.push({ path, value: String(node.value ?? '') });
  }
  if (Array.isArray(node.children)) findHtmlNodes(node.children, [...path, 'children'], found);
  if (node.props && typeof node.props === 'object' && node.props.children) {
    findHtmlNodes(node.props.children, [...path, 'props', 'children'], found);
  }
  return found;
}

const problems = [];
const warnings = [];
let checked = 0;
let documents = 0;

for (const collection of COLLECTIONS) {
  let files;
  try {
    // Recursive on purpose: a post in a subfolder (`content/posts/2026/x.mdx`) is a valid,
    // linkable route, so it must not escape this gate. `withFileTypes` is used to rebuild the
    // path relative to the collection.
    files = readdirSync(collection.dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
      .map((entry) => {
        const parent = entry.parentPath ?? entry.path ?? collection.dir;
        return relative(collection.dir, join(parent, entry.name)).split(sep).join('/');
      });
  } catch {
    continue; // collection directory does not exist yet
  }

  for (const file of files) {
    const relativePath = `${collection.dir}/${file}`;
    const source = readFileSync(join(collection.dir, file), 'utf8');
    const { data, body } = splitFrontmatter(source);

    // An empty rich-text field is legitimate; only validate actual content.
    if (!body || body.trim() === '') continue;

    documents += 1;
    checked += 1;

    const ast = parseMDX(body, richTextField, (imagePath) => imagePath);
    const invalid = findInvalidNodes(ast);
    if (invalid.length > 0) {
      const wholeBody = ast.children?.length === 1 && ast.children[0]?.type === 'invalid_markdown';
      problems.push({
        path: relativePath,
        title: data?.title,
        message: invalid[0].message,
        wholeBody,
      });
    }

    for (const htmlNode of findHtmlNodes(ast)) {
      warnings.push({ path: relativePath, title: data?.title, value: htmlNode.value.slice(0, 80) });
    }
  }
}

console.log(`Checked ${checked} rich-text body/bodies across ${documents} document(s).`);

if (warnings.length > 0) {
  console.warn('\n⚠ Raw HTML nodes found (these render as literal text, not components):\n');
  for (const warning of warnings) {
    console.warn(`  • ${warning.path}${warning.title ? ` — ${warning.title}` : ''}`);
    console.warn(`      ${warning.value}`);
  }
  console.warn(
    '\nThis usually means a component name was written in lowercase (the MDX parser treats\n' +
      '<callout /> as raw HTML — names must be PascalCase) or the component is not registered\n' +
      'in richTextTemplates in tina/config.ts.\n'
  );
}

if (problems.length > 0) {
  console.error('\n✖ Content validation failed:\n');
  for (const problem of problems) {
    console.error(`  • ${problem.path}${problem.title ? ` — ${problem.title}` : ''}`);
    console.error(`      ${problem.message}`);
    if (problem.wholeBody) {
      console.error('      (the whole body was replaced by one invalid_markdown node)');
    }
  }
  console.error(
    '\nCommon causes: a misspelled attribute on an embed, an attribute whose value does not\n' +
      'match the field type declared in tina/config.ts (a `rich-text` field cannot be passed\n' +
      'as a string attribute — use nested children instead), or a component name that is not\n' +
      'registered in richTextTemplates (names must be PascalCase).\n'
  );
  process.exit(1);
}

if (warnings.length > 0 && strict) {
  console.error('✖ Treating raw HTML nodes as failures (--strict).\n');
  process.exit(1);
}

console.log('✔ All rich-text bodies parsed cleanly.');
