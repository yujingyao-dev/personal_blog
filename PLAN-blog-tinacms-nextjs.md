# 实现计划：TinaCMS + Next.js 静态个人博客（MDX + 可视化编辑器自定义交互组件）

> 本计划中的**关键技术结论都经过真机验证**：我已经在本机搭了一个临时探针项目
> （Next 16.3.5 / tinacms 3.13.0 / @tinacms/cli 2.7.0 / React 19.2 / Tailwind 4，
> 已删除），跑通了 `tinacms build` → `next build` → 静态页面渲染自定义组件的完整链路。
> 下面标注「已验证」的结论均来自该探针的实际运行输出，不是文档推测。

---

## 1. 需求与硬约束

| 项 | 要求 |
| --- | --- |
| 框架 | Next.js（App Router）+ React + TypeScript |
| 样式 | Tailwind CSS |
| CMS | TinaCMS（TinaCloud 作为托管后端，Vercel 部署） |
| 内容渲染 | **必须**用 Tina 官方 `<TinaMarkdown>` |
| 禁止 | `next-mdx-remote`、`@next/mdx`（即：不引入任何 MDX 编译管线） |
| 内容格式 | MDX（`format: 'mdx'`），可在可视化编辑器插入自定义交互组件 |
| 交付形态 | 本地可编辑 + 可构建，最终部署到 Vercel |

