import { defineConfig, type TinaField, type TinaTemplate } from 'tinacms';

/**
 * Branch resolution.
 *
 * - `NEXT_PUBLIC_TINA_BRANCH` — set explicitly. Worth setting on Vercel for Production AND
 *   Preview, because this value decides which TinaCloud branch the editor writes to.
 * - `VERCEL_GIT_COMMIT_REF` — Vercel's system variable for the branch being built. Note the
 *   name: Vercel does NOT provide a `NEXT_PUBLIC_`-prefixed variant, so an earlier revision
 *   of this file referenced a variable that never exists on Vercel.
 * - `HEAD` — Netlify's equivalent.
 *
 * Caveat: on a preview deployment this resolves to the feature branch, which TinaCloud must
 * have indexed, otherwise `tinacms build` fails with "Branch '<name>' is not on TinaCloud".
 * Pinning `NEXT_PUBLIC_TINA_BRANCH=main` instead makes preview editors edit `main` — content
 * that is not what the preview URL renders. Choose deliberately; see DEPLOYMENT.md.
 */
const branch =
  process.env.NEXT_PUBLIC_TINA_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

/**
 * Shared rich-text templates = the custom components an editor can insert from the
 * rich-text "embed" menu.
 *
 * RULES (verified against TinaCMS 3.13):
 *  1. `name` MUST be PascalCase. A lowercase name is treated as raw HTML by the MDX
 *     parser and renders as literal text instead of a React component.
 *  2. `name` MUST match the key used in the `components` map passed to <TinaMarkdown>.
 *  3. Attribute/prop types must match the field types declared here. Declaring a field
 *     as `rich-text` and then passing a string attribute makes the whole body fall back
 *     to an `invalid_markdown` node. Nested rich text must use `children`.
 *  4. `children` and `mark` are reserved field names - do not use them.
 */
const richTextTemplates: TinaTemplate[] = [
  {
    name: 'Callout',
    label: '提示框 (Callout)',
    fields: [
      {
        name: 'type',
        label: '类型',
        type: 'string',
        options: ['info', 'warning', 'success', 'danger'],
        required: true,
      },
      {
        name: 'title',
        label: '标题',
        type: 'string',
      },
      {
        name: 'body',
        label: '正文',
        type: 'string',
        ui: { component: 'textarea' },
      },
      {
        // Nested rich text goes through child nodes, not an attribute.
        name: 'children',
        label: '内容（富文本）',
        type: 'rich-text',
      },
    ],
  },
  {
    name: 'Counter',
    label: '计数器 (Counter)',
    fields: [
      { name: 'label', label: '按钮文字', type: 'string' },
      { name: 'initialValue', label: '初始值', type: 'number' },
      { name: 'step', label: '步长', type: 'number' },
    ],
  },
  {
    name: 'Tabs',
    label: '标签页 (Tabs)',
    fields: [
      {
        name: 'tabs',
        label: '标签页列表',
        type: 'object',
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.label ?? '标签页' }),
        },
        fields: [
          { name: 'label', label: '标签名', type: 'string', required: true },
          { name: 'content', label: '内容', type: 'string', ui: { component: 'textarea' } },
        ],
      },
    ],
  },
  {
    name: 'Figure',
    label: '图片 (Figure)',
    fields: [
      { name: 'src', label: '图片', type: 'image', required: true },
      { name: 'alt', label: '替代文字 (alt)', type: 'string' },
      { name: 'caption', label: '图注', type: 'string' },
      {
        name: 'width',
        label: '宽度 (px)',
        type: 'number',
      },
      {
        name: 'height',
        label: '高度 (px)',
        type: 'number',
      },
      {
        name: 'priority',
        label: '优先加载（首屏图片）',
        type: 'boolean',
      },
    ],
  },
  {
    name: 'VideoEmbed',
    label: '视频 (Video)',
    fields: [
      {
        name: 'provider',
        label: '平台',
        type: 'string',
        options: ['youtube', 'bilibili'],
        required: true,
      },
      {
        name: 'videoId',
        label: '视频 ID 或链接',
        type: 'string',
        description: '可以填视频 ID，也可以直接粘贴完整链接。',
        required: true,
      },
      { name: 'title', label: '标题（无障碍）', type: 'string' },
      { name: 'caption', label: '说明文字', type: 'string' },
    ],
  },
];

const postFields: TinaField[] = [
  {
    type: 'string',
    name: 'title',
    label: '标题',
    isTitle: true,
    required: true,
  },
  {
    type: 'datetime',
    name: 'date',
    label: '发布日期',
    required: true,
    ui: { dateFormat: 'YYYY-MM-DD' },
  },
  {
    type: 'string',
    name: 'description',
    label: '摘要',
    ui: { component: 'textarea' },
  },
  {
    type: 'string',
    name: 'tags',
    label: '标签',
    list: true,
  },
  {
    type: 'image',
    name: 'cover',
    label: '封面图',
  },
  {
    type: 'boolean',
    name: 'draft',
    label: '草稿（不在列表中展示）',
  },
  {
    type: 'rich-text',
    name: 'body',
    label: '正文',
    isBody: true,
    templates: richTextTemplates,
  },
];

export default defineConfig({
  branch,
  // Both are required for TinaCloud. Provided through environment variables.
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'post',
        label: '博客文章',
        path: 'content/posts',
        // `format: 'mdx'` is what enables custom components inside the body.
        format: 'mdx',
        ui: {
          filename: {
            readonly: false,
            slugify: (values) =>
              `${values?.title ?? ''}`
                .trim()
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, '-')
                .replace(/^-+|-+$/g, '') || 'untitled',
          },
        },
        fields: postFields,
      },
      {
        name: 'page',
        label: '独立页面',
        path: 'content/pages',
        format: 'mdx',
        ui: {
          filename: {
            readonly: false,
            slugify: (values) =>
              `${values?.title ?? ''}`
                .trim()
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, '-')
                .replace(/^-+|-+$/g, '') || 'untitled',
          },
        },
        fields: [
          { type: 'string', name: 'title', label: '标题', isTitle: true, required: true },
          {
            type: 'rich-text',
            name: 'body',
            label: '正文',
            isBody: true,
            templates: richTextTemplates,
          },
        ],
      },
    ],
  },
});
