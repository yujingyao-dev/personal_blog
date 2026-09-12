# 个人博客 · Next.js + TinaCMS + Tailwind CSS

一个纯静态（SSG）的个人博客，使用 TinaCMS 可视化编辑器管理 MDX 内容，并支持在编辑器中直接插入**自定义交互组件**。

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **样式**：Tailwind CSS v4（`@tailwindcss/postcss` + `@tailwindcss/typography`）
- **CMS**：TinaCMS 3（TinaCloud 托管后端）
- **内容渲染**：Tina 官方 `<TinaMarkdown>`（**不使用** `next-mdx-remote` / `@next/mdx`）

---

## 快速开始

```bash
npm install
npm run dev
```

- 站点：http://localhost:3000
- 可视化编辑器：http://localhost:3000/admin/index.html

`npm run dev` 会同时启动 TinaCMS 本地内容 API（http://localhost:4001/graphql）和 Next.js。
你可以在编辑器里新建/编辑文章、插入自定义组件，保存后会直接写入 `content/` 下的 `.mdx` 文件。

> 本地开发不需要 TinaCloud 账号，用的是本地文件内容 API。

### 构建

```bash
npm run build     # 生产构建（需要 TinaCloud 凭据，见 DEPLOYMENT.md）
npm run build:local  # 无凭据的本地静态构建验证（见下文）
npm run start     # 启动生产服务器
npm run typecheck # tsc --noEmit
npm run check:env # 只检查 TinaCMS 环境变量
```

`npm run build` 会先跑 `scripts/check-env.mjs --strict`：因为 TinaCMS 的 admin 是**静态构建的 SPA**，
`NEXT_PUBLIC_TINA_CLIENT_ID` 会被烘焙进 `public/admin/assets/*.js`。如果 Vercel 构建时缺这个变量
（或还是 `.env.example` 里的占位符），线上编辑器会指向一个不存在的项目、只在浏览器里报错。
这个前置检查会让构建**直接失败并说明怎么修**，而不是产出一个坏掉的 admin。

完整的上线步骤见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)。

---

## 目录结构

```
tina/config.ts              内容模型（schema）——唯一的配置入口
tina/tina-lock.json         自动生成，需提交到 git
content/posts/*.mdx         博客文章
content/pages/*.mdx         独立页面（如「关于」）
public/uploads/             媒体库
public/admin/               tinacms build 生成的编辑器 SPA
src/app/                    路由（列表页 / 详情页 / 关于）
src/components/tina-markdown.tsx    ★ 组件映射表（TinaMarkdown 渲染层）
src/components/mdx/         自定义交互组件
```

---

## 如何新增一个「可视化编辑器里可插入」的自定义组件

只需三步，**三处名字必须完全一致（PascalCase）**：

### 1. 在 `tina/config.ts` 的 `richTextTemplates` 里声明模板

```ts
{
  name: 'Callout',          // ① 必须大写开头，且与下面两处一致
  label: '提示框 (Callout)',
  fields: [
    { name: 'type', label: '类型', type: 'string', options: ['info', 'warning'] },
    { name: 'body', label: '正文', type: 'string', ui: { component: 'textarea' } },
    { name: 'children', label: '内容（富文本）', type: 'rich-text' },
  ],
}
```

### 2. 写 React 组件（需要交互就加 `'use client'`）

`src/components/mdx/my-component.tsx`：

```tsx
'use client';
import { useState } from 'react';

export function MyComponent({ label }: { label?: string | null }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen((v) => !v)}>{label}</button>;
}
```

### 3. 注册到 `src/components/tina-markdown.tsx` 的 `components` 映射表

```tsx
const components = {
  Callout: (props) => <Callout {...props} />,
  MyComponent: (props: { label?: string | null }) => <MyComponent {...props} />, // ② 同名
};
```

完成后编辑器「插入组件」菜单里就会出现该项，保存后 `content/**.mdx` 里会写入
`<MyComponent label="..." />`。

### ⚠️ 三个必须遵守的规则（踩坑记录）

1. **组件名必须 PascalCase**。`<myComponent />` 会被 MDX 解析器当成原始 HTML，
   页面上会原样显示成一行文本，而不是渲染成组件。
2. **属性类型必须与模板字段类型匹配**。把声明为 `rich-text` 的字段用属性传字符串，
   整个正文会退化成 `invalid_markdown` 节点（报 `Unable to parse field value`）。
   纯文本属性用 `type: 'string'`；嵌套富文本必须走 `children` 子节点。
3. **`children` 和 `mark` 是保留字段名**，不能用作自定义字段名。

### 不同形态组件的推荐做法