**核心原理（这是整个方案的支点）**：TinaCMS 不走 MDX 编译。它把 `.mdx` 文件解析成
AST（抽象语法树），由 `<TinaMarkdown>` 在运行时按节点类型渲染。因此「MDX 支持」=
「在集合里声明 `format: 'mdx'` + 在 rich-text 字段里声明 `templates` + 在
`<TinaMarkdown components={...}>` 里提供同名 React 组件」三者同名对应。
这也正是官方明确说明的：*"TinaCMS doesn't require a compilation step like other MDX
tooling, so it needs to know about all the possible elements you support ahead of time."*
（[Rendering Markdown Content](https://tina.io/docs/reference/types/rendering-markdown#mdx-and-custom-elements)）

---

## 2. 已验证的事实（探针实测，含踩坑结论）

### 2.1 自定义组件在 AST 里长什么样（实测输出）

编辑器插入组件后，`.mdx` 文件里存的是 JSX 标签，例如：

```mdx
<Callout type="warning" body="This is a callout from the visual editor" />

<Counter label="Clicks" />
```

TinaCMS 本地 GraphQL 返回的 AST（**实测原样**）：

```json
{
  "type": "mdxJsxFlowElement",
  "name": "Callout",
  "children": [{ "type": "text", "text": "" }],
  "props": { "type": "warning", "body": "This is a callout from the visual editor" }
}
```

要点：
- 节点类型是 `mdxJsxFlowElement`，组件名在 `name`，字段值在 `props`。
- `<TinaMarkdown>` 会用 `props` 里的 `name`（**大小写敏感**）去 `components` 映射里找组件。
- **`name` 必须与 `tina/config.ts` 里 template 的 `name` 完全一致**。

### 2.2 三个致命坑（不提前知道会浪费大量时间）

1. **组件名必须大写开头**。实测：`<Callout />` → `mdxJsxFlowElement`（正确解析）；
   写成 `<callout />` → 被当作原始 HTML 节点 `{ "type": "html", "value": "<callout ... />" }`，
   页面上会原样显示成一行文本。→ **template `name` 一律用 PascalCase**。
2. **属性类型必须与 template 字段类型严格匹配**。实测：给模板里声明为
   `type: 'rich-text'` 的字段传字符串属性 `body="..."`，解析直接失败，整个 body 退化成
   一个 `invalid_markdown` 节点（报错 `Unable to parse field value for field "body"`），
   **且在编辑器里不一定显眼**。→ 字符串属性对应 `type: 'string'`；需要嵌套富文本
   必须用 `children`（子节点）而不是属性。另外 `children` 和 `mark` 是保留名，不可用作字段名。
3. **构建顺序有强依赖**。实测 `tina/__generated__/client.ts` 生成内容是：

   ```ts
   export const client = createClient({ url: 'http://localhost:4101/graphql', token: 'dummy', queries });
   ```

   即 **client 的 URL 是生成时烘焙进去的**。`tinacms dev` 生成 localhost 版本，
   `tinacms build`（带 TinaCloud 凭据）生成生产版本。所以 build 脚本必须是
   `tinacms build && next build`，顺序不能反，否则线上会去请求 localhost。

### 2.3 版本与兼容性（实测）

| 包 | 本机实测版本 | 说明 |
| --- | --- | --- |
| next | 16.3.5（当前 `latest`） | 实测通过 |
| react / react-dom | 19.2.0 | 实测通过 |
| tinacms | 3.13.0 | 实测通过 |
| @tinacms/cli | 2.7.0 | 实测通过 |
| tailwindcss | 4.3.3 | 用 `@tailwindcss/postcss`，无需 `tailwind.config.js` |
| Node | 本机 v24.14.1，Next 16 要求 ≥ 20.9 | 通过 |

实测 `next build` 输出（Turbopack）：

```
┌ ○ /                    (Static)  prerendered as static content
├ ○ /_not-found           (Static)
└ ● /posts/hello-world    (SSG)     prerendered as static HTML (uses generateStaticParams)
```

实测产物 HTML 中自定义组件已正确渲染：`Callout` → `<aside>`，
`Counter`（`'use client'` + `useState`）→ `<button>`，计数 `0` 已出现在静态 HTML 里，
交互 JS 作为客户端 chunk 正常下发。**结论：静态站点 + 交互组件 + 可视化编辑三者不冲突。**

### 2.4 渲染方式的关键设计决定

组件映射表**必须**放在客户端组件里。实测把 `TinaMarkdown` 放进 `'use client'` 文件后，
在 Server Component 页面里直接用即可（Next 会自动做客户端边界处理），
自定义交互组件按正常方式加 `'use client'` 就能工作。

---

## 3. 目标架构与目录结构

```
blog/
├─ tina/
│  ├─ config.ts                 # 唯一的内容模型定义（schema）
│  ├─ tina-lock.json            # 自动生成，必须提交到 git（TinaCloud 靠它索引 schema）
│  └─ __generated__/            # 自动生成，写进 .gitignore（client.ts / types.ts / *.gql）
├─ content/
│  ├─ posts/*.mdx               # 博客正文（format: mdx）
│  ├─ pages/*.mdx               # 关于页等单页（可选）
│  └─ authors/*.json            # 作者（可选，做 reference 关联）
├─ public/
│  ├─ uploads/                  # 媒体库（mediaRoot: 'uploads'）
│  └─ admin/                    # tinacms build 产物（自带 .gitignore 忽略 index.html/assets）
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx, globals.css
│  │  ├─ posts/[filename]/page.tsx        # Server Component：generateStaticParams + 取数
│  │  ├─ posts/[filename]/post-client.tsx # Client Component：useTina 可视化编辑
│  │  └─ admin/ ...                        # 不需要页面，admin 是 public 下的静态 SPA
│  ├─ components/
│  │  ├─ tina-markdown.tsx       # 'use client'，TinaMarkdown + components 映射表（核心）
│  │  ├─ mdx/                    # 自定义交互组件（Callout / Counter / Tabs ...）
│  │  └─ ui/                     # 布局、卡片、SEO 等
│  └─ lib/
│     ├─ tina-client.ts          # 统一 re-export 生成的 client（避免相对路径地狱）
│     └─ format.ts               # 日期等
├─ .env                          # 本地：NEXT_PUBLIC_TINA_CLIENT_ID / TINA_TOKEN（git 忽略）
├─ .env.example                  # 提交，给部署参考
├─ next.config.ts
├─ postcss.config.mjs
├─ tsconfig.json                 # paths: @/* → src/*, @/tina/* → tina/*
└─ package.json
```

**路径别名很重要**：实测中 `src/app/posts/[filename]/page.tsx` 到
`tina/__generated__/client` 是 4 层 `../`，极易写错（我就写错过一次并导致构建失败）。
统一用 `@/tina/__generated__/client`（通过 tsconfig `paths` 把 `@/tina/*` 映射到 `tina/*`）。

---

## 4. 分阶段实施步骤

### Phase 0 — 版本与骨架（0.5h）
1. 初始化 git 仓库与 `package.json`（手工精确锁版本，比脚手架可控；
   **注意**：本机 `create-next-app` 在沙箱下会 `spawn EPERM`，见 §8）。
2. 精确固定：`next@16.3.5`、`react@19.2.0`、`react-dom@19.2.0`、`tinacms@3.13.0`、
   `@tinacms/cli@2.7.0`、`tailwindcss@4`、`@tailwindcss/postcss@4`、
   `@tailwindcss/typography@0.5.20`、`typescript@5`。
3. 写 `tsconfig.json`（含 `paths`）、`next.config.ts`（`images.remotePatterns` 放行
   `assets.tina.io`）、`postcss.config.mjs`、`src/app/globals.css`
   （`@import 'tailwindcss'; @plugin '@tailwindcss/typography';`）。
4. 写 `package.json` scripts：
   ```json
   "dev": "tinacms dev -c \"next dev\"",
   "build": "tinacms build && next build",
   "start": "next start"
   ```
5. **验证**：`npm run build` 通过（此时还没有内容，页面为空壳）。

### Phase 1 — 内容模型 `tina/config.ts`（1h）
1. `defineConfig`：`branch`（取 `NEXT_PUBLIC_TINA_BRANCH || VERCEL_GIT_COMMIT_REF || HEAD || 'main'`）、
   `clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID`、`token: process.env.TINA_TOKEN`、
   `build: { outputFolder: 'admin', publicFolder: 'public' }`、
   `media: { tina: { mediaRoot: 'uploads', publicFolder: 'public' } }`。
2. `posts` 集合：`path: 'content/posts'`、**`format: 'mdx'`（关键）**，
   字段：`title`(string, isTitle, required)、`date`(datetime)、`description`(string)、
   `draft`(boolean)、`tags`(string list)、`cover`(image)、`author`(reference)、
   `body`(`type: 'rich-text'`, `isBody: true`, `templates: [...]`)。
3. `pages` 集合（about 等）：同样 `format: 'mdx'` + `rich-text` templates。
4. **验证**：`npx tinacms build` 生成 `tina/__generated__/client.ts`、`types.ts`、
   `tina/tina-lock.json`，无 schema 报错。

### Phase 2 — `TinaMarkdown` 渲染层（1.5h）
1. `src/components/tina-markdown.tsx`（`'use client'`）：
   - 导出 `components` 映射表：基础元素美化（`h2/h3/p/a/ul/ol/blockquote/code_block/
     img/table`）+ 自定义模板组件；`code_block` 接语法高亮。
   - `export function TinaMarkdownRenderer({ content }) { return <TinaMarkdown
     content={content} components={components} /> }`。
   - 类型：`components` 用 `Components<PostQuery['post']['body']>` 约束，减少 `as never` 强转。
   - 嵌套富文本：子模板组件内部再调 `<TinaMarkdown content={props.children} />`。
2. **验证**：手工写一篇含 `<Callout />` 的 `.mdx`，`next build` 后检查产物 HTML 里
   出现该组件的 DOM（探针已用此法验证过）。

### Phase 3 — 自定义交互组件（2h）
先做 3 个覆盖典型形态的组件，作为后续模板的范式：
1. `Callout`（静态展示型；含嵌套富文本 `children`）—— 对应 template `Callout`，字段
   `type`(string, options) + `children`(rich-text via 子节点)。
2. `Counter` / `LikeButton`（`'use client'` + `useState`；**纯前端状态**，静态站天然可用）。
3. `Tabs` 或 `Accordion`（`'use client'` + 组件内多字段列表：template 里用 `type: 'object'`
   的 `list: true` 字段表达 tab 数组）。
> 设计红线：静态站点不能依赖服务端接口。任何交互组件若需要数据，必须
> (a) 用构建期传入的 props，(b) 纯客户端状态，或 (c) 由文章 frontmatter 注入。
4. **验证**：编辑器预览里逐个插入、保存、刷新页面确认渲染与交互。

### Phase 4 — 页面与可视化编辑（2h）
1. 列表页 `src/app/page.tsx` / `src/app/posts/page.tsx`：`client.queries.postConnection()`
   取列表，分页/标签过滤。
2. 详情页两段式（官方推荐模式）：
   - `page.tsx`（Server）：`generateStaticParams()` 用 `postConnection` 生成
     `filename`，并按 `params` 查询单篇，把 `{ query, variables, data }` 透传。
   - `post-client.tsx`（Client）：`useTina({ query, variables, data })` 包裹渲染，
     使编辑器侧边栏改动实时反映到预览。
   - `export const revalidate = 60`（或按需），缓解 Vercel Data Cache 导致的内容不更新。
3. `app/admin` 不需要写代码：admin 由 `tinacms build` 输出到 `public/admin`，
   访问 `/admin/index.html`。
4. SEO：`generateMetadata` + sitemap + RSS（可选）。
5. **验证**：`npm run dev` 打开 `http://localhost:3000/admin/index.html`，
   新建/编辑文章、插入自定义组件、保存 → 本地 `.mdx` 文件被改写。

### Phase 5 — 本地联调验收（1h）
- 编辑器改动是否实时反映；保存后 `git diff` 内容是否为干净可读的 MDX；
- 关掉 dev server 后 `next build` 仍能通过（说明 client 未被本地产物污染）；
- `draft: true` 的文章不出现在列表；
- 交互组件在纯静态产物（`next build` + `next start`）中仍可交互。

### Phase 6 — GitHub + TinaCloud（1h，需你操作）
1. 推仓库到 GitHub（**必须包含 `tina/tina-lock.json`**）。
2. [app.tina.io](https://app.tina.io) 建项目并绑定该仓库，拿到 `Client ID` 与
   `Read Only Token`。
3. 本地写 `.env`：
   ```
   NEXT_PUBLIC_TINA_CLIENT_ID=xxxx
   TINA_TOKEN=xxxx
   NEXT_PUBLIC_TINA_BRANCH=main
   ```
   ⚠️ **实测文档明确**：Tina 构建只读 `.env`，**不读 `.env.local` / `.env.development`**。
4. `npx @tinacms/cli@latest init backend` 也能自动写 `.env`（二选一）。

### Phase 7 — Vercel 部署（1h）
1. Vercel 导入 GitHub 仓库；Build Command 用 `npm run build`
   （即 `tinacms build && next build`），若 Vercel 覆盖成 `next build` 必须改回来。
2. Environment Variables 加 `NEXT_PUBLIC_TINA_CLIENT_ID` 与 `TINA_TOKEN`
   （`TINA_TOKEN` 只在构建期用，不会进 admin）；`NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF`
   由 Vercel 系统变量自动提供，用于 branch 解析与 preview 环境。
3. 部署后验收：`https://<site>/admin/index.html` 能进编辑器、能保存（会提交到 GitHub）、
   保存后触发自动重新部署。
4. 可选：按官方指南配置 Ignore Build Step / GitHub Actions 做 5 分钟防抖部署，
   避免编辑器每次保存都触发一次构建。

---

## 5. 内容模型草案（示意）

```ts
// tina/config.ts 片段
{
  name: 'Callout',
  label: 'Callout 提示框',
  fields: [
    { name: 'type', label: '类型', type: 'string', options: ['info', 'warning', 'success'] },
    { name: 'title', label: '标题', type: 'string' },
    { name: 'body', label: '正文', type: 'rich-text' }, // 注意：见下方说明
  ],
}
```

> ⚠️ 用途决定写法：**属性**必须在模板里声明为 `string`；**嵌套富文本**要用子节点
> （`<Callout>正文</Callout>` 形式的 `children`），不要在模板里声明 `rich-text`
> 却用属性传值 —— 实测这会静默退化成 `invalid_markdown`（见 §2.2 坑 2）。

---

## 6. 验收标准（Definition of Done）

- [ ] `npm run build` 在干净 clone 上一次通过（含 `tinacms build` + `next build`）。
- [ ] 产物为静态页面（`○ Static` / `● SSG`），无运行时 Tina 后端依赖。
- [ ] `/admin/index.html` 可视化编辑器可新建/编辑/保存 MDX 文章。
- [ ] 编辑器里能通过「插入组件」菜单添加至少 3 个自定义组件，页面即时预览。
- [ ] 自定义交互组件在静态产物中交互正常（点击、切换）。
- [ ] 组件名与 template `name` 一一对应（大小写一致），无 `invalid_markdown` 节点。
- [ ] 仓库内无 `next-mdx-remote`、`@next/mdx` 依赖。
- [ ] Vercel 生产环境部署成功，编辑器保存能触发内容更新。

---

## 7. 风险与回退

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Next 16 是较新大版本，Tina 官方 CI 仍以 Next 15.5.x 为测试基线 | 编辑器/预览可能异常 | 探针已验证构建与静态渲染通过；若可视化编辑出现异常，回退 `next@15.5.x`（仅版本号变更，代码不变） |
| 属性类型与模板字段类型不匹配 | 静默退化为 `invalid_markdown` | 建立约定：属性只用 string/number/boolean/datetime/image；富文本走 children；提交前跑一次 AST 检查 |
| Vercel Data Cache 缓存内容 API | 保存后页面不更新 | `export const revalidate = 60` 或查询级 `fetchOptions: { next: { revalidate: 60 } }`；必要时 Vercel 侧忽略构建 |
| 每次保存触发一次 Vercel 构建 | 构建额度消耗 | 配置 Ignore Build Step 或官方 GitHub Actions 防抖方案 |
| `.env.local` 不被 Tina 读取 | 本地/CI 凭据丢失 | 统一用 `.env`（本地 git 忽略）+ Vercel 环境变量 |

---

## 8. 本机环境注意事项（实测）

- **npm 全局缓存目录不可写**：`C:\Users\LEGION\AppData\Local\npm-cache` 会报
  `EPERM`。解决办法：把缓存指到工作区，例如
  `$env:npm_config_cache="D:\deepseek harness\workspace\.npm-cache"`。
- **沙箱屏蔽子进程**：当前工作区策略下，`npm install`（生命周期脚本）、
  `tinacms build`（esbuild/vite）、`next build`（TS checker / worker）、
  `create-next-app` 都会因 `spawn EPERM` 失败；我已在本会话中验证过
  「提升到 danger-full-access 即可全部通过」。后续执行这些命令时我会按需申请一次。
- 本机**没有 pnpm**（官方推荐 pnpm，但 npm 实测可用）。如需换 pnpm 我再调整。

---

## 9. 需要你确认的 4 件事

1. **TinaCloud 账号**：是否已有 [app.tina.io](https://app.tina.io) 账号？
   （部署到 Vercel 的标准路径需要它；若想完全自托管 Tina 后端，方案要改，工作量明显更大。）
2. **仓库**：GitHub 仓库是新建还是已有？给出 `owner/repo`（Phase 6 需要）。
3. **组件清单**：除 `Callout` / `Counter` / `Tabs` 外，你还想插哪些交互组件？
   （例如：代码演示器、图表、图片对比滑块、订阅表单、Mermaid 图。）
4. **Next 版本**：默认用已验证的 **Next 16.3.5**；如果你更保守，我改用官方测试基线的
   **Next 15.5.x**。

---

## 10. 实施结果（Phase 0–5 已完成，实测补充）

已在本仓库完成 Phase 0–5，`npm run typecheck` 与静态构建全绿。实测结论与计划的两处偏差已修正：

1. **`generateStaticParams` 必须返回字符串**。官方文档示例用
   `edge.node._sys.breadcrumbs`（`string[]`），但 Next 16 要求动态段参数是 `string`，
   否则报 `A required parameter (filename) was not provided as a string received object`。
   已改为单段 `_sys.filename`（URL 形如 `/posts/hello-tinacms`）。
2. **`tinacms build --content=local` 不会预热 client 缓存**（实测 `.cache` 目录为空，
   构建仍去打 TinaCloud 并 401）。可用的无凭据验证路径是：
   `tinacms dev --no-server`（本地内容 API）→ `tinacms build --local --skip-cloud-checks`
   → `next build`。生成的 client 会带 `url: 'http://localhost:4001/graphql'`。
   **部署时切勿用 `--local`。**

实测通过的产物：

```
Route (app)                 Revalidate  Expire
┌ ○ /                               1m      1y
├ ○ /_not-found
├ ○ /about                          1m      1y
├ ○ /posts                          1m      1y
└   /posts/[filename]
  └ ● /posts/hello-tinacms
```

并已确认静态 HTML 里同时包含：两个 Callout（含嵌套富文本与 `code` 标记）、
Counter（数字属性 `initialValue={0} step={1}` 正确解析）、Tabs（`object list` 属性数组）、
自定义 `code_block`（含复制按钮）、表格与引用块。