| 组件形态 | Schema 写法 | 示例 |
| --- | --- | --- |
| 纯展示 | 若干 `string` 字段 | `Callout` |
| 展示 + 嵌套富文本 | 加 `children`（`rich-text`） | `Callout` |
| 交互（本地状态） | `'use client'` + `useState` | `Counter` |
| 交互 + 列表数据 | `type: 'object', list: true` | `Tabs`（注意列表内用 `string`，不要用 `rich-text`） |

---

## 部署到 Vercel

1. 把仓库推到 GitHub（**必须包含 `tina/tina-lock.json`**）。
2. 在 https://app.tina.io 创建项目并绑定该仓库，拿到 `Client ID` 与 `Read Only Token`。
3. 本地 `.env` 填入（**Tina 构建只读 `.env`，不读 `.env.local`**）：
   ```bash
   NEXT_PUBLIC_TINA_CLIENT_ID=...
   TINA_TOKEN=...
   NEXT_PUBLIC_TINA_BRANCH=main
   ```
4. Vercel 导入仓库：
   - **Build Command** 保持 `npm run build`（即 `tinacms build && next build`）。
     如果 Vercel 把它覆盖成 `next build`，编辑器就不会被构建出来，必须改回来。
   - **Environment Variables** 添加 `NEXT_PUBLIC_TINA_CLIENT_ID` 与 `TINA_TOKEN`
     （`TINA_TOKEN` 仅在构建期使用，不会泄露到 admin 的前端产物里）。
5. 部署后访问 `https://<你的域名>/admin/index.html` 登录编辑器；保存内容会自动提交到
   GitHub 并触发重新部署。

### 缓存提示

页面设置了 `export const revalidate = 60`，避免 Vercel Data Cache 缓存内容 API 导致
「保存后页面不更新」。如需立即刷新，可在 Vercel 上重新部署。

---

## 本地静态构建验证（无需 TinaCloud 账号）

在拿到真实凭据之前，可以用本地内容 API 验证「构建产物是纯静态且组件渲染正确」：

```bash
# 终端 1：只启动 Tina 本地内容 API（端口 4001）
npx tinacms dev --no-server

# 终端 2：用本地客户端构建，然后跑 next build
npx tinacms build --local --skip-cloud-checks
npx next build
```

`--local` 会把生成的 client 指向 `http://localhost:4001/graphql`，因此 `next build`
在预渲染时从本地文件读取内容。产物应为：

```
○ /                        (Static)
○ /about                   (Static)
○ /posts                   (Static)
● /posts/[filename]        (SSG, uses generateStaticParams)
```

> 注意：`tinacms build --local` 自己也会尝试占用 4001 端口，所以要先启动上面的本地服务，
> 或在它报端口占用后直接继续执行 `next build`（client 已生成）。
> **不要在部署时使用 `--local`**，它会让线上站点去请求 localhost。

---

## 技术要点

- **MDX 不是编译出来的**：TinaCMS 把 `.mdx` 解析成 AST，`<TinaMarkdown>` 按节点类型渲染。
  自定义组件在 AST 里是 `{ type: 'mdxJsxFlowElement', name: 'Callout', props: {...} }`，
  渲染时用 `props.name` 到 `components` 映射表里查组件。
- **可视化编辑**：详情页拆成 Server Component（`generateStaticParams` + 取数）和
  Client Component（`useTina`）两部分，编辑器侧边栏的改动会实时反映到预览。
- **静态站 + 交互组件不冲突**：组件初始 UI 会进入静态 HTML，交互 JS 作为客户端 chunk 下发。
  但组件不能依赖服务端接口，只能用本地状态或构建期传入的 props。
- **SEO/订阅**：`/sitemap.xml`、`/robots.txt`、`/rss.xml` 都会列出全部已发布文章
  （`draft: true` 的不会出现）。站点绝对地址优先取 `NEXT_PUBLIC_SITE_URL`，
  在 Vercel 上自动回退到 `VERCEL_PROJECT_PRODUCTION_URL`。

---

### 缓存与内容新鲜度（重要）

Tina 生成的 client 在 `--content=local` 构建模式下会带一个 `cacheDir`，而 Tina client 会
**无限期**从该磁盘缓存返回查询结果。这会让 `export const revalidate = 60` 失效：重新验证会
重新发起请求，但请求由磁盘缓存应答。因此 `src/lib/tina.ts` 是一个包装层，显式关闭了
client 的磁盘缓存（`cache = null` / `cacheEnabled = false`）。该文件不会被 `tinacms build`
覆盖，所以这个设置是稳定的。

即便如此，**内容更新的可靠路径仍然是「保存 → GitHub 提交 → 重新部署」**：
Tina 每次保存都会提交并触发 Vercel 构建，而每次构建都会生成新的 `cacheDir`。

### 草稿语义

`draft: true` 的文章：

- 不出现在首页、`/posts` 列表、`sitemap.xml`、`rss.xml`
- **也不会被预渲染**，访问 `/posts/<slug>` 返回 404
  （`generateStaticParams` 与详情页共用同一套 publish 判定）

`npm run smoke:draft` 用一个临时草稿文件验证这一点（会被 `--skip-cloud-checks` 构建覆盖到）。

### 解析失败可见化

如果某个 embed 的属性名拼错、属性类型与 `tina/config.ts` 声明的字段类型不一致，MDX 解析器会把
**整篇正文**退化成一个 `invalid_markdown` 节点。渲染层为此注册了 `invalid_markdown` 渲染器：
本地/开发模式下显示明确的错误提示与原始源码，生产模式下显示「内容暂时无法渲染」而不是把 MDX
源码直接摊在页面上。未注册的组件名会退化成 `html` 节点，同样有可见的占位提示。

---

### 内容校验（构建前置门禁）

`scripts/validate-content.mjs` 直接读取 `content/**/*.mdx`，用 TinaCMS **同一个 MDX 解析器**
（`@tinacms/mdx` 的 `parseMDX`）重新解析每篇正文，发现 `invalid_markdown` 节点就让构建失败。

这一步不可省略：当解析失败时 TinaCMS 会把**整篇正文**替换成一个 `invalid_markdown` 节点，
构建和部署都会「成功」，但页面只剩原始 MDX 源码。典型触发场景：

- 组件属性名拼错：`<Callout typo="oops" />` → `Unable to find field definition for property "typo"`
- 属性类型与 schema 不符：给声明为 `rich-text` 的字段传字符串
- 组件名写成小写：`<callout />` 会被当作原始 HTML（非 strict 模式下为警告，`--strict` 下失败）

它同时挂在两条构建路径上：

```bash
npm run check:content            # 单独运行（警告模式）
npm run check:content -- --strict # 原始 HTML 也视为失败
# npm run build 与 npm run build:local 都已内置 --strict
```

因为读文件而不是查 API，这个检查是**确定性且离线**的，生产构建里也能跑。

---

## 编辑器与交互自动化冒烟测试

三个 Playwright 脚本在真实浏览器（本机 Chrome）里验证 curl 无法验证的行为：

| 脚本 | 验证内容 |
| --- | --- |
| `npm run smoke:admin` | 编辑器启动、连上本地内容 API、打开文档、自定义组件作为 embed 出现、**「插入组件」菜单里有它们** |
| `npm run smoke:visual` | 站点页面 `?edit=true` 的**可视化编辑**：编辑器挂载、内容正常渲染、`[data-tina-field]` 点击跳转 handle 指向自定义区块 |
| `npm run smoke:interaction` | 已发布页面上的**交互行为**：计数器加减、刷新后从 localStorage 恢复、标签页切换、提示框嵌套富文本 |
| `npm run smoke:draft` | **内容门禁 + 草稿不外泄**：构造坏 MDX 断言校验器失败；构造 `draft: true` 断言不为它生成页面 |

```bash
npm run dev                      # 终端 1：必须用这个（见下方注意事项）
npm install --no-save playwright # 首次运行需要（用本机 Chrome，不下载浏览器）
npm run smoke                    # 终端 2：依次跑三个脚本
npm run smoke:draft              # 内容门禁 + 草稿
```

> ⚠️ 启动本地 API 请用 `npm run dev`，不要用下面两个已废弃/误解的用法：
> - `tinacms dev --no-server` —— **不会**启动 API，只重新生成 client
> - `tinacms dev --noWatch` —— 关闭监听，导致运行期间新增的 `content/` 文件永远不会被索引
>
> 这两个坑都是我实测踩到的：`smoke:draft` 会往 `content/` 写临时文件，如果 API 不监听，
> 该断言就会失败并提示这一点。


本机实测结果（全部通过，无 console 错误）：

- `smoke:admin` **16/16** —— 含 `Embed menu offers Callout / Counter / Tabs`
- `smoke:visual` **5/5** —— handle 形如 `tgp3d0---post.body.children.3.props`
- `smoke:interaction` **10/10** —— 计数器 `0 → 2 → 1`，刷新后仍为 `1`

> 注意：`[data-tina-field]` 只会注入到**站点页面**（`/posts/<slug>?edit=true`），
> 不会出现在 `/admin/index.html` 的表单里，所以可视化编辑单独用 `smoke:visual` 验证。

### 组件交互的持久化说明

静态站点没有后端，交互组件的状态只能存在浏览器里。`Counter` 通过
`usePersistentState`（`src/lib/use-persistent-state.ts`）写入 localStorage，并且在
effect 里读取而非渲染期读取，保证服务端 HTML 与首次客户端渲染一致（避免 hydration 不匹配）。

